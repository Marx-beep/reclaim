import { Temporal } from "@js-temporal/polyfill";

export type TaskQuadrant = "importantUrgent" | "importantNotUrgent" | "urgentNotImportant" | "neither";
export type TaskPriority = "P1" | "P2" | "P3" | "P4";

export type QuadrantTask = {
  id: string;
  smartEvent: {
    title: string;
    priority: TaskPriority;
    dueAt: string | null;
    status: "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "MISSED";
  };
};

export type QuadrantBuckets = Record<TaskQuadrant, QuadrantTask[]>;

const URGENT_LEAD_HOURS: Record<TaskPriority, number> = {
  P1: 36,
  P2: 24,
  P3: 12,
  P4: 8
};

function parseDueAt(dueAt: string | null) {
  if (!dueAt) return null;
  try {
    return Temporal.Instant.from(dueAt);
  } catch {
    return null;
  }
}

function dueTimestamp(task: QuadrantTask) {
  const due = parseDueAt(task.smartEvent.dueAt);
  return due ? due.epochMilliseconds : Number.POSITIVE_INFINITY;
}

function isImportant(priority: TaskPriority) {
  return priority === "P1" || priority === "P2";
}

function isUrgent(task: QuadrantTask, now: Temporal.Instant) {
  const due = parseDueAt(task.smartEvent.dueAt);
  if (!due) return false;

  const leadHours = URGENT_LEAD_HOURS[task.smartEvent.priority];
  const threshold = now.add({ hours: leadHours });
  return Temporal.Instant.compare(due, threshold) <= 0;
}

export function classifyTaskQuadrant(task: QuadrantTask, now: Temporal.Instant): TaskQuadrant {
  const important = isImportant(task.smartEvent.priority);
  const urgent = isUrgent(task, now);

  if (important && urgent) return "importantUrgent";
  if (important) return "importantNotUrgent";
  if (urgent) return "urgentNotImportant";
  return "neither";
}

function rebalanceImportantUrgent(input: QuadrantBuckets) {
  const total =
    input.importantUrgent.length +
    input.importantNotUrgent.length +
    input.urgentNotImportant.length +
    input.neither.length;
  if (total <= 1) return input;

  // Keep quadrant-1 visually focused: if too crowded, move least-urgent tail tasks to quadrant-2.
  const maxQ1 = Math.max(1, Math.ceil(total * 0.4));
  if (input.importantUrgent.length <= maxQ1) return input;

  const overflow = [...input.importantUrgent]
    .sort((a, b) => dueTimestamp(a) - dueTimestamp(b))
    .slice(maxQ1);

  const overflowIds = new Set(overflow.map((item) => item.id));
  const kept = input.importantUrgent.filter((item) => !overflowIds.has(item.id));

  return {
    ...input,
    importantUrgent: kept,
    importantNotUrgent: [...overflow, ...input.importantNotUrgent].sort((a, b) => dueTimestamp(a) - dueTimestamp(b))
  };
}

export function buildQuadrantBuckets(tasks: QuadrantTask[], now: Temporal.Instant = Temporal.Now.instant()): QuadrantBuckets {
  const grouped: QuadrantBuckets = {
    importantUrgent: [],
    importantNotUrgent: [],
    urgentNotImportant: [],
    neither: []
  };

  for (const task of tasks) {
    grouped[classifyTaskQuadrant(task, now)].push(task);
  }

  (Object.keys(grouped) as TaskQuadrant[]).forEach((key) => {
    grouped[key].sort((a, b) => dueTimestamp(a) - dueTimestamp(b));
  });

  return rebalanceImportantUrgent(grouped);
}

export function formatDueAtZh(dueAt: string | null, timezone?: string) {
  if (!dueAt) return "无截止时间";
  const due = parseDueAt(dueAt);
  if (!due) return "截止时间格式异常";
  const zone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  return `截止：${due.toZonedDateTimeISO(zone).toLocaleString("zh-CN")}`;
}
