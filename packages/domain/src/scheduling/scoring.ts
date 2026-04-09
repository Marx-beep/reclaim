import type { SmartEventModel } from "../smart-event/types";

const priorityWeight: Record<SmartEventModel["priority"], number> = {
  P1: 100,
  P2: 60,
  P3: 30,
  P4: 10
};

export function baseEventScore(event: SmartEventModel): number {
  let score = priorityWeight[event.priority];

  if (event.type === "TASK" && event.dueAt) {
    const dueMs = Date.parse(event.dueAt);
    const startMs = Date.parse(event.startAt);
    const slackHours = Math.max(0, (dueMs - startMs) / 3_600_000);
    score += Math.max(0, 48 - slackHours);
  }

  if (event.lockState === "HARD_LOCKED") score += 80;
  if (event.lockState === "SOFT_LOCKED") score += 40;

  return score;
}
