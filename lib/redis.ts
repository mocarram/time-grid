import Redis from "ioredis";

let redis: Redis;

declare global {
  var __redis: Redis | undefined;
}

// This is to prevent multiple Redis connections in development
if (process.env.NODE_ENV === "production") {
  redis = new Redis(process.env.REDIS_URL!);
} else {
  if (!global.__redis) {
    global.__redis = new Redis(process.env.REDIS_URL!);
  }
  redis = global.__redis;
}

// Handle Redis connection events
redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("error", err => {
  console.error("❌ Redis connection error:", err);
});

redis.on("ready", () => {
  console.log("🚀 Redis is ready");
});

export { redis };
