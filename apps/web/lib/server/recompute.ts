import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { buildSchedulerPayload, callScheduler } from "@/lib/server/scheduler";

type RecomputeTrigger = "MANUAL" | "CALENDAR_SYNC" | "USER_CHANGE" | "POLICY_CHANGE" | "WEBHOOK" | "SYSTEM";

type RecomputeInput = {
  userId: string;
  trigger: RecomputeTrigger;
  windowStart?: Date;
  windowEnd?: Date;
  triggerRef?: string | null;
};

async function loadSchedulingContext(userId: string, windowStart: Date, windowEnd: Date) {
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

  return buildSchedulerPayload({
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
}

export async function previewWindowForUser(input: RecomputeInput) {
  const windowStart = input.windowStart ?? new Date();
  const windowEnd = input.windowEnd ?? new Date(windowStart.getTime() + 7 * 24 * 60 * 60_000);

  const payload = await loadSchedulingContext(input.userId, windowStart, windowEnd);
  const result = await callScheduler("/schedule/preview", payload);
  return { windowStart, windowEnd, result };
}

export async function recomputeWindowForUser(input: RecomputeInput) {
  const windowStart = input.windowStart ?? new Date();
  const windowEnd = input.windowEnd ?? new Date(windowStart.getTime() + 7 * 24 * 60 * 60_000);

  const payload = await loadSchedulingContext(input.userId, windowStart, windowEnd);

  const job = await prisma.rescheduleJob.create({
    data: {
      userId: input.userId,
      triggerType: input.trigger,
      triggerRef: input.triggerRef ?? null,
      windowStart,
      windowEnd,
      status: "RUNNING",
      startedAt: new Date()
    }
  });

  const result = await callScheduler("/schedule/recompute-window", payload);

  await prisma.$transaction(async (tx) => {
    for (const move of result.moves) {
      await tx.smartEvent.update({
        where: { id: move.event_id },
        data: {
          startAt: new Date(move.new_start_at),
          endAt: new Date(move.new_end_at),
          lockState: move.lock_state_after
        }
      });

      await tx.schedulingDecision.create({
        data: {
          userId: input.userId,
          smartEventId: move.event_id,
          rescheduleJobId: job.id,
          decisionType: "MOVE",
          previousStartAt: new Date(move.previous_start_at),
          previousEndAt: new Date(move.previous_end_at),
          newStartAt: new Date(move.new_start_at),
          newEndAt: new Date(move.new_end_at),
          scoreDelta: move.score_delta,
          reason: move.reason as Prisma.InputJsonValue,
          reasonText: move.reason_text
        }
      });
    }

    await tx.rescheduleJob.update({
      where: { id: job.id },
      data: {
        status: result.feasible ? "SUCCEEDED" : "PARTIAL",
        finishedAt: new Date(),
        stats: {
          score: result.score,
          moves: result.moves.length,
          unscheduled: result.unscheduled_event_ids.length
        }
      }
    });
  });

  return { jobId: job.id, result };
}

export async function recomputeWindowSafely(input: RecomputeInput) {
  try {
    return await recomputeWindowForUser(input);
  } catch (error) {
    return {
      jobId: null,
      error: error instanceof Error ? error.message : "Recompute failed"
    };
  }
}
