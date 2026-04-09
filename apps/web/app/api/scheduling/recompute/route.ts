import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowForUser } from "@/lib/server/recompute";

const schema = z.object({
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  trigger: z.enum(["MANUAL", "CALENDAR_SYNC", "USER_CHANGE", "POLICY_CHANGE", "WEBHOOK", "SYSTEM"]).default("MANUAL")
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const windowStart = parsed.windowStart ? new Date(parsed.windowStart) : new Date();
    const windowEnd = parsed.windowEnd ? new Date(parsed.windowEnd) : new Date(windowStart.getTime() + 7 * 24 * 60 * 60_000);

    const recomputed = await recomputeWindowForUser({
      userId,
      trigger: parsed.trigger,
      windowStart,
      windowEnd
    });

    const queueWarning = "当前为本地直连执行，已跳过队列分发。";

    return ok({ jobId: recomputed.jobId, result: recomputed.result, queueWarning });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Recompute failed", 500);
  }
}
