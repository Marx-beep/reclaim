import { z } from "zod";
import { Prisma, SmartEventPriority, SmartEventType, Flexibility, LockState } from "@prisma/client";
import { expandOccurrences } from "@reclaim/recurrence";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/api/response";
import { recomputeWindowSafely } from "@/lib/server/recompute";
import { buildTagMetadata, CATEGORY_TAG_VALUES, normalizeCustomTags } from "@/lib/tags/time-categories";

const createSchema = z.object({
  type: z.nativeEnum(SmartEventType),
  title: z.string().min(1),
  description: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  timezone: z.string().default("UTC"),
  priority: z.nativeEnum(SmartEventPriority).default("P3"),
  flexibility: z.nativeEnum(Flexibility).default("FLEXIBLE"),
  lockState: z.nativeEnum(LockState).default("FREE"),
  dueAt: z.string().datetime().optional(),
  recurrenceRule: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  categoryTag: z.enum(CATEGORY_TAG_VALUES).optional(),
  customTags: z.array(z.string().min(1).max(24)).max(12).optional()
});

export async function GET(request: Request) {
  const userId = await getOrCreateCurrentUserId();
  const url = new URL(request.url);
  const start = url.searchParams.get("start") ? new Date(url.searchParams.get("start") as string) : new Date(Date.now() - 24 * 60 * 60_000);
  const end = url.searchParams.get("end") ? new Date(url.searchParams.get("end") as string) : new Date(Date.now() + 14 * 24 * 60 * 60_000);

  const events = await prisma.smartEvent.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        {
          startAt: { lt: end },
          endAt: { gt: start }
        },
        {
          recurrenceRule: { not: null }
        }
      ]
    },
    orderBy: { startAt: "asc" }
  });

  const expanded = events.flatMap((event) => {
    if (!event.recurrenceRule) {
      return [event];
    }

    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const occurrences = expandOccurrences({
      rrule: event.recurrenceRule,
      dtstart: event.startAt.toISOString(),
      betweenStart: start.toISOString(),
      betweenEnd: end.toISOString()
    });

    return occurrences.map((occurrence) => {
      const occurrenceStart = new Date(occurrence);
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      return {
        ...event,
        id: `${event.id}::${occurrenceStart.toISOString()}`,
        startAt: occurrenceStart,
        endAt: occurrenceEnd,
        metadata: {
          ...(typeof event.metadata === "object" && event.metadata ? (event.metadata as Record<string, unknown>) : {}),
          sourceEventId: event.id,
          isRecurringInstance: true
        }
      };
    });
  });

  expanded.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return ok(expanded);
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.parse(await request.json());
    const userId = await getOrCreateCurrentUserId();
    const customTags = normalizeCustomTags(parsed.customTags);
    const previousMetadata = parsed.metadata ?? {};

    const event = await prisma.smartEvent.create({
      data: {
        userId,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        startAt: new Date(parsed.startAt),
        endAt: new Date(parsed.endAt),
        timezone: parsed.timezone,
        priority: parsed.priority,
        flexibility: parsed.flexibility,
        lockState: parsed.lockState,
        dueAt: parsed.dueAt ? new Date(parsed.dueAt) : null,
        recurrenceRule: parsed.recurrenceRule,
        metadata: buildTagMetadata(previousMetadata, {
          categoryTag: parsed.categoryTag,
          customTags,
          fallbackCategory: "OTHER"
        }) as Prisma.InputJsonValue
      }
    });

    const recompute = await recomputeWindowSafely({
      userId,
      trigger: "USER_CHANGE",
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 7 * 24 * 60 * 60_000)
    });

    return ok({ event, recompute }, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Invalid event payload");
  }
}
