import { z } from "zod";
import { ok, fail } from "@/lib/api/response";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { runCalendarSync } from "@/lib/server/calendar-sync";
import { checkQueueRuntimeHealth } from "@/lib/server/queue-runtime";
import { isOpsRequestAuthorized } from "@/lib/server/ops-auth";

const schema = z.object({
  action: z.enum(["sync", "recompute", "analytics-rollup", "cleanup"])
});

export async function POST(request: Request) {
  try {
    if (!isOpsRequestAuthorized(request)) {
      return fail("Unauthorized", 401);
    }

    const userId = await getOrCreateCurrentUserId();
    const parsed = schema.parse(await request.json());

    if (parsed.action === "sync") {
      const result = await runCalendarSync(userId);
      return ok({ action: parsed.action, result });
    }

    const queueHealth = await checkQueueRuntimeHealth();
    if (!queueHealth.bullmqEnabled) {
      return ok({
        action: parsed.action,
        queued: false,
        warning: queueHealth.reason ?? "当前环境不可用队列分发。",
        queueDetails: queueHealth
      });
    }

    const { getAnalyticsRollupQueue, getCleanupQueue, getRescheduleQueue } = await import("@reclaim/queue");

    if (parsed.action === "recompute") {
      const queue = getRescheduleQueue();
      const job = await queue.add("manual-recompute", {
        userId,
        requestedAt: new Date().toISOString(),
        trigger: "MANUAL"
      });
      return ok({
        action: parsed.action,
        queued: true,
        jobId: job.id
      });
    }

    if (parsed.action === "analytics-rollup") {
      const queue = getAnalyticsRollupQueue();
      const job = await queue.add("manual-analytics-rollup", {
        userId,
        requestedAt: new Date().toISOString()
      });
      return ok({
        action: parsed.action,
        queued: true,
        jobId: job.id
      });
    }

    const queue = getCleanupQueue();
    const job = await queue.add("manual-cleanup", {
      userId,
      requestedAt: new Date().toISOString()
    });

    return ok({
      action: parsed.action,
      queued: true,
      jobId: job.id
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Admin action failed", 500);
  }
}
