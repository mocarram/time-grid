// Redis client singleton with graceful degradation when REDIS_URL is missing.
// In production we keep one shared connection; in dev we reuse via globalThis
// to survive HMR.

import Redis, { type Redis as RedisClient } from "ioredis";

import { logger } from "@infra/logger/index";

const log = logger.scoped("redis");

declare global {
  // eslint-disable-next-line no-var
  var __tg_redis: RedisClient | undefined;
}

let cached: RedisClient | null = null;

export function getRedis(): RedisClient | null {
  if (cached) return cached;
  if (globalThis.__tg_redis) {
    cached = globalThis.__tg_redis;
    return cached;
  }
  const url = process.env.REDIS_URL;
  if (!url) {
    log.warn("REDIS_URL not set; cloud sync disabled");
    return null;
  }
  try {
    const client = new Redis(url, {
      lazyConnect: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
    });
    client.on("error", (err) => log.error("redis error", { error: String(err) }));
    cached = client;
    if (process.env.NODE_ENV !== "production") {
      globalThis.__tg_redis = client;
    }
    return client;
  } catch (e) {
    log.error("failed to construct redis client", { error: String(e) });
    return null;
  }
}
