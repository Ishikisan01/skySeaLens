import Redis from "ioredis";

let redis = null;

export function getCache() {
  if (process.env.REDIS_URL && !redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
  }
  return redis;
}

export async function getJson(key) {
  const cache = getCache();
  if (!cache) return null;
  const val = await cache.get(key);
  return val ? JSON.parse(val) : null;
}

export async function setJson(key, value, ttlSec = 10) {
  const cache = getCache();
  if (!cache) return;
  await cache.set(key, JSON.stringify(value), "EX", ttlSec);
}
