import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { buildSchedulerPayload, callScheduler } from "@/lib/server/scheduler";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  horizonDays: z.number().int().min(1).max(30).default(7)
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const windowStart = new Date();
    const windowEnd = new Date(windowStart.getTime() + parsed.horizonDays * 24 * 60 * 60_000);

    const [events, policy, workHours] = await Promise.all([
      prisma.smartEvent.findMany({
        where: {
          userId,
          deletedAt: null,
          startAt: { lt: windowEnd },
          endAt: { gt: windowStart }
        }
      }),
      prisma.timePolicy.findUnique({ where: { userId } }),
      prisma.workHourRule.findMany({ where: { userId, enabled: true, deletedAt: null } })
    ]);

    const payload = buildSchedulerPayload({
      userId,
      windowStart,
      windowEnd,
      events,
      workHours: workHours.map((item) => ({ dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.endTime })),
      timePolicy: {
        softLockLeadHours: policy?.softLockLeadHours ?? 24,
        hardLockLeadHours: policy?.hardLockLeadHours ?? 4
      }
    });

    const result = await callScheduler("/schedule/preview", payload);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Scheduling preview failed", 500);
  }
}
