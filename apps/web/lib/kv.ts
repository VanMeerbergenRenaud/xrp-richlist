import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url =
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_URL || // Upstash (protocole Redis)
    null;
  if (!url) return null;
  // ioredis supporte les URLs redis:// et rediss://
  redis = new Redis(url, {
    // timeouts prudents
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000
  });
  return redis;
}

export async function pingRedis(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    if (r.status === "wait" || r.status === "end") {
      await r.connect();
    }
    const pong = await r.ping();
    return pong?.toString().toUpperCase() === "PONG";
  } catch {
    return false;
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch {
    return null;
  }
}

export async function setJSON(
  key: string,
  value: unknown
): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    await r.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Lock léger (SETNX) pour éviter la concurrence d’un rebuild
export async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const r = getRedis();
  if (!r) return await fn(); // sans redis, pas de lock, on exécute
  const lockKey = `lock:${key}`;
  const ok = await r.set(lockKey, "1", "NX", "PX", ttlMs);
  if (!ok) return null;
  try {
    return await fn();
  } finally {
    // libérer le lock (si encore détenu)
    try {
      await r.del(lockKey);
    } catch {
      /* noop */
    }
  }
}
