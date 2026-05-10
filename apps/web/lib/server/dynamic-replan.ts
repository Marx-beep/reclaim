import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { previewWindowForUser, recomputeWindowForUser } from "@/lib/server/recompute";

export const dynamicReplanParamsSchema = z.object({
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

export type DynamicReplanParams = z.infer<typeof dynamicReplanParamsSchema>;

function resolveWindow(now: Date, parsed: DynamicReplanParams, impactedEvents: Array<{ startAt: Date; endAt: Date }>) {
  if (parsed.windowStart && parsed.windowEnd) {
    return {
      windowStart: new Date(parsed.windowStart),
      windowEnd: new Date(parsed.windowEnd),
      source: "explicit" as const
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
      source: "impacted-events" as const
    };
  }

  return {
    windowStart: now,
    windowEnd: new Date(now.getTime() + parsed.horizonHours * 60 * 60_000),
    source: "horizon" as const
  };
}

export async function executeDynamicReplan(userId: string, parsed: DynamicReplanParams) {
  if ((parsed.windowStart && !parsed.windowEnd) || (!parsed.windowStart && parsed.windowEnd)) {
    return { ok: false as const, status: 400, message: "windowStart and windowEnd must be provided together" };
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
    return { ok: false as const, status: 404, message: "No impacted events found for current user" };
  }

  const now = new Date();
  const { windowStart, windowEnd, source } = resolveWindow(now, parsed, impactedEvents);
  if (windowEnd <= windowStart) {
    return { ok: false as const, status: 400, message: "windowEnd must be greater than windowStart" };
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

    return {
      ok: true as const,
      payload: {
        mode: "PREVIEW",
        window: {
          startAt: preview.windowStart.toISOString(),
          endAt: preview.windowEnd.toISOString(),
          source
        },
        impactedEventCount: impactedEvents.length,
        result: preview.result
      }
    };
  }

  const recomputed = await recomputeWindowForUser({
    userId,
    trigger: parsed.trigger,
    windowStart,
    windowEnd,
    triggerRef
  });

  return {
    ok: true as const,
    payload: {
      mode: "COMMIT",
      jobId: recomputed.jobId,
      window: {
        startAt: windowStart.toISOString(),
        endAt: windowEnd.toISOString(),
        source
      },
      impactedEventCount: impactedEvents.length,
      result: recomputed.result
    }
  };
}
