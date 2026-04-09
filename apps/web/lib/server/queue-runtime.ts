import IORedis from "ioredis";

export type QueueHealthStatus = "up" | "degraded" | "down";
export type QueueMode = "auto" | "enabled" | "disabled";

export type QueueRuntimeHealth = {
  status: QueueHealthStatus;
  mode: QueueMode;
  redisVersion: string | null;
  bullmqEnabled: boolean;
  reason: string | null;
};

const MIN_REDIS_MAJOR_FOR_BULLMQ = 6;

function parseQueueMode(raw: string | undefined): QueueMode {
  const value = raw?.toLowerCase();
  if (value === "enabled") return "enabled";
  if (value === "disabled") return "disabled";
  return "auto";
}

function parseRedisMajor(version: string | null): number | null {
  if (!version) return null;
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  return Number.isNaN(major) ? null : major;
}

function readRedisVersion(info: string): string | null {
  const line = info
    .split("\n")
    .find((item) => item.startsWith("redis_version:"));
  return line?.split(":")[1]?.trim() ?? null;
}

export async function checkQueueRuntimeHealth(): Promise<QueueRuntimeHealth> {
  const mode = parseQueueMode(process.env.QUEUE_MODE);

  if (mode === "disabled") {
    return {
      status: "degraded",
      mode,
      redisVersion: null,
      bullmqEnabled: false,
      reason: "队列模式已在配置中禁用。"
    };
  }

  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  try {
    await redis.ping();
    const info = await redis.info("server");
    const redisVersion = readRedisVersion(info);
    const major = parseRedisMajor(redisVersion);

    if (major !== null && major < MIN_REDIS_MAJOR_FOR_BULLMQ) {
      return {
        status: "degraded",
        mode,
        redisVersion,
        bullmqEnabled: false,
        reason: `Redis ${redisVersion} 低于 ${MIN_REDIS_MAJOR_FOR_BULLMQ}.x，已自动禁用 BullMQ 分发。`
      };
    }

    return {
      status: "up",
      mode,
      redisVersion,
      bullmqEnabled: true,
      reason: null
    };
  } catch (error) {
    return {
      status: "down",
      mode,
      redisVersion: null,
      bullmqEnabled: false,
      reason: error instanceof Error ? error.message : "Redis 连接失败"
    };
  } finally {
    redis.disconnect();
  }
}
