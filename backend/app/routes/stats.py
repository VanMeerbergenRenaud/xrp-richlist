from datetime import datetime, timezone

from fastapi import APIRouter

from ..models.schemas import StatsResponse

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    # TODO: Remplacer par appel service XRPL + DB/Redis
    return StatsResponse(
        ledger_index=0,
        last_updated=datetime.now(timezone.utc).isoformat(),
        total_xrp=100_000_000_000.0,
        circulating_xrp=55_000_000_000.0,
        price_usd=0.0,
        wallets=0,
    )
