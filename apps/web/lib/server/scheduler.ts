import type { SmartEvent } from "@prisma/client";

export function buildSchedulerPayload(input: {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  now?: Date;
  events: SmartEvent[];
  busyBlocks?: Array<{ startAt: Date; endAt: Date; source: string }>;
  workHours?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  timePolicy?: { softLockLeadHours: number; hardLockLeadHours: number };
}) {
  return {
    user_id: input.userId,
    now: (input.now ?? new Date()).toISOString(),
    window_start: input.windowStart.toISOString(),
    window_end: input.windowEnd.toISOString(),
    events: input.events.map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      start_at: event.startAt.toISOString(),
      end_at: event.endAt.toISOString(),
      timezone: event.timezone,
      priority: event.priority,
      flexibility: event.flexibility,
      lock_state: event.lockState,
      due_at: event.dueAt?.toISOString() ?? null,
      metadata: event.metadata ?? {}
    })),
    busy_blocks: (input.busyBlocks ?? []).map((block) => ({
      start_at: block.startAt.toISOString(),
      end_at: block.endAt.toISOString(),
      source: block.source
    })),
    work_hours: input.workHours ?? [],
    buffer_rules: [],
    time_policy: {
      soft_lock_lead_hours: input.timePolicy?.softLockLeadHours ?? 24,
      hard_lock_lead_hours: input.timePolicy?.hardLockLeadHours ?? 4
    }
  };
}

export type SchedulerMove = {
  event_id: string;
  previous_start_at: string;
  previous_end_at: string;
  new_start_at: string;
  new_end_at: string;
  lock_state_after: "FREE" | "BUSY" | "SOFT_LOCKED" | "HARD_LOCKED";
  reason: Record<string, unknown>;
  reason_text: string;
  score_delta: number;
};

export type SchedulerOutput = {
  feasible: boolean;
  solver: string;
  score: number;
  moves: SchedulerMove[];
  unscheduled_event_ids: string[];
  explanations: Record<string, string>;
};

export async function callScheduler(path: string, payload: unknown): Promise<SchedulerOutput> {
  const baseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:8000";
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Scheduler request failed: ${response.status} ${message}`);
  }

  return response.json() as Promise<SchedulerOutput>;
}
