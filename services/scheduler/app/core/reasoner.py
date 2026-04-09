from app.core.models import SchedulingInput


def validate_constraints(payload: SchedulingInput) -> dict[str, list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    # Hard-lock conflict validation.
    hard_locked = [event for event in payload.events if event.lock_state == "HARD_LOCKED"]
    for i, left in enumerate(hard_locked):
        for right in hard_locked[i + 1 :]:
            if left.start_at < right.end_at and left.end_at > right.start_at:
                errors.append(f"Hard lock conflict between {left.id} and {right.id}")

    if payload.window_end <= payload.window_start:
        errors.append("Invalid scheduling window")

    if not payload.work_hours:
        warnings.append("No work hours provided; scheduler will use raw window boundaries")

    return {"errors": errors, "warnings": warnings}
