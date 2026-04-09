from datetime import datetime, timedelta, timezone

from app.core.models import EventModel, SchedulingInput
from app.core.reasoner import validate_constraints


def test_hard_lock_conflict_validation() -> None:
    now = datetime(2026, 4, 9, 8, 0, tzinfo=timezone.utc)
    payload = SchedulingInput(
        user_id="u1",
        now=now,
        window_start=now,
        window_end=now + timedelta(days=1),
        events=[
            EventModel(
                id="a",
                type="TASK",
                title="A",
                start_at=now + timedelta(hours=1),
                end_at=now + timedelta(hours=2),
                timezone="UTC",
                lock_state="HARD_LOCKED",
                flexibility="FIXED",
            ),
            EventModel(
                id="b",
                type="TASK",
                title="B",
                start_at=now + timedelta(hours=1, minutes=30),
                end_at=now + timedelta(hours=2, minutes=30),
                timezone="UTC",
                lock_state="HARD_LOCKED",
                flexibility="FIXED",
            ),
        ],
    )

    result = validate_constraints(payload)
    assert result["errors"]
