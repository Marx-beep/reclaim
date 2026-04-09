import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowSafely } from "@/lib/server/recompute";
import { buildTagMetadata, CATEGORY_TAG_VALUES, normalizeCustomTags } from "@/lib/tags/time-categories";

const schema = z.object({
  title: z.string().default("Auto Focus Block"),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(25).max(240).default(90),
  timezone: z.string().default("UTC"),
  priority: z.enum(["P1", "P2", "P3", "P4"]).default("P2"),
  categoryTag: z.enum(CATEGORY_TAG_VALUES).optional(),
  customTags: z.array(z.string().min(1).max(24)).max(12).optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const userId = await getOrCreateCurrentUserId();
    const customTags = normalizeCustomTags(parsed.customTags);
    const start = new Date(parsed.startAt);
    const end = new Date(start.getTime() + parsed.durationMinutes * 60_000);

    const focus = await prisma.$transaction(async (tx) => {
      const event = await tx.smartEvent.create({
        data: {
          userId,
          type: "FOCUS",
          title: parsed.title,
          startAt: start,
          endAt: end,
          timezone: parsed.timezone,
          priority: parsed.priority,
          flexibility: "FLEXIBLE",
          lockState: "FREE",
          metadata: buildTagMetadata(undefined, {
            categoryTag: parsed.categoryTag,
            customTags,
            fallbackCategory: "DEEP_WORK"
          }) as Prisma.InputJsonValue
        }
      });

      return tx.focusBlock.create({
        data: {
          smartEventId: event.id,
          minBlockMinutes: Math.min(parsed.durationMinutes, 45),
          maxBlockMinutes: parsed.durationMinutes,
          requiresDeepWork: true
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

    return ok({ focus, recompute }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to create focus block");
  }
}
