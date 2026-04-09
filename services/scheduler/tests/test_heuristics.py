from datetime import datetime, timedelta, timezone

from app.core.heuristics import run_heuristics
from app.core.models import BufferRule, EventModel, SchedulingInput


def _payload(events: list[EventModel]) -> SchedulingInput:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    return SchedulingInput(
        user_id="u1",
        now=now,
        window_start=now,
        window_end=now + timedelta(days=2),
        events=events,
        busy_blocks=[],
        work_hours=[{"day_of_week": 4, "start_time": "09:00", "end_time": "18:00"}],
    )


def test_due_task_moves_earlier_when_possible() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    task = EventModel(
        id="task-1",
        type="TASK",
        title="Urgent",
        start_at=now + timedelta(hours=20),
        end_at=now + timedelta(hours=21),
        due_at=now + timedelta(hours=22),
        timezone="UTC",
        priority="P1",
    )
    meeting = EventModel(
        id="meeting-1",
        type="MEETING",
        title="Meeting",
        start_at=now + timedelta(hours=20),
        end_at=now + timedelta(hours=21),
        timezone="UTC",
        lock_state="HARD_LOCKED",
        flexibility="FIXED",
        priority="P2",
    )

    output = run_heuristics(_payload([task, meeting]))
    moved = next(item for item in output.moves if item.event_id == "task-1")
    assert moved.new_start_at < task.start_at


def test_meeting_insertion_pushes_low_priority_habit() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    habit = EventModel(
        id="habit-1",
        type="HABIT",
        title="Read",
        start_at=now + timedelta(hours=2),
        end_at=now + timedelta(hours=3),
        timezone="UTC",
        priority="P4",
    )
    meeting = EventModel(
        id="meeting-2",
        type="MEETING",
        title="Team Sync",
        start_at=now + timedelta(hours=2),
        end_at=now + timedelta(hours=3),
        timezone="UTC",
        lock_state="HARD_LOCKED",
        flexibility="FIXED",
        priority="P2",
    )

    output = run_heuristics(_payload([habit, meeting]))
    moved = next(item for item in output.moves if item.event_id == "habit-1")
    assert moved.new_start_at >= meeting.end_at


def test_hard_lock_event_is_not_moved() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    hard = EventModel(
        id="hard-1",
        type="TASK",
        title="Do not move",
        start_at=now + timedelta(hours=1),
        end_at=now + timedelta(hours=2),
        timezone="UTC",
        lock_state="HARD_LOCKED",
        flexibility="FIXED",
    )
    output = run_heuristics(_payload([hard]))
    assert all(move.event_id != "hard-1" for move in output.moves)


def test_free_to_busy_transitions() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    near = EventModel(
        id="near-1",
        type="TASK",
        title="Soon",
        start_at=now + timedelta(hours=10),
        end_at=now + timedelta(hours=11),
        timezone="UTC",
        priority="P2",
        lock_state="FREE",
    )

    output = run_heuristics(_payload([near]))
    moved = next(item for item in output.moves if item.event_id == "near-1")
    assert moved.lock_state_after in ("BUSY", "SOFT_LOCKED", "HARD_LOCKED")


def test_buffer_is_inserted_around_meetings() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    task = EventModel(
        id="task-buffer",
        type="TASK",
        title="After meeting task",
        start_at=now + timedelta(hours=1),
        end_at=now + timedelta(hours=1, minutes=30),
        timezone="UTC",
        priority="P2",
    )
    meeting = EventModel(
        id="meeting-buffer",
        type="MEETING",
        title="Buffer anchor",
        start_at=now + timedelta(hours=1),
        end_at=now + timedelta(hours=2),
        timezone="UTC",
        lock_state="HARD_LOCKED",
        flexibility="FIXED",
        priority="P2",
    )

    payload = _payload([task, meeting])
    payload.buffer_rules = [BufferRule(applies_to_types=["MEETING"], before_minutes=10, after_minutes=10)]
    output = run_heuristics(payload)
    moved = next(item for item in output.moves if item.event_id == "task-buffer")
    assert moved.new_start_at >= meeting.end_at + timedelta(minutes=10)
