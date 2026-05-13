from fastapi import APIRouter, Query

from app.core.event_replan import RuleReplanInput, RuleReplanUndoRequest, run_event_replan, undo_event_replan
from app.core.heuristics import run_heuristics
from app.core.models import SchedulingInput
from app.core.ortools_solver import run_ortools

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/preview")
def preview(payload: SchedulingInput, solver: str = Query(default="heuristics")):
    if solver == "ortools":
        return run_ortools(payload)
    return run_heuristics(payload)


@router.post("/commit")
def commit(payload: SchedulingInput, solver: str = Query(default="heuristics")):
    # Commit endpoint returns computed schedule. Persistence is handled by BFF.
    if solver == "ortools":
        return run_ortools(payload)
    return run_heuristics(payload)


@router.post("/recompute-window")
def recompute_window(payload: SchedulingInput, solver: str = Query(default="heuristics")):
    # Explicitly scoped to impacted time window from queue workers or webhook events.
    if solver == "ortools":
        return run_ortools(payload)
    return run_heuristics(payload)


@router.post("/event-replan")
def event_replan(payload: RuleReplanInput):
    # Rule-oriented local replan engine (ported from v03 single-file implementation).
    return run_event_replan(payload)


@router.post("/event-replan/undo")
def event_replan_undo(payload: RuleReplanUndoRequest):
    return undo_event_replan(payload)
