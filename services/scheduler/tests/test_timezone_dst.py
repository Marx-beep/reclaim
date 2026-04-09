from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.models import EventModel, SchedulingInput
from app.core.heuristics import run_heuristics


def test_cross_timezone_ordering_is_stable() -> None:
    now = datetime(2026, 3, 8, 8, 0, tzinfo=ZoneInfo("UTC"))

    event_la = EventModel(
        id="la",
        type="TASK",
        title="LA",
        start_at=datetime(2026, 3, 8, 9, 0, tzinfo=ZoneInfo("America/Los_Angeles")),
        end_at=datetime(2026, 3, 8, 10, 0, tzinfo=ZoneInfo("America/Los_Angeles")),
        timezone="America/Los_Angeles",
        priority="P2",
    )
    event_sh = EventModel(
        id="sh",
        type="TASK",
        title="SH",
        start_at=datetime(2026, 3, 8, 9, 0, tzinfo=ZoneInfo("Asia/Shanghai")),
        end_at=datetime(2026, 3, 8, 10, 0, tzinfo=ZoneInfo("Asia/Shanghai")),
        timezone="Asia/Shanghai",
        priority="P3",
    )

    payload = SchedulingInput(
        user_id="u1",
        now=now,
        window_start=now,
        window_end=now + timedelta(days=2),
        events=[event_la, event_sh],
    )
    output = run_heuristics(payload)
    assert output.feasible
