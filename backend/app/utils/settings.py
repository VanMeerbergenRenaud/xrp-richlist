import os

BACKEND_CORS_ORIGINS = [o.strip() for o in os.getenv("BACKEND_CORS_ORIGINS", "*").split(",")]
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/xrp_explorer")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
API_PREFIX = os.getenv("API_PREFIX", "/api")
