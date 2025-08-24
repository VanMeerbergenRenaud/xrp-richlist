from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class StatsResponse(BaseModel):
    ledger_index: int
    last_updated: str
    total_xrp: float
    circulating_xrp: float
    price_usd: float
    wallets: int
