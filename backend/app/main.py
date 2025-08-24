from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .utils import settings
from .routes import health, stats, address


app = FastAPI(title="XRP Explorer API", version="0.1.0")

# CORS
allow_origins = settings.BACKEND_CORS_ORIGINS
if allow_origins == ["*"]:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router, prefix=settings.API_PREFIX, tags=["health"])
app.include_router(stats.router, prefix=settings.API_PREFIX, tags=["stats"])
app.include_router(address.router, prefix=settings.API_PREFIX, tags=["address"])


@app.get("/")
def root():
    return {"message": "XRP Explorer API is running", "docs": "/docs"}
