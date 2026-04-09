import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowSafely } from "@/lib/server/recompute";

const scheduleTaskSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().min(1).optional(),
  tags: z.array(z.string().min(1).max(24)).max(10).optional()
});

function normalizeTags(tags: string[] | undefined) {
  if (!tags) return [] as string[];
  const cleaned = tags.map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const { id } = await params;
    const payload = scheduleTaskSchema.parse(await request.json());

    const task = await prisma.task.findUnique({
      where: { id },
      include: { smartEvent: true }
    });

    if (!task || task.smartEvent.userId !== userId || task.smartEvent.deletedAt) {
      return fail("Task not found", 404);
    }

    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    if (endAt <= startAt) {
      return fail("End time must be after start time");
    }

    const tags = normalizeTags(payload.tags);
    const previousMetadata =
      typeof task.smartEvent.metadata === "object" && task.smartEvent.metadata
        ? (task.smartEvent.metadata as Record<string, unknown>)
        : {};

    const updatedEvent = await prisma.smartEvent.update({
      where: { id: task.smartEventId },
      data: {
        startAt,
        endAt,
        timezone: payload.timezone ?? task.smartEvent.timezone,
        lockState: "BUSY",
        metadata: {
          ...previousMetadata,
          tags,
          scheduledFrom: "calendar-slot"
        } as Prisma.InputJsonValue
      }
    });

    const recompute = await recomputeWindowSafely({
      userId,
      trigger: "USER_CHANGE",
      windowStart: new Date(startAt.getTime() - 12 * 60 * 60_000),
      windowEnd: new Date(endAt.getTime() + 7 * 24 * 60 * 60_000)
    });

    return ok({
      taskId: task.id,
      smartEventId: updatedEvent.id,
      startAt: updatedEvent.startAt,
      endAt: updatedEvent.endAt,
      tags,
      recompute
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to schedule task");
  }
}
