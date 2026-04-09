import type { LockState, SmartEventModel } from "../smart-event/types";

export interface SchedulingWindow {
  startAt: string;
  endAt: string;
  timezone: string;
}

export interface SchedulingContext {
  userId: string;
  now: string;
  window: SchedulingWindow;
  events: SmartEventModel[];
  busyBlocks: Array<{ startAt: string; endAt: string; source: "GOOGLE" | "OUTLOOK" | "INTERNAL" }>;
  workHours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  constraints: Array<{ kind: string; isHard: boolean; payload: Record<string, unknown> }>;
  lockLeadHours: { soft: number; hard: number };
}

export interface SchedulingMove {
  eventId: string;
  previousStartAt: string;
  previousEndAt: string;
  newStartAt: string;
  newEndAt: string;
  lockStateAfter: LockState;
  scoreDelta: number;
  reason: Record<string, unknown>;
  reasonText: string;
}

export interface SchedulingPreviewResult {
  feasible: boolean;
  score: number;
  moves: SchedulingMove[];
  unscheduledEventIds: string[];
}
