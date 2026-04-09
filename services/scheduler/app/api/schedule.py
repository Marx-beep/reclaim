from fastapi import APIRouter, Query

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
