import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  defaultTimezone: z.string(),
  workdayStart: z.string(),
  workdayEnd: z.string(),
  softLockLeadHours: z.number().int().min(1).max(168),
  hardLockLeadHours: z.number().int().min(1).max(168)
});

export async function GET() {
  const userId = await getOrCreateCurrentUserId();

  const policy =
    (await prisma.timePolicy.findUnique({ where: { userId } })) ??
    (await prisma.timePolicy.create({
      data: {
        userId,
        defaultTimezone: "UTC",
        noMeetingWeekdays: []
      }
    }));

  return ok(policy);
}

export async function PUT(request: Request) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const parsed = schema.parse(await request.json());

    const policy = await prisma.timePolicy.upsert({
      where: { userId },
      update: {
        defaultTimezone: parsed.defaultTimezone,
        workdayStart: parsed.workdayStart,
        workdayEnd: parsed.workdayEnd,
        softLockLeadHours: parsed.softLockLeadHours,
        hardLockLeadHours: parsed.hardLockLeadHours
      },
      create: {
        userId,
        defaultTimezone: parsed.defaultTimezone,
        workdayStart: parsed.workdayStart,
        workdayEnd: parsed.workdayEnd,
        softLockLeadHours: parsed.softLockLeadHours,
        hardLockLeadHours: parsed.hardLockLeadHours,
        noMeetingWeekdays: []
      }
    });

    return ok(policy);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to update policy");
  }
}
