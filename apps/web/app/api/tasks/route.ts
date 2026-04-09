import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowSafely } from "@/lib/server/recompute";
import { buildTagMetadata, CATEGORY_TAG_VALUES, normalizeCustomTags } from "@/lib/tags/time-categories";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  estimateMinutes: z.number().int().min(15),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  dueAt: z.string().datetime(),
  timezone: z.string().default("UTC"),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P2"),
  categoryTag: z.enum(CATEGORY_TAG_VALUES).optional(),
  customTags: z.array(z.string().min(1).max(24)).max(12).optional()
});

export async function GET() {
  const userId = await getOrCreateCurrentUserId();
  const tasks = await prisma.task.findMany({
    where: { smartEvent: { userId, deletedAt: null } },
    include: { smartEvent: true },
    orderBy: { createdAt: "desc" }
  });
  return ok(tasks);
}

export async function POST(request: Request) {
  try {
    const parsed = taskSchema.parse(await request.json());
    const userId = await getOrCreateCurrentUserId();
    const customTags = normalizeCustomTags(parsed.customTags);

    const task = await prisma.$transaction(async (tx) => {
      const event = await tx.smartEvent.create({
        data: {
          userId,
          type: "TASK",
          title: parsed.title,
          description: parsed.description,
          startAt: new Date(parsed.startAt),
          endAt: new Date(parsed.endAt),
          timezone: parsed.timezone,
          priority: parsed.priority,
          dueAt: new Date(parsed.dueAt),
          flexibility: "FLEXIBLE",
          metadata: buildTagMetadata(undefined, {
            categoryTag: parsed.categoryTag,
            customTags,
            fallbackCategory: "WORK"
          }) as Prisma.InputJsonValue
        }
      });

      return tx.task.create({
        data: {
          smartEventId: event.id,
          estimateMinutes: parsed.estimateMinutes,
          remainingMinutes: parsed.estimateMinutes,
          effortScore: 3
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

    return ok({ task, recompute }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to create task");
  }
}
