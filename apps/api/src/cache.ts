import Redis from "ioredis";

type CacheValue = { value: any; expireAt: number };

export class Cache {
  private memory = new Map<string, CacheValue>();
  private redis?: Redis;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.memory.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.redis) {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    }
    this.memory.set(key, { value, expireAt: Date.now() + ttlSeconds * 1000 });
  }
}
