from fastapi import APIRouter

from app.core.models import SchedulingInput
from app.core.reasoner import validate_constraints

router = APIRouter(prefix="/constraints", tags=["constraints"])


@router.post("/validate")
def validate(payload: SchedulingInput):
    return validate_constraints(payload)
