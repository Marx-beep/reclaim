from datetime import datetime, timedelta, timezone

from app.core.event_replan import (
    RuleReplanInput,
    RuleTaskModel,
    RuleEventModel,
    RuleReplanUndoRequest,
    run_event_replan,
    undo_event_replan,
)


def _base_schedule() -> list[RuleTaskModel]:
    now = datetime(2026, 5, 11, 9, 0, tzinfo=timezone.utc)
    return [
        RuleTaskModel(
            id="paper",
            title="Write Paper",
            start=now,
            end=now + timedelta(hours=2),
            priority="A",
            status="in_progress",
            deadline=now.replace(hour=18),
            project="thesis",
        ),
        RuleTaskModel(
            id="slides",
            title="Prepare Slides",
            start=now + timedelta(hours=2),
            end=now + timedelta(hours=3),
            priority="B",
            status="not_started",
        ),
        RuleTaskModel(
            id="meeting",
            title="Team Meeting",
            start=now + timedelta(hours=5),
            end=now + timedelta(hours=6),
            priority="S",
            status="not_started",
        ),
    ]


def test_task_delayed_generates_new_time_blocks() -> None:
    payload = RuleReplanInput(
        schedule=_base_schedule(),
        event=RuleEventModel(type="task_delayed", taskId="paper", delayMinutes=40),
    )
    result = run_event_replan(payload)

    assert result.ok is True
    assert any("Delayed" in message for message in result.messages)
    assert len(result.newSchedule) >= 3


def test_finished_early_shortens_task_duration() -> None:
    payload = RuleReplanInput(
        schedule=_base_schedule(),
        event=RuleEventModel(type="task_finished_early", taskId="slides", earlyMinutes=20),
    )
    result = run_event_replan(payload)
    updated = next(task for task in result.newSchedule if task.id == "slides")

    assert result.ok is True
    assert updated.status == "completed"
    assert updated.end < _base_schedule()[1].end


def test_task_added_and_deleted_adjustments() -> None:
    schedule = _base_schedule()
    add_payload = RuleReplanInput(
        schedule=schedule,
        event=RuleEventModel(
            type="task_added",
            newTask=RuleTaskModel(
                id="refs",
                title="Review References",
                start=schedule[1].end,
                end=schedule[1].end + timedelta(minutes=40),
                priority="C",
                status="not_started",
                is_low_load=True,
                project="thesis",
            ),
        ),
    )
    add_result = run_event_replan(add_payload)
    assert add_result.ok is True
    assert any(task.id.startswith("refs") for task in add_result.newSchedule)

    delete_payload = RuleReplanInput(
        schedule=add_result.newSchedule,
        event=RuleEventModel(type="task_deleted", taskId="refs"),
    )
    delete_result = run_event_replan(delete_payload)
    assert delete_result.ok is True
    assert all(task.id != "refs" for task in delete_result.newSchedule)


def test_buffer_insertion_and_undo() -> None:
    payload = RuleReplanInput(
        schedule=_base_schedule(),
        event=RuleEventModel(type="task_moved", taskId="slides", newStart=datetime(2026, 5, 11, 11, 0, tzinfo=timezone.utc)),
    )
    result = run_event_replan(payload)
    assert result.ok is True
    assert any(task.kind == "buffer" for task in result.newSchedule)

    undo = undo_event_replan(RuleReplanUndoRequest(undoToken=result.undoToken))
    assert undo.ok is True
    assert len(undo.oldSchedule) == len(_base_schedule())
