from fastapi import APIRouter

router = APIRouter()


@router.get("/address/{address}")
async def get_address(address: str):
    # TODO: Valider l'adresse, récupérer balance, tokens, transactions depuis XRPL et DB
    return {"address": address, "balance": 0, "tokens": [], "transactions": []}
