import { Redis } from "ioredis";

let redis: Redis | null = null;

export function getCache(): Redis | null {
  if (process.env.REDIS_URL && !redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
  }
  return redis;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const cache = getCache();
  if (!cache) return null;
  const val = await cache.get(key);
  return val ? (JSON.parse(val) as T) : null;
}

export async function setJson(key: string, value: unknown, ttlSec = 10): Promise<void> {
  const cache = getCache();
  if (!cache) return;
  await cache.set(key, JSON.stringify(value), "EX", ttlSec);
}
