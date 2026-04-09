from __future__ import annotations

from app.core.heuristics import run_heuristics
from app.core.models import SchedulingInput, SchedulingOutput


def run_ortools(payload: SchedulingInput) -> SchedulingOutput:
    """
    Phase-2 hook.
    Current implementation falls back to heuristics when OR-Tools
    advanced model is not yet activated.
    """
    return run_heuristics(payload)
