import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { fail, ok } from "@/lib/api/response";
import { previewWindowForUser, recomputeWindowForUser } from "@/lib/server/recompute";

const schema = z.object({
  mode: z.enum(["PREVIEW", "COMMIT"]).default("COMMIT"),
  trigger: z.enum(["MANUAL", "CALENDAR_SYNC", "USER_CHANGE", "POLICY_CHANGE", "WEBHOOK", "SYSTEM"]).default("MANUAL"),
  reason: z.string().trim().max(200).optional(),
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  horizonHours: z.number().int().min(1).max(24 * 30).default(24 * 7),
  impactedEventIds: z.array(z.string().min(1)).max(50).optional(),
  expandBeforeHours: z.number().int().min(0).max(24 * 7).default(12),
  expandAfterHours: z.number().int().min(0).max(24 * 14).default(72)
});

type WindowParams = z.infer<typeof schema>;

function resolveWindow(now: Date, parsed: WindowParams, impactedEvents: Array<{ startAt: Date; endAt: Date }>) {
  if (parsed.windowStart && parsed.windowEnd) {
    return {
      windowStart: new Date(parsed.windowStart),
      windowEnd: new Date(parsed.windowEnd),
      source: "explicit"
    };
  }

  if (impactedEvents.length > 0) {
    const minStart = impactedEvents.reduce(
      (acc, item) => (item.startAt.getTime() < acc.getTime() ? item.startAt : acc),
      impactedEvents[0].startAt
    );
    const maxEnd = impactedEvents.reduce(
      (acc, item) => (item.endAt.getTime() > acc.getTime() ? item.endAt : acc),
      impactedEvents[0].endAt
    );

    return {
      windowStart: new Date(minStart.getTime() - parsed.expandBeforeHours * 60 * 60_000),
      windowEnd: new Date(maxEnd.getTime() + parsed.expandAfterHours * 60 * 60_000),
      source: "impacted-events"
    };
  }

  return {
    windowStart: now,
    windowEnd: new Date(now.getTime() + parsed.horizonHours * 60 * 60_000),
    source: "horizon"
  };
}

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    if ((parsed.windowStart && !parsed.windowEnd) || (!parsed.windowStart && parsed.windowEnd)) {
      return fail("windowStart and windowEnd must be provided together", 400);
    }

    const impactedEvents = parsed.impactedEventIds?.length
      ? await prisma.smartEvent.findMany({
          where: {
            userId,
            id: { in: parsed.impactedEventIds },
            deletedAt: null
          },
          select: { id: true, startAt: true, endAt: true }
        })
      : [];

    if (parsed.impactedEventIds?.length && impactedEvents.length === 0) {
      return fail("No impacted events found for current user", 404);
    }

    const now = new Date();
    const { windowStart, windowEnd, source } = resolveWindow(now, parsed, impactedEvents);
    if (windowEnd <= windowStart) {
      return fail("windowEnd must be greater than windowStart", 400);
    }

    const triggerRef = parsed.reason ? `dynamic-replan:${parsed.reason}` : "dynamic-replan";
    if (parsed.mode === "PREVIEW") {
      const preview = await previewWindowForUser({
        userId,
        trigger: parsed.trigger,
        windowStart,
        windowEnd,
        triggerRef
      });
      return ok({
        mode: "PREVIEW",
        window: {
          startAt: preview.windowStart.toISOString(),
          endAt: preview.windowEnd.toISOString(),
          source
        },
        impactedEventCount: impactedEvents.length,
        result: preview.result
      });
    }

    const recomputed = await recomputeWindowForUser({
      userId,
      trigger: parsed.trigger,
      windowStart,
      windowEnd,
      triggerRef
    });

    return ok({
      mode: "COMMIT",
      jobId: recomputed.jobId,
      window: {
        startAt: windowStart.toISOString(),
        endAt: windowEnd.toISOString(),
        source
      },
      impactedEventCount: impactedEvents.length,
      result: recomputed.result
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Dynamic replan failed", 500);
  }
}
