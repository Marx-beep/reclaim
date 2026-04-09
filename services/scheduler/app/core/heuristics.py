from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from app.core.models import EventModel, SchedulingInput, SchedulingMove, SchedulingOutput


PRIORITY_WEIGHT = {
    "P1": 100,
    "P2": 60,
    "P3": 30,
    "P4": 10,
}


@dataclass
class Interval:
    start: datetime
    end: datetime


def overlaps(a: Interval, b: Interval) -> bool:
    return a.start < b.end and a.end > b.start


def _event_score(event: EventModel, now: datetime) -> float:
    score = PRIORITY_WEIGHT.get(event.priority, 10)
    if event.due_at:
        slack_hours = max(0.0, (event.due_at - now).total_seconds() / 3600)
        score += max(0.0, 48 - slack_hours)
    if event.lock_state == "HARD_LOCKED":
        score += 80
    elif event.lock_state == "SOFT_LOCKED":
        score += 40
    return score


def _upgrade_lock(event: EventModel, now: datetime, soft_lead: int, hard_lead: int) -> str:
    delta_hours = (event.start_at - now).total_seconds() / 3600
    if delta_hours <= hard_lead:
        return "HARD_LOCKED"
    if delta_hours <= soft_lead and event.lock_state in ("FREE", "BUSY"):
        return "SOFT_LOCKED"
    # Free -> Busy: if window is shrinking, mark busy before soft lock threshold.
    if delta_hours <= soft_lead * 1.5 and event.lock_state == "FREE":
        return "BUSY"
    return event.lock_state


def _is_within_window(start: datetime, end: datetime, window: Interval) -> bool:
    return start >= window.start and end <= window.end


def _conflicts(candidate: Interval, occupied: Iterable[Interval]) -> bool:
    return any(overlaps(candidate, item) for item in occupied)


def _apply_buffers(events: list[EventModel], before_minutes: int = 5, after_minutes: int = 5) -> list[Interval]:
    buffered: list[Interval] = []
    for event in events:
        if event.type == "MEETING":
            buffered.append(
                Interval(
                    start=event.start_at - timedelta(minutes=before_minutes),
                    end=event.end_at + timedelta(minutes=after_minutes),
                )
            )
    return buffered


def run_heuristics(payload: SchedulingInput) -> SchedulingOutput:
    window = Interval(payload.window_start, payload.window_end)

    occupied: list[Interval] = [Interval(block.start_at, block.end_at) for block in payload.busy_blocks]
    hard_or_fixed: list[EventModel] = [
        event
        for event in payload.events
        if event.lock_state == "HARD_LOCKED" or event.flexibility == "FIXED" or event.type in ("MEETING", "PTO", "BUFFER")
    ]

    occupied.extend(Interval(event.start_at, event.end_at) for event in hard_or_fixed)
    if payload.buffer_rules:
        default_rule = payload.buffer_rules[0]
        occupied.extend(
            _apply_buffers(
                hard_or_fixed,
                before_minutes=default_rule.before_minutes,
                after_minutes=default_rule.after_minutes,
            )
        )
    else:
        occupied.extend(_apply_buffers(hard_or_fixed))

    hard_or_fixed_ids = {event.id for event in hard_or_fixed}
    movable = [event for event in payload.events if event.id not in hard_or_fixed_ids]
    movable.sort(key=lambda item: _event_score(item, payload.now), reverse=True)

    moves: list[SchedulingMove] = []
    unscheduled: list[str] = []
    explanations: dict[str, str] = {}

    for event in movable:
        duration = event.end_at - event.start_at
        latest_allowed = payload.window_end
        if event.due_at and event.due_at < latest_allowed:
            latest_allowed = event.due_at

        # Start from max(current, window_start), then scan by 15 minutes.
        pointer = payload.window_start if event.due_at else max(event.start_at, payload.window_start)
        if pointer > latest_allowed:
            unscheduled.append(event.id)
            explanations[event.id] = "No capacity before due date"
            continue

        found_slot: Interval | None = None
        while pointer + duration <= latest_allowed:
            candidate = Interval(pointer, pointer + duration)
            if _is_within_window(candidate.start, candidate.end, window) and not _conflicts(candidate, occupied):
                found_slot = candidate
                break
            pointer += timedelta(minutes=15)

        if not found_slot:
            unscheduled.append(event.id)
            explanations[event.id] = "No non-conflicting slot in impacted window"
            continue

        occupied.append(found_slot)

        upgraded_lock = _upgrade_lock(
            event=event,
            now=payload.now,
            soft_lead=payload.time_policy.soft_lock_lead_hours,
            hard_lead=payload.time_policy.hard_lock_lead_hours,
        )

        move = SchedulingMove(
            event_id=event.id,
            previous_start_at=event.start_at,
            previous_end_at=event.end_at,
            new_start_at=found_slot.start,
            new_end_at=found_slot.end,
            lock_state_after=upgraded_lock,
            reason={
                "priority": event.priority,
                "dueAt": event.due_at.isoformat() if event.due_at else None,
                "conflictAvoided": found_slot.start != event.start_at,
                "solver": "heuristics-v1",
            },
            reason_text=f"Placed using priority {event.priority} with deadline awareness and conflict avoidance",
            score_delta=1.0,
        )
        moves.append(move)
        explanations[event.id] = move.reason_text

    total_score = float(sum(_event_score(event, payload.now) for event in payload.events if event.id not in unscheduled))

    return SchedulingOutput(
        feasible=len(unscheduled) == 0,
        solver="heuristics-v1",
        score=total_score,
        moves=moves,
        unscheduled_event_ids=unscheduled,
        explanations=explanations,
    )
