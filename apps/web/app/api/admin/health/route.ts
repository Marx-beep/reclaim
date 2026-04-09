import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/server/db";
import { checkQueueRuntimeHealth } from "@/lib/server/queue-runtime";
import { isOpsRequestAuthorized } from "@/lib/server/ops-auth";

export async function GET(request: Request) {
  if (!isOpsRequestAuthorized(request)) {
    return fail("Unauthorized", 401);
  }

  const startedAt = Date.now();

  let db = "down";
  let scheduler = "down";
  let queue = "down";

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "up";
  } catch {
    db = "down";
  }

  try {
    const baseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:8000";
    const response = await fetch(`${baseUrl}/health`);
    scheduler = response.ok ? "up" : "down";
  } catch {
    scheduler = "down";
  }

  const queueHealth = await checkQueueRuntimeHealth();
  queue = queueHealth.status;

  return ok({
    db,
    scheduler,
    queue,
    queueDetails: queueHealth,
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    versions: {
      app: "0.1.0-mvp",
      scheduler: "heuristics-v1"
    }
  });
}
