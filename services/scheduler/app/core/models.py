from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

Priority = Literal["P1", "P2", "P3", "P4"]
LockState = Literal["FREE", "BUSY", "SOFT_LOCKED", "HARD_LOCKED"]
Flexibility = Literal["FLEXIBLE", "SEMI_FLEXIBLE", "FIXED"]


class EventModel(BaseModel):
    id: str
    type: str
    title: str
    start_at: datetime
    end_at: datetime
    timezone: str = "UTC"
    priority: Priority = "P3"
    flexibility: Flexibility = "FLEXIBLE"
    lock_state: LockState = "FREE"
    due_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BusyBlock(BaseModel):
    start_at: datetime
    end_at: datetime
    source: str = "INTERNAL"


class BufferRule(BaseModel):
    applies_to_types: list[str] = Field(default_factory=list)
    before_minutes: int = 0
    after_minutes: int = 0


class WorkHourRule(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str


class TimePolicy(BaseModel):
    soft_lock_lead_hours: int = 24
    hard_lock_lead_hours: int = 4


class SchedulingInput(BaseModel):
    user_id: str
    now: datetime
    window_start: datetime
    window_end: datetime
    events: list[EventModel]
    busy_blocks: list[BusyBlock] = Field(default_factory=list)
    work_hours: list[WorkHourRule] = Field(default_factory=list)
    buffer_rules: list[BufferRule] = Field(default_factory=list)
    time_policy: TimePolicy = Field(default_factory=TimePolicy)


class SchedulingMove(BaseModel):
    event_id: str
    previous_start_at: datetime
    previous_end_at: datetime
    new_start_at: datetime
    new_end_at: datetime
    lock_state_after: LockState
    reason: dict[str, Any]
    reason_text: str
    score_delta: float = 0


class SchedulingOutput(BaseModel):
    feasible: bool
    solver: str
    score: float
    moves: list[SchedulingMove]
    unscheduled_event_ids: list[str] = Field(default_factory=list)
    explanations: dict[str, str] = Field(default_factory=dict)
