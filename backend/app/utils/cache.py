from . import settings


def get_redis():
    try:
        import redis  # lazy import pour éviter erreurs si non installé au démarrage
        return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        return None
