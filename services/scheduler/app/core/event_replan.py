from __future__ import annotations

import copy
import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from typing import Any, Literal

from pydantic import BaseModel, Field


EventType = Literal[
    "task_delayed",
    "task_finished_early",
    "task_moved",
    "task_resized",
    "task_added",
    "task_deleted",
    "burnout",
]

Priority = Literal["S", "A", "B", "C"]
TaskStatus = Literal["not_started", "in_progress", "completed", "expired"]
TaskKind = Literal["work", "buffer", "rest"]

PRIORITY_RANK = {"S": 0, "A": 1, "B": 2, "C": 3}
WORK_SEGMENTS = [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))]
MIN_TASK_MINUTES = 10
DEFAULT_BUFFER_MINUTES = 10
MAX_DAILY_BUFFER_MINUTES = 60
MAX_SEGMENT_MINUTES = 120
UNDO_TTL_MINUTES = 10
UNDO_STORE: dict[str, dict[str, Any]] = {}


class RuleTaskModel(BaseModel):
    id: str
    title: str
    start: datetime
    end: datetime
    priority: Priority = "B"
    status: TaskStatus = "not_started"
    deadline: datetime | None = None
    kind: TaskKind = "work"
    is_low_load: bool = False
    project: str | None = None
    created_at: datetime | None = Field(default=None, alias="createdAt")


class RuleEventModel(BaseModel):
    type: EventType
    taskId: str | None = None
    delayMinutes: int | None = None
    earlyMinutes: int | None = None
    newStart: datetime | None = None
    newEnd: datetime | None = None
    durationMinutes: int | None = None
    newTask: RuleTaskModel | None = None
    at: datetime | None = None


class RuleReplanInput(BaseModel):
    schedule: list[RuleTaskModel]
    event: RuleEventModel


class RuleReplanOutput(BaseModel):
    ok: bool
    newSchedule: list[RuleTaskModel]
    messages: list[str]
    explanation: str
    versionId: str
    undoToken: str
    undoExpiresAt: datetime


@dataclass
class Task:
    id: str
    title: str
    start: datetime
    end: datetime
    priority: Priority = "B"
    status: TaskStatus = "not_started"
    deadline: datetime | None = None
    kind: TaskKind = "work"
    is_low_load: bool = False
    project: str | None = None
    created_at: datetime | None = None
    original: dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> int:
        return max(0, int((self.end - self.start).total_seconds() // 60))

    @property
    def locked(self) -> bool:
        return self.priority == "S" or self.status in {"completed", "expired"} or self.kind in {"buffer", "rest"}

    @classmethod
    def from_model(cls, data: RuleTaskModel) -> "Task":
        return cls(
            id=data.id,
            title=data.title,
            start=data.start,
            end=data.end,
            priority=data.priority,
            status=data.status,
            deadline=data.deadline,
            kind=data.kind,
            is_low_load=data.is_low_load,
            project=data.project,
            created_at=data.created_at,
            original=copy.deepcopy(data.model_dump(by_alias=True)),
        )

    def clone(self, **changes: Any) -> "Task":
        payload = self.__dict__.copy()
        payload.update(changes)
        return Task(**payload)

    def to_model(self) -> RuleTaskModel:
        return RuleTaskModel(
            id=self.id,
            title=self.title,
            start=self.start,
            end=self.end,
            priority=self.priority,
            status=self.status,
            deadline=self.deadline,
            kind=self.kind,
            is_low_load=self.is_low_load,
            project=self.project,
            createdAt=self.created_at,
        )


def _is_workday(moment: datetime) -> bool:
    return moment.weekday() < 5


def _at_time(day: datetime, t: time) -> datetime:
    return datetime.combine(day.date(), t, tzinfo=day.tzinfo)


def _minutes_between(start: datetime, end: datetime) -> int:
    return max(0, int((end - start).total_seconds() // 60))


def _interval_inside_work(start: datetime, end: datetime) -> bool:
    if end <= start or start.date() != end.date() or not _is_workday(start):
        return False
    return any(_at_time(start, seg_start) <= start and end <= _at_time(start, seg_end) for seg_start, seg_end in WORK_SEGMENTS)


def _next_workday_start(moment: datetime) -> datetime:
    cursor = moment + timedelta(days=1)
    while not _is_workday(cursor):
        cursor += timedelta(days=1)
    return cursor.replace(hour=9, minute=0, second=0, microsecond=0)


def _snap_to_work_start(moment: datetime) -> datetime:
    cursor = moment.replace(second=0, microsecond=0)
    while True:
        if not _is_workday(cursor):
            cursor = _next_workday_start(cursor)
            continue
        for seg_start, seg_end in WORK_SEGMENTS:
            start = _at_time(cursor, seg_start)
            end = _at_time(cursor, seg_end)
            if start <= cursor < end:
                return cursor
            if cursor < start:
                return start
        cursor = _next_workday_start(cursor)


def _work_segments_from(start: datetime, days: int = 14) -> list[tuple[datetime, datetime]]:
    cursor = _snap_to_work_start(start)
    first_day = cursor.replace(hour=0, minute=0, second=0, microsecond=0)
    segments: list[tuple[datetime, datetime]] = []
    for offset in range(days):
        day = first_day + timedelta(days=offset)
        if not _is_workday(day):
            continue
        for seg_start, seg_end in WORK_SEGMENTS:
            seg_a = _at_time(day, seg_start)
            seg_b = _at_time(day, seg_end)
            if seg_b <= cursor:
                continue
            segments.append((max(seg_a, cursor), seg_b))
    return segments


def _overlap(a: tuple[datetime, datetime], b: tuple[datetime, datetime]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def _subtract_busy(slots: list[tuple[datetime, datetime]], busy: list[tuple[datetime, datetime]]) -> list[tuple[datetime, datetime]]:
    available = list(slots)
    for b_start, b_end in sorted(busy):
        next_available: list[tuple[datetime, datetime]] = []
        for a_start, a_end in available:
            if b_end <= a_start or b_start >= a_end:
                next_available.append((a_start, a_end))
                continue
            if a_start < b_start:
                next_available.append((a_start, b_start))
            if b_end < a_end:
                next_available.append((b_end, a_end))
        available = next_available
    return [(a, b) for a, b in available if _minutes_between(a, b) >= MIN_TASK_MINUTES]


def _place_duration(
    duration: int,
    earliest: datetime,
    busy: list[tuple[datetime, datetime]],
    deadline: datetime | None,
    max_piece: int = MAX_SEGMENT_MINUTES,
) -> tuple[list[tuple[datetime, datetime]], bool]:
    remaining = max(MIN_TASK_MINUTES, duration)
    cursor = _snap_to_work_start(earliest)
    pieces: list[tuple[datetime, datetime]] = []
    guard = 0
    while remaining > 0 and guard < 300:
        guard += 1
        available = _subtract_busy(_work_segments_from(cursor, days=21), busy)
        placed = False
        for slot_start, slot_end in available:
            start = max(slot_start, cursor)
            latest_end = min(slot_end, deadline) if deadline else slot_end
            can_use = _minutes_between(start, latest_end)
            if can_use < MIN_TASK_MINUTES:
                continue
            take = min(remaining, can_use, max_piece)
            end = start + timedelta(minutes=take)
            pieces.append((start, end))
            busy.append((start, end))
            reserve_end = end + timedelta(minutes=DEFAULT_BUFFER_MINUTES)
            if _interval_inside_work(end, reserve_end):
                busy.append((end, reserve_end))
            busy.sort()
            remaining -= take
            cursor = reserve_end
            placed = True
            break
        if not placed:
            next_cursor = _next_workday_start(cursor)
            if deadline and next_cursor >= deadline:
                return pieces, False
            cursor = next_cursor
    return pieces, remaining == 0


def _split_task(task: Task, pieces: list[tuple[datetime, datetime]]) -> list[Task]:
    if len(pieces) <= 1:
        return [task.clone(start=pieces[0][0], end=pieces[0][1])] if pieces else []
    result: list[Task] = []
    for index, (start, end) in enumerate(pieces, start=1):
        result.append(task.clone(id=f"{task.id}_part_{index}", title=f"{task.title} (Part {index})", start=start, end=end))
    return result


def _add_buffers(tasks: list[Task], messages: list[str]) -> list[Task]:
    ordered = sorted(tasks, key=lambda item: (item.start, item.end, PRIORITY_RANK[item.priority]))
    result: list[Task] = []
    daily_buffer: dict[str, int] = {}
    for task in ordered:
        if result:
            prev = result[-1]
            same_day = prev.end.date() == task.start.date()
            gap = _minutes_between(prev.end, task.start)
            both_work = prev.kind == "work" and task.kind == "work"
            if same_day and both_work and gap >= DEFAULT_BUFFER_MINUTES:
                day_key = prev.end.date().isoformat()
                used = daily_buffer.get(day_key, 0)
                can_add = min(DEFAULT_BUFFER_MINUTES, gap, MAX_DAILY_BUFFER_MINUTES - used)
                start = prev.end
                end = start + timedelta(minutes=can_add)
                if can_add > 0 and _interval_inside_work(start, end):
                    result.append(
                        Task(
                            id=f"buffer_{day_key}_{len(result)}",
                            title="Buffer",
                            start=start,
                            end=end,
                            priority="C",
                            kind="buffer",
                        )
                    )
                    daily_buffer[day_key] = used + can_add
                elif can_add <= 0:
                    messages.append(f"Daily buffer cap reached on {day_key}")
        result.append(task)
    return sorted(result, key=lambda item: (item.start, item.end, item.id))


def _validate_schedule(before: list[Task], after: list[Task]) -> list[str]:
    messages: list[str] = []
    before_s = {item.id: item for item in before if item.priority == "S"}
    after_s = {item.id: item for item in after if item.priority == "S"}
    for task_id, old_task in before_s.items():
        new_task = after_s.get(task_id)
        if not new_task:
            messages.append(f"Hard constraint task removed: {old_task.title}")
        elif old_task.start != new_task.start or old_task.end != new_task.end:
            messages.append(f"Hard constraint task moved: {old_task.title}")

    ordered = sorted(after, key=lambda item: (item.start, item.end))
    for task in ordered:
        if task.end <= task.start:
            messages.append(f"Task end <= start: {task.title}")
        if task.kind == "work":
            if task.duration < MIN_TASK_MINUTES:
                messages.append(f"Task shorter than minimum duration: {task.title}")
            if not _interval_inside_work(task.start, task.end):
                messages.append(f"Task outside working segments: {task.title}")
        if task.deadline and task.end > task.deadline:
            messages.append(f"Task exceeded deadline: {task.title}")

    for previous, current in zip(ordered, ordered[1:]):
        if _overlap((previous.start, previous.end), (current.start, current.end)):
            messages.append(f"Task overlap: {previous.title} vs {current.title}")
    return messages


class RuleReplanEngine:
    def __init__(self, payload: RuleReplanInput):
        self.before = [Task.from_model(item) for item in payload.schedule]
        self.tasks = [Task.from_model(item) for item in payload.schedule]
        self.event = payload.event
        self.messages: list[str] = []
        self.force_invalid = False

    def _find(self, task_id: str | None) -> Task | None:
        return next((item for item in self.tasks if item.id == task_id), None)

    def _replace(self, old: Task, new_items: list[Task]) -> None:
        self.tasks = [item for item in self.tasks if item.id != old.id] + new_items

    def run(self) -> dict[str, Any]:
        handlers = {
            "task_delayed": self._handle_task_delayed,
            "task_finished_early": self._handle_task_finished_early,
            "task_moved": self._handle_task_moved,
            "task_resized": self._handle_task_resized,
            "task_added": self._handle_task_added,
            "task_deleted": self._handle_task_deleted,
            "burnout": self._handle_burnout,
        }

        handler = handlers.get(self.event.type)
        if not handler:
            self.messages.append(f"Unknown event type: {self.event.type}")
            self.force_invalid = True
        else:
            handler()

        if not self.force_invalid:
            self._repack_mutable_tasks()
            self.tasks = _add_buffers(self.tasks, self.messages)

        validation_messages = _validate_schedule(self.before, self.tasks)
        ok = (not self.force_invalid) and (not validation_messages)
        all_messages = self.messages + validation_messages
        explanation = all_messages[0] if all_messages else "Replanned using rule engine."

        return {
            "ok": ok,
            "newSchedule": [item.to_model().model_dump(by_alias=True) for item in sorted(self.tasks, key=lambda x: (x.start, x.end, x.id))],
            "messages": all_messages,
            "explanation": explanation,
        }

    def _handle_task_delayed(self) -> None:
        task = self._find(self.event.taskId)
        delay = int(self.event.delayMinutes or 0)
        if not task or delay <= 0:
            self.messages.append("Invalid task_delayed payload.")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"Hard constraint task cannot be delayed: {task.title}")
            self.force_invalid = True
            return
        self._replace(task, [task.clone(end=task.end + timedelta(minutes=delay))])
        self.messages.append(f"Delayed {task.title} by {delay} minutes.")

    def _handle_task_finished_early(self) -> None:
        task = self._find(self.event.taskId)
        early = int(self.event.earlyMinutes or 0)
        if not task or early < MIN_TASK_MINUTES:
            self.messages.append("Early finish not large enough; no replanning needed.")
            return
        if task.priority == "S":
            self.messages.append(f"Hard constraint task remains fixed despite early finish: {task.title}")
            return
        new_end = max(task.start + timedelta(minutes=MIN_TASK_MINUTES), task.end - timedelta(minutes=early))
        self._replace(task, [task.clone(end=new_end, status="completed")])
        self.messages.append(f"Marked early finish for {task.title}.")

    def _handle_task_moved(self) -> None:
        task = self._find(self.event.taskId)
        if not task:
            self.messages.append("Invalid task_moved payload.")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"Hard constraint task cannot be moved: {task.title}")
            self.force_invalid = True
            return
        new_start = _snap_to_work_start(self.event.newStart or task.start)
        duration = _minutes_between(new_start, self.event.newEnd) if self.event.newEnd else task.duration
        duration = max(MIN_TASK_MINUTES, duration)
        self._replace(task, [task.clone(start=new_start, end=new_start + timedelta(minutes=duration))])
        self.messages.append(f"Moved task {task.title} into nearest legal segment.")

    def _handle_task_resized(self) -> None:
        task = self._find(self.event.taskId)
        if not task:
            self.messages.append("Invalid task_resized payload.")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"Hard constraint task cannot be resized: {task.title}")
            self.force_invalid = True
            return
        start = _snap_to_work_start(self.event.newStart or task.start)
        duration = int(self.event.durationMinutes or 0)
        if duration <= 0 and self.event.newEnd:
            duration = _minutes_between(start, self.event.newEnd)
        if duration <= 0:
            duration = task.duration
        duration = max(MIN_TASK_MINUTES, duration)
        self._replace(task, [task.clone(start=start, end=start + timedelta(minutes=duration))])
        self.messages.append(f"Resized task {task.title} to {duration} minutes.")

    def _handle_task_added(self) -> None:
        if not self.event.newTask:
            self.messages.append("Invalid task_added payload.")
            self.force_invalid = True
            return
        task = Task.from_model(self.event.newTask)
        if task.priority == "S":
            for existing in self.tasks:
                if existing.priority == "S" and _overlap((existing.start, existing.end), (task.start, task.end)):
                    self.messages.append(f"New hard task conflicts with existing hard task: {task.title}")
                    self.force_invalid = True
                    return
        self.tasks.append(task)
        self.messages.append(f"Added task: {task.title}")

    def _handle_task_deleted(self) -> None:
        task = self._find(self.event.taskId)
        if not task:
            self.messages.append("Invalid task_deleted payload.")
            self.force_invalid = True
            return
        self.tasks = [item for item in self.tasks if item.id != task.id]
        self.messages.append(f"Deleted task: {task.title}")

    def _handle_burnout(self) -> None:
        task = self._find(self.event.taskId)
        if not task:
            self.messages.append("Invalid burnout payload.")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"Hard constraint task cannot be interrupted by burnout flow: {task.title}")
            self.force_invalid = True
            return
        at = _snap_to_work_start(self.event.at or task.start)
        if at <= task.start:
            at = task.start + timedelta(minutes=MIN_TASK_MINUTES)
        if at >= task.end:
            at = task.end - timedelta(minutes=MIN_TASK_MINUTES)
        remaining = max(MIN_TASK_MINUTES, _minutes_between(at, task.end))

        done = task.clone(id=f"{task.id}_done", title=f"{task.title} (Done Part)", end=at)
        rest = Task(
            id=f"rest_after_{task.id}",
            title="Recovery Break",
            start=at,
            end=at + timedelta(minutes=20),
            priority="C",
            kind="rest",
        )
        remaining_task = task.clone(
            id=f"{task.id}_remaining",
            title=f"{task.title} (Remaining Part)",
            start=rest.end,
            end=rest.end + timedelta(minutes=remaining),
            status="not_started",
        )

        replacements = [done, rest, remaining_task]
        self._replace(task, replacements)
        self.messages.append("Inserted recovery break and rebalanced remaining work.")

    def _repack_mutable_tasks(self) -> None:
        locked = [item for item in self.tasks if item.locked]
        mutable = [item for item in self.tasks if not item.locked]
        busy = [(item.start, item.end) for item in locked]

        for task in locked:
            reserve_end = task.end + timedelta(minutes=DEFAULT_BUFFER_MINUTES)
            if task.kind == "work" and _interval_inside_work(task.end, reserve_end):
                busy.append((task.end, reserve_end))

        result = locked[:]
        mutable.sort(
            key=lambda item: (
                item.start,
                PRIORITY_RANK[item.priority],
                item.deadline or datetime.max.replace(tzinfo=item.start.tzinfo),
                item.created_at or datetime.max.replace(tzinfo=item.start.tzinfo),
            )
        )

        for task in mutable:
            pieces, complete = _place_duration(
                task.duration,
                _snap_to_work_start(task.start),
                busy,
                task.deadline,
                max_piece=MAX_SEGMENT_MINUTES if task.duration > MAX_SEGMENT_MINUTES else task.duration,
            )
            if not pieces:
                self.messages.append(f"No legal slot found: {task.title}")
                self.force_invalid = True
                continue
            if not complete:
                self.messages.append(f"Could not fully place before deadline: {task.title}")
                self.force_invalid = True
            result.extend(_split_task(task, pieces))

        self.tasks = result


def cleanup_undo_store() -> None:
    now = datetime.now()
    expired = [key for key, value in UNDO_STORE.items() if value["expiresAt"] < now]
    for key in expired:
        UNDO_STORE.pop(key, None)


def run_event_replan(payload: RuleReplanInput) -> RuleReplanOutput:
    engine = RuleReplanEngine(payload)
    result = engine.run()
    version_id = f"replan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    expires = datetime.now() + timedelta(minutes=UNDO_TTL_MINUTES)

    if result.get("ok"):
        UNDO_STORE[version_id] = {
            "oldSchedule": [item.model_dump(by_alias=True) for item in payload.schedule],
            "newSchedule": result["newSchedule"],
            "expiresAt": expires,
        }

    return RuleReplanOutput(
        ok=bool(result["ok"]),
        newSchedule=[RuleTaskModel.model_validate(item) for item in result["newSchedule"]],
        messages=list(result["messages"]),
        explanation=str(result["explanation"]),
        versionId=version_id,
        undoToken=version_id,
        undoExpiresAt=expires,
    )


class RuleReplanUndoRequest(BaseModel):
    undoToken: str | None = None
    versionId: str | None = None


class RuleReplanUndoResponse(BaseModel):
    ok: bool
    oldSchedule: list[RuleTaskModel]
    messages: list[str]
    versionId: str | None = None


def undo_event_replan(payload: RuleReplanUndoRequest) -> RuleReplanUndoResponse:
    cleanup_undo_store()
    version_id = payload.versionId or payload.undoToken
    item = UNDO_STORE.get(version_id or "")
    if not item:
        return RuleReplanUndoResponse(ok=False, oldSchedule=[], messages=["Undo version not found or expired."], versionId=version_id)
    return RuleReplanUndoResponse(
        ok=True,
        oldSchedule=[RuleTaskModel.model_validate(task) for task in item["oldSchedule"]],
        messages=["Successfully restored previous schedule."],
        versionId=version_id,
    )
