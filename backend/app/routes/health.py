from fastapi import APIRouter

from ..models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def get_health():
    return HealthResponse(status="ok")
