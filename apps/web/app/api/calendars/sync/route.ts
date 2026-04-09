import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { runCalendarSync } from "@/lib/server/calendar-sync";
import { recomputeWindowSafely } from "@/lib/server/recompute";

const bodySchema = z.object({
  force: z.boolean().optional().default(false)
});

export async function POST(request: Request) {
  try {
    await bodySchema.parseAsync(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const result = await runCalendarSync(userId);
    const recompute = await recomputeWindowSafely({
      userId,
      trigger: "CALENDAR_SYNC",
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 7 * 24 * 60 * 60_000)
    });
    return ok({ success: true, ...result, recompute });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Calendar sync failed", 500);
  }
}
