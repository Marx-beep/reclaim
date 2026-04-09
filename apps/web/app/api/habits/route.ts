import { z } from "zod";
import { validateRRule } from "@reclaim/recurrence";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowSafely } from "@/lib/server/recompute";

const schema = z.object({
  title: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().default("UTC"),
  rrule: z.string(),
  minDurationMinutes: z.number().int().min(5),
  targetPerWeek: z.number().int().min(1).max(14).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P3")
});

export async function GET() {
  const userId = await getOrCreateCurrentUserId();
  const habits = await prisma.habit.findMany({
    where: { smartEvent: { userId, deletedAt: null } },
    include: { smartEvent: true }
  });
  return ok(habits);
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const validation = validateRRule(parsed.rrule);
    if (!validation.valid) {
      return fail(validation.error ?? "Invalid rrule");
    }

    const userId = await getOrCreateCurrentUserId();

    const habit = await prisma.$transaction(async (tx) => {
      const event = await tx.smartEvent.create({
        data: {
          userId,
          type: "HABIT",
          title: parsed.title,
          startAt: new Date(parsed.startAt),
          endAt: new Date(parsed.endAt),
          timezone: parsed.timezone,
          recurrenceRule: parsed.rrule,
          priority: parsed.priority,
          flexibility: "SEMI_FLEXIBLE"
        }
      });

      return tx.habit.create({
        data: {
          smartEventId: event.id,
          rrule: parsed.rrule,
          minDurationMinutes: parsed.minDurationMinutes,
          targetPerWeek: parsed.targetPerWeek
        },
        include: { smartEvent: true }
      });
    });

    const recompute = await recomputeWindowSafely({
      userId,
      trigger: "USER_CHANGE",
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 7 * 24 * 60 * 60_000)
    });

    return ok({ habit, recompute }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to create habit");
  }
}
