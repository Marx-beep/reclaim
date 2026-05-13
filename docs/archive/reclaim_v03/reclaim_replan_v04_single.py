#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reclaim dynamic replan single-file app v04.

This file is intentionally self-contained. It provides:
- CLI demo mode
- CLI JSON input/output mode
- HTTP API for frontend/backend integration
- Browser test page

Run:
  python reclaim_replan_v04_single.py --demo
  python reclaim_replan_v04_single.py --input demo_request.json --output demo_response_v04.json
  python reclaim_replan_v04_single.py --serve --port 8765

HTTP:
  GET  /api/health
  GET  /api/demo
  POST /api/scheduling/replan
  POST /api/scheduling/replan/undo
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse


APP_NAME = "Reclaim Replan v04 Single"
PRIORITY_RANK = {"S": 0, "A": 1, "B": 2, "C": 3}
WORK_SEGMENTS = [(time(9, 0), time(12, 0)), (time(14, 0), time(18, 0))]
MIN_TASK_MINUTES = 10
DEFAULT_BUFFER_MINUTES = 10
MAX_DAILY_BUFFER_MINUTES = 60
MAX_SEGMENT_MINUTES = 120
UNDO_STORE: dict[str, dict[str, Any]] = {}


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value)


def fmt_dt(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat()


def minutes_between(start: datetime, end: datetime) -> int:
    return max(0, int((end - start).total_seconds() // 60))


def is_workday(moment: datetime) -> bool:
    return moment.weekday() < 5


def at_time(day: datetime, t: time) -> datetime:
    return datetime.combine(day.date(), t)


def next_workday_start(moment: datetime) -> datetime:
    cursor = moment + timedelta(days=1)
    while not is_workday(cursor):
        cursor += timedelta(days=1)
    return cursor.replace(hour=9, minute=0, second=0, microsecond=0)


def snap_to_work_start(moment: datetime) -> datetime:
    cursor = moment.replace(second=0, microsecond=0)
    while True:
        if not is_workday(cursor):
            cursor = next_workday_start(cursor)
            continue
        for seg_start, seg_end in WORK_SEGMENTS:
            start = at_time(cursor, seg_start)
            end = at_time(cursor, seg_end)
            if start <= cursor < end:
                return cursor
            if cursor < start:
                return start
        cursor = next_workday_start(cursor)


def work_segments_from(start: datetime, days: int = 14) -> list[tuple[datetime, datetime]]:
    cursor = snap_to_work_start(start)
    first_day = cursor.replace(hour=0, minute=0, second=0, microsecond=0)
    result: list[tuple[datetime, datetime]] = []
    for offset in range(days):
        day = first_day + timedelta(days=offset)
        if not is_workday(day):
            continue
        for seg_start, seg_end in WORK_SEGMENTS:
            a = at_time(day, seg_start)
            b = at_time(day, seg_end)
            if b <= cursor:
                continue
            result.append((max(a, cursor), b))
    return result


def interval_inside_work(start: datetime, end: datetime) -> bool:
    if end <= start or start.date() != end.date() or not is_workday(start):
        return False
    return any(at_time(start, a) <= start and end <= at_time(start, b) for a, b in WORK_SEGMENTS)


def overlap(a: tuple[datetime, datetime], b: tuple[datetime, datetime]) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def subtract_busy(
    slots: Iterable[tuple[datetime, datetime]],
    busy: Iterable[tuple[datetime, datetime]],
) -> list[tuple[datetime, datetime]]:
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
    return [(a, b) for a, b in available if minutes_between(a, b) >= MIN_TASK_MINUTES]


@dataclass
class Task:
    id: str
    title: str
    start: datetime
    end: datetime
    priority: str = "B"
    status: str = "not_started"
    deadline: datetime | None = None
    kind: str = "work"
    is_low_load: bool = False
    project: str | None = None
    created_at: datetime | None = None
    original: dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> int:
        return minutes_between(self.start, self.end)

    @property
    def locked(self) -> bool:
        return self.priority == "S" or self.status in {"completed", "expired"} or self.kind in {"buffer", "rest"}

    @classmethod
    def from_json(cls, data: dict[str, Any]) -> "Task":
        priority = str(data.get("priority", "B")).upper()
        if priority not in PRIORITY_RANK:
            priority = "B"
        start = parse_dt(data.get("start"))
        end = parse_dt(data.get("end"))
        if not start or not end:
            raise ValueError(f"任务 {data.get('id', '<unknown>')} 缺少 start 或 end")
        return cls(
            id=str(data.get("id")),
            title=str(data.get("title", data.get("id", ""))),
            start=start,
            end=end,
            priority=priority,
            status=str(data.get("status", "not_started")),
            deadline=parse_dt(data.get("deadline")),
            kind=str(data.get("kind", "work")),
            is_low_load=bool(data.get("is_low_load", False)),
            project=data.get("project"),
            created_at=parse_dt(data.get("createdAt") or data.get("created_at")),
            original=copy.deepcopy(data),
        )

    def clone(self, **changes: Any) -> "Task":
        data = self.__dict__.copy()
        data.update(changes)
        return Task(**data)

    def to_json(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "title": self.title,
            "start": fmt_dt(self.start),
            "end": fmt_dt(self.end),
            "priority": self.priority,
            "status": self.status,
            "kind": self.kind,
        }
        if self.deadline:
            data["deadline"] = fmt_dt(self.deadline)
        if self.is_low_load:
            data["is_low_load"] = True
        if self.project:
            data["project"] = self.project
        if self.created_at:
            data["createdAt"] = fmt_dt(self.created_at)
        return data


def place_duration(
    duration: int,
    earliest: datetime,
    busy: list[tuple[datetime, datetime]],
    deadline: datetime | None,
    max_piece: int = MAX_SEGMENT_MINUTES,
) -> tuple[list[tuple[datetime, datetime]], bool]:
    remaining = max(MIN_TASK_MINUTES, duration)
    cursor = snap_to_work_start(earliest)
    pieces: list[tuple[datetime, datetime]] = []
    guard = 0
    while remaining > 0 and guard < 300:
        guard += 1
        slots = work_segments_from(cursor, days=21)
        available = subtract_busy(slots, busy)
        placed = False
        for slot_start, slot_end in available:
            start = max(slot_start, cursor)
            latest_end = min(slot_end, deadline) if deadline else slot_end
            can_use = minutes_between(start, latest_end)
            if can_use < MIN_TASK_MINUTES:
                continue
            take = min(remaining, can_use, max_piece)
            end = start + timedelta(minutes=take)
            pieces.append((start, end))
            busy.append((start, end))
            reserve_end = end + timedelta(minutes=DEFAULT_BUFFER_MINUTES)
            if interval_inside_work(end, reserve_end):
                busy.append((end, reserve_end))
            busy.sort()
            remaining -= take
            cursor = reserve_end
            placed = True
            break
        if not placed:
            next_cursor = next_workday_start(cursor)
            if deadline and next_cursor >= deadline:
                return pieces, False
            cursor = next_cursor
    return pieces, remaining == 0


def split_task(task: Task, pieces: list[tuple[datetime, datetime]]) -> list[Task]:
    if len(pieces) <= 1:
        if not pieces:
            return []
        return [task.clone(start=pieces[0][0], end=pieces[0][1])]
    return [
        task.clone(
            id=f"{task.id}_part_{index}",
            title=f"{task.title}（第 {index} 部分）",
            start=start,
            end=end,
        )
        for index, (start, end) in enumerate(pieces, start=1)
    ]


def add_buffers(tasks: list[Task], messages: list[str]) -> list[Task]:
    ordered = sorted(tasks, key=lambda t: (t.start, t.end, PRIORITY_RANK.get(t.priority, 9)))
    result: list[Task] = []
    daily_buffer: dict[str, int] = {}
    for task in ordered:
        if result:
            prev = result[-1]
            same_day = prev.end.date() == task.start.date()
            gap = minutes_between(prev.end, task.start)
            both_work = prev.kind == "work" and task.kind == "work"
            if same_day and both_work and gap >= DEFAULT_BUFFER_MINUTES:
                key = prev.end.date().isoformat()
                used = daily_buffer.get(key, 0)
                can_add = min(DEFAULT_BUFFER_MINUTES, gap, MAX_DAILY_BUFFER_MINUTES - used)
                start = prev.end
                end = start + timedelta(minutes=can_add)
                if can_add > 0 and interval_inside_work(start, end):
                    result.append(
                        Task(
                            id=f"buffer_{key}_{len(result)}",
                            title="缓冲时间",
                            start=start,
                            end=end,
                            priority="C",
                            kind="buffer",
                        )
                    )
                    daily_buffer[key] = used + can_add
                elif can_add <= 0:
                    messages.append(f"{key} 普通缓冲已达到60分钟上限。")
        result.append(task)
    return sorted(result, key=lambda t: (t.start, t.end, t.id))


def validate_schedule(before: list[Task], after: list[Task]) -> list[str]:
    messages: list[str] = []
    before_s = {t.id: t for t in before if t.priority == "S"}
    after_s = {t.id: t for t in after if t.priority == "S"}
    for task_id, old in before_s.items():
        new = after_s.get(task_id)
        if not new:
            messages.append(f"S级任务 {old.title} 被自动删除，违反硬约束。")
        elif old.start != new.start or old.end != new.end:
            messages.append(f"S级任务 {old.title} 时间发生变化，违反硬约束。")
    ordered = sorted(after, key=lambda t: (t.start, t.end))
    for task in ordered:
        if task.end <= task.start:
            messages.append(f"{task.title} 结束时间不晚于开始时间。")
        if task.kind == "work":
            if task.duration < MIN_TASK_MINUTES:
                messages.append(f"{task.title} 小于10分钟最小执行单元。")
            if not interval_inside_work(task.start, task.end):
                messages.append(f"{task.title} 不完全位于合法工作时段。")
        if task.deadline and task.end > task.deadline:
            messages.append(f"{task.title} 超过硬截止时间。")
    for prev, current in zip(ordered, ordered[1:]):
        if overlap((prev.start, prev.end), (current.start, current.end)):
            messages.append(f"{prev.title} 与 {current.title} 存在时间重叠。")
    return messages


class ReplanEngine:
    def __init__(self, payload: dict[str, Any]):
        self.payload = payload
        self.before = [Task.from_json(item) for item in payload.get("schedule", [])]
        self.tasks = [Task.from_json(item) for item in payload.get("schedule", [])]
        self.event = payload.get("event", {})
        self.messages: list[str] = []
        self.force_invalid = False

    def find(self, task_id: str | None) -> Task | None:
        return next((task for task in self.tasks if task.id == task_id), None)

    def replace(self, old: Task, new_items: list[Task]) -> None:
        self.tasks = [task for task in self.tasks if task.id != old.id] + new_items

    def run(self) -> dict[str, Any]:
        event_type = self.event.get("type")
        handlers = {
            "task_delayed": self.handle_task_delayed,
            "task_finished_early": self.handle_task_finished_early,
            "task_moved": self.handle_task_moved,
            "task_resized": self.handle_task_resized,
            "task_added": self.handle_task_added,
            "task_deleted": self.handle_task_deleted,
            "burnout": self.handle_burnout,
        }
        handler = handlers.get(event_type)
        if not handler:
            self.messages.append(f"未知事件类型：{event_type}")
            self.force_invalid = True
        else:
            handler()
        if not self.force_invalid:
            self.repack_mutable_tasks()
            self.tasks = add_buffers(self.tasks, self.messages)
        validation = validate_schedule(self.before, self.tasks)
        ok = (not self.force_invalid) and (not validation)
        all_messages = self.messages + validation
        return {
            "ok": ok,
            "newSchedule": [task.to_json() for task in sorted(self.tasks, key=lambda t: (t.start, t.end, t.id))],
            "messages": all_messages,
            "explanation": all_messages[0] if all_messages else "已根据规则完成重排。",
        }

    def handle_task_delayed(self) -> None:
        task = self.find(self.event.get("taskId"))
        delay = int(self.event.get("delayMinutes") or 0)
        if not task or delay <= 0:
            self.messages.append("任务超时事件缺少有效 taskId 或 delayMinutes。")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"{task.title} 为S级硬约束，不能自动顺延。")
            self.force_invalid = True
            return
        self.replace(task, [task.clone(end=task.end + timedelta(minutes=delay))])
        self.messages.append(f"{task.title} 延长 {delay} 分钟；后续任务按优先级重排。")

    def handle_task_finished_early(self) -> None:
        task = self.find(self.event.get("taskId"))
        early = int(self.event.get("earlyMinutes") or 0)
        if not task or early < MIN_TASK_MINUTES:
            self.messages.append("提前完成不足10分钟或任务不存在，不触发重排。")
            return
        if task.priority == "S":
            self.messages.append(f"{task.title} 为S级任务，固定时间块不变，释放部分作为自由休息。")
            return
        new_end = max(task.start + timedelta(minutes=MIN_TASK_MINUTES), task.end - timedelta(minutes=early))
        self.replace(task, [task.clone(end=new_end, status="completed")])
        self.messages.append(f"{task.title} 提前完成 {early} 分钟。")

    def handle_task_moved(self) -> None:
        task = self.find(self.event.get("taskId"))
        if not task:
            self.messages.append("拖动事件缺少有效 taskId。")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"{task.title} 为S级硬约束，拖动被拒绝。")
            self.force_invalid = True
            return
        new_start = snap_to_work_start(parse_dt(self.event.get("newStart")) or task.start)
        raw_end = parse_dt(self.event.get("newEnd"))
        duration = minutes_between(new_start, raw_end) if raw_end else task.duration
        duration = max(MIN_TASK_MINUTES, duration)
        self.replace(task, [task.clone(start=new_start, end=new_start + timedelta(minutes=duration))])
        self.messages.append(f"{task.title} 已移动到最近合法工作时段。")

    def handle_task_resized(self) -> None:
        task = self.find(self.event.get("taskId"))
        if not task:
            self.messages.append("调整时长事件缺少有效 taskId。")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"{task.title} 为S级硬约束，时长调整被拒绝。")
            self.force_invalid = True
            return
        start = snap_to_work_start(parse_dt(self.event.get("newStart")) or task.start)
        new_end = parse_dt(self.event.get("newEnd"))
        duration = int(self.event.get("durationMinutes") or 0) or (minutes_between(start, new_end) if new_end else task.duration)
        duration = max(MIN_TASK_MINUTES, duration)
        self.replace(task, [task.clone(start=start, end=start + timedelta(minutes=duration))])
        self.messages.append(f"{task.title} 时长调整为 {duration} 分钟。")

    def handle_task_added(self) -> None:
        payload = self.event.get("newTask")
        if not isinstance(payload, dict):
            self.messages.append("新增任务事件缺少 newTask。")
            self.force_invalid = True
            return
        task = Task.from_json(payload)
        if task.priority == "S":
            for existing in self.tasks:
                if existing.priority == "S" and overlap((existing.start, existing.end), (task.start, task.end)):
                    self.messages.append(f"新增S级任务 {task.title} 与既有S级任务 {existing.title} 冲突。")
                    self.force_invalid = True
                    return
        self.tasks.append(task)
        self.messages.append(f"新增任务 {task.title} 已纳入重排。")

    def handle_task_deleted(self) -> None:
        task = self.find(self.event.get("taskId"))
        if not task:
            self.messages.append("删除事件缺少有效 taskId。")
            self.force_invalid = True
            return
        self.tasks = [item for item in self.tasks if item.id != task.id]
        self.messages.append(f"{task.title} 已删除；释放时间默认保留为自由休息。")

    def handle_burnout(self) -> None:
        task = self.find(self.event.get("taskId"))
        if not task:
            self.messages.append("干不下去了事件缺少有效 taskId。")
            self.force_invalid = True
            return
        if task.priority == "S":
            self.messages.append(f"{task.title} 为S级硬约束，不能自动终止。")
            self.force_invalid = True
            return
        at = snap_to_work_start(parse_dt(self.event.get("at")) or task.start)
        if at <= task.start:
            at = task.start + timedelta(minutes=MIN_TASK_MINUTES)
        if at >= task.end:
            at = task.end - timedelta(minutes=MIN_TASK_MINUTES)
        remaining = max(MIN_TASK_MINUTES, minutes_between(at, task.end))
        done = task.clone(id=f"{task.id}_done", title=f"{task.title}（已执行部分）", end=at)
        rest = Task(
            id=f"rest_after_{task.id}",
            title="强制休息",
            start=at,
            end=at + timedelta(minutes=20),
            priority="C",
            kind="rest",
        )
        remaining_task = task.clone(
            id=f"{task.id}_remaining",
            title=f"{task.title}（剩余部分）",
            start=rest.end,
            end=rest.end + timedelta(minutes=remaining),
            status="not_started",
        )
        replacements = [done, rest]
        low_load = self.pick_low_load(task)
        if low_load:
            self.tasks = [item for item in self.tasks if item.id != low_load.id]
            replacements.append(low_load.clone(start=rest.end, end=rest.end + timedelta(minutes=min(30, low_load.duration))))
        replacements.append(remaining_task)
        self.replace(task, replacements)
        self.messages.append("已插入休息，并优先切换低负荷任务。")

    def pick_low_load(self, current: Task) -> Task | None:
        candidates = [
            task for task in self.tasks
            if task.id != current.id and task.is_low_load and task.priority != "S" and task.status == "not_started"
        ]
        same_project = [task for task in candidates if current.project and task.project == current.project]
        pool = same_project or candidates
        return min(pool, key=lambda t: (t.start, PRIORITY_RANK.get(t.priority, 9)), default=None)

    def repack_mutable_tasks(self) -> None:
        locked = [task for task in self.tasks if task.locked]
        mutable = [task for task in self.tasks if not task.locked]
        busy = [(task.start, task.end) for task in locked]
        for task in locked:
            reserve_end = task.end + timedelta(minutes=DEFAULT_BUFFER_MINUTES)
            if task.kind == "work" and interval_inside_work(task.end, reserve_end):
                busy.append((task.end, reserve_end))
        result = locked[:]
        mutable.sort(key=lambda t: (t.start, PRIORITY_RANK.get(t.priority, 9), t.deadline or datetime.max, t.created_at or datetime.max))
        for task in mutable:
            pieces, ok = place_duration(
                task.duration,
                snap_to_work_start(task.start),
                busy,
                task.deadline,
                max_piece=MAX_SEGMENT_MINUTES if task.duration > MAX_SEGMENT_MINUTES else task.duration,
            )
            if not pieces:
                self.messages.append(f"{task.title} 无可用合法时段，需人工确认。")
                self.force_invalid = True
                continue
            if not ok:
                self.messages.append(f"{task.title} 无法完整排入截止时间前。")
                self.force_invalid = True
            result.extend(split_task(task, pieces))
        self.tasks = result


def replan(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {
            "ok": False,
            "newSchedule": [],
            "messages": ["请求体必须是 JSON 对象，且包含 schedule 与 event。"],
            "explanation": "请求格式不正确，未执行重排。",
        }
    try:
        return ReplanEngine(payload).run()
    except Exception as exc:
        return {
            "ok": False,
            "newSchedule": payload.get("schedule", []),
            "messages": [f"规则引擎异常：{exc}"],
            "explanation": "规则引擎异常，已返回原日程。",
        }


def demo_payload() -> dict[str, Any]:
    return {
        "schedule": [
            {
                "id": "paper",
                "title": "写论文",
                "start": "2026-05-11T09:00:00",
                "end": "2026-05-11T11:00:00",
                "priority": "A",
                "status": "in_progress",
                "deadline": "2026-05-11T18:00:00",
                "project": "毕业论文",
            },
            {
                "id": "slides",
                "title": "做PPT",
                "start": "2026-05-11T11:00:00",
                "end": "2026-05-11T12:00:00",
                "priority": "B",
                "status": "not_started",
            },
            {
                "id": "meeting",
                "title": "组会",
                "start": "2026-05-11T14:00:00",
                "end": "2026-05-11T15:00:00",
                "priority": "S",
                "status": "not_started",
            },
            {
                "id": "refs",
                "title": "整理参考文献",
                "start": "2026-05-11T15:00:00",
                "end": "2026-05-11T15:40:00",
                "priority": "C",
                "status": "not_started",
                "is_low_load": True,
                "project": "毕业论文",
            },
        ],
        "event": {"type": "task_delayed", "taskId": "paper", "delayMinutes": 40},
    }


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat()


def add_version_fields(result: dict[str, Any], old_schedule: list[dict[str, Any]]) -> dict[str, Any]:
    version_id = f"replan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    expires = datetime.now() + timedelta(minutes=10)
    result = dict(result)
    result["versionId"] = version_id
    result["undoToken"] = version_id
    result["undoExpiresAt"] = fmt_dt(expires)
    if result.get("ok"):
        UNDO_STORE[version_id] = {
            "oldSchedule": old_schedule,
            "newSchedule": result.get("newSchedule", []),
            "expiresAt": expires,
        }
    return result


def cleanup_undo_store() -> None:
    current = datetime.now()
    for key in [k for k, v in UNDO_STORE.items() if v["expiresAt"] < current]:
        UNDO_STORE.pop(key, None)


INDEX_HTML = """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reclaim Replan v04</title>
  <style>
    body { margin: 0; font-family: "Microsoft YaHei", Arial, sans-serif; background: #f5f7f8; color: #1e2a2f; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #19535f; }
    p { color: #4b5a61; line-height: 1.6; }
    .toolbar { display: flex; gap: 10px; margin: 16px 0; flex-wrap: wrap; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
    textarea, pre { width: 100%; min-height: 540px; box-sizing: border-box; border: 1px solid #d6dee2; border-radius: 8px; padding: 14px; background: #fff; font: 13px/1.5 Consolas, "Microsoft YaHei", monospace; overflow: auto; white-space: pre-wrap; }
    button { border: 0; background: #19535f; color: #fff; padding: 10px 14px; border-radius: 7px; cursor: pointer; font-weight: 700; }
    button.secondary { background: #844c2a; }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .status { align-self: center; color: #4b5a61; }
    .label { font-weight: 700; margin-bottom: 8px; color: #19535f; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>Reclaim 动态重排 v04</h1>
    <p>单文件 Python 应用。左侧编辑请求 JSON，右侧查看 /api/scheduling/replan 返回结果。</p>
    <div class="toolbar">
      <button id="loadDemo">载入示例</button>
      <button id="run">运行重排</button>
      <button id="undo" class="secondary" disabled>撤销最近重排</button>
      <span id="status" class="status">未运行</span>
    </div>
    <div class="grid">
      <section><div class="label">请求 JSON</div><textarea id="request"></textarea></section>
      <section><div class="label">响应 JSON</div><pre id="response"></pre></section>
    </div>
  </main>
  <script>
    const reqEl = document.getElementById("request");
    const resEl = document.getElementById("response");
    const statusEl = document.getElementById("status");
    const undoBtn = document.getElementById("undo");
    let latestVersionId = null;
    async function loadDemo() {
      const res = await fetch("/api/demo");
      const data = await res.json();
      reqEl.value = JSON.stringify(data, null, 2);
      resEl.textContent = "";
      statusEl.textContent = "已载入示例";
      undoBtn.disabled = true;
    }
    async function runReplan() {
      statusEl.textContent = "运行中...";
      latestVersionId = null;
      undoBtn.disabled = true;
      try {
        const payload = JSON.parse(reqEl.value);
        const res = await fetch("/api/scheduling/replan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        resEl.textContent = JSON.stringify(data, null, 2);
        statusEl.textContent = data.ok ? "运行成功" : "规则校验未通过";
        latestVersionId = data.versionId || null;
        undoBtn.disabled = !latestVersionId;
      } catch (error) {
        statusEl.textContent = "运行失败";
        resEl.textContent = String(error);
      }
    }
    async function undoReplan() {
      if (!latestVersionId) return;
      const res = await fetch("/api/scheduling/replan/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: latestVersionId })
      });
      const data = await res.json();
      resEl.textContent = JSON.stringify(data, null, 2);
      statusEl.textContent = data.ok ? "已撤销" : "撤销失败";
      undoBtn.disabled = true;
    }
    document.getElementById("loadDemo").addEventListener("click", loadDemo);
    document.getElementById("run").addEventListener("click", runReplan);
    undoBtn.addEventListener("click", undoReplan);
    loadDemo();
  </script>
</body>
</html>
"""


def send_json(handler: BaseHTTPRequestHandler, payload: dict[str, Any], status: int = 200) -> None:
    data = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(data)


def send_html(handler: BaseHTTPRequestHandler, html: str) -> None:
    data = html.encode("utf-8")
    handler.send_response(200)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.end_headers()
    handler.wfile.write(data)


def read_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length else b"{}"
    return json.loads(raw.decode("utf-8")) if raw else {}


class Handler(BaseHTTPRequestHandler):
    server_version = APP_NAME

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/":
            send_html(self, INDEX_HTML)
        elif path == "/api/health":
            send_json(self, {"ok": True, "app": APP_NAME, "time": now_iso()})
        elif path == "/api/demo":
            send_json(self, demo_payload())
        else:
            send_json(self, {"ok": False, "messages": [f"未找到路径：{path}"]}, status=404)

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path == "/api/scheduling/replan":
                payload = read_body(self)
                old_schedule = payload.get("schedule", []) if isinstance(payload, dict) else []
                result = add_version_fields(replan(payload), old_schedule)
                send_json(self, result, 200 if result.get("ok") else 422)
                return
            if path == "/api/scheduling/replan/undo":
                cleanup_undo_store()
                payload = read_body(self)
                version_id = (payload.get("versionId") or payload.get("undoToken")) if isinstance(payload, dict) else None
                item = UNDO_STORE.get(version_id)
                if not item:
                    send_json(self, {"ok": False, "messages": ["撤销版本不存在或已过期。"], "oldSchedule": []}, status=404)
                    return
                send_json(self, {"ok": True, "oldSchedule": item["oldSchedule"], "messages": ["已恢复重排前日程。"], "versionId": version_id})
                return
            send_json(self, {"ok": False, "messages": [f"未找到路径：{path}"]}, status=404)
        except json.JSONDecodeError:
            send_json(self, {"ok": False, "messages": ["请求体不是合法 JSON。"]}, status=400)
        except Exception as exc:
            send_json(self, {"ok": False, "messages": [f"服务异常：{exc}"]}, status=500)

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (now_iso(), fmt % args))


def serve(host: str, port: int) -> None:
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"{APP_NAME} running at http://{host}:{port}", flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")
    finally:
        server.server_close()


def run_cli(args: argparse.Namespace) -> None:
    if args.demo:
        payload = demo_payload()
    elif args.input:
        payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    else:
        raise SystemExit("请使用 --demo、--input，或 --serve。")
    result = add_version_fields(replan(payload), payload.get("schedule", []))
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    print(text)


def main() -> None:
    parser = argparse.ArgumentParser(description=APP_NAME)
    parser.add_argument("--demo", action="store_true", help="运行内置演示")
    parser.add_argument("--input", help="读取 JSON 请求文件")
    parser.add_argument("--output", help="写出 JSON 响应文件")
    parser.add_argument("--serve", action="store_true", help="启动 HTTP 服务")
    parser.add_argument("--host", default="127.0.0.1", help="HTTP 服务监听地址")
    parser.add_argument("--port", type=int, default=8765, help="HTTP 服务端口")
    args = parser.parse_args()
    if args.serve:
        serve(args.host, args.port)
    else:
        run_cli(args)


if __name__ == "__main__":
    main()
