import { z } from "zod";

export const frontendScheduleItemSchema = z.object({
  id: z.string().optional(),
  taskId: z.string().optional(),
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  priority: z.string().optional(),
  status: z.string().optional(),
  deadline: z.string().optional(),
  kind: z.string().optional(),
  project: z.string().optional(),
  isLowLoad: z.boolean().optional(),
  is_low_load: z.boolean().optional(),
  locked: z.boolean().optional(),
  fixed: z.boolean().optional(),
  flexible: z.boolean().optional(),
  movable: z.boolean().optional(),
  scheduleMode: z.enum(["fixed", "flexible"]).optional()
});

export const frontendReplanSchema = z.object({
  type: z.enum(["task_delayed", "task_finished_early", "task_moved", "task_resized", "task_added", "task_deleted", "burnout"]),
  taskId: z.string().optional(),
  delayMinutes: z.number().int().min(1).optional(),
  earlyMinutes: z.number().int().min(1).optional(),
  newStart: z.string().optional(),
  newEnd: z.string().optional(),
  durationMinutes: z.number().int().min(1).optional(),
  currentSchedule: z.array(frontendScheduleItemSchema).default([]),
  newTask: frontendScheduleItemSchema.optional(),
  at: z.string().optional(),
  useAi: z.boolean().default(true),
  fallbackToLocal: z.boolean().default(true),
  userInstruction: z.string().max(1200).optional(),
  baseDate: z.string().optional()
});

export type FrontendReplanInput = z.infer<typeof frontendReplanSchema>;

const priorityMap: Record<string, "S" | "A" | "B" | "C"> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  P1: "A",
  P2: "B",
  P3: "B",
  P4: "C"
};

function isTimeOnly(value: string) {
  return /^\d{1,2}:\d{2}$/.test(value.trim());
}

function normalizeDatePart(baseDate?: string) {
  if (baseDate && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)) return baseDate;
  return new Date().toISOString().slice(0, 10);
}

export function normalizeDateTime(value: string | undefined, baseDate?: string) {
  if (!value) return undefined;
  if (isTimeOnly(value)) return `${normalizeDatePart(baseDate)}T${value.padStart(5, "0")}:00`;
  return value;
}

export function toDisplayTime(value: string) {
  const localIsoMatch = value.match(/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})(?::\d{2})?$/);
  if (localIsoMatch) return localIsoMatch[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(11, 16);
}

function normalizePriority(priority: string | undefined, locked: boolean | undefined) {
  if (locked) return "S";
  return priorityMap[(priority ?? "B").toUpperCase()] ?? "B";
}

function isFixedScheduleItem(item: z.infer<typeof frontendScheduleItemSchema>) {
  return (
    item.locked === true ||
    item.fixed === true ||
    item.scheduleMode === "fixed" ||
    item.movable === false ||
    item.flexible === false
  );
}

function normalizeStatus(status: string | undefined) {
  if (!status) return "not_started";
  const normalized = status.toLowerCase();
  if (normalized === "done" || normalized === "completed") return "completed";
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "expired") return "expired";
  return "not_started";
}

export function toRuleEnginePayload(input: FrontendReplanInput) {
  const schedule = input.currentSchedule.map((item, index) => ({
    id: item.id ?? item.taskId ?? `task_${index + 1}`,
    title: item.title,
    start: normalizeDateTime(item.start, input.baseDate),
    end: normalizeDateTime(item.end, input.baseDate),
    priority: normalizePriority(item.priority, isFixedScheduleItem(item)),
    status: normalizeStatus(item.status),
    deadline: normalizeDateTime(item.deadline, input.baseDate),
    kind: item.kind ?? "work",
    is_low_load: item.is_low_load ?? item.isLowLoad ?? false,
    project: item.project,
    locked: isFixedScheduleItem(item)
  }));

  const event: Record<string, unknown> = {
    type: input.type,
    taskId: input.taskId,
    delayMinutes: input.delayMinutes,
    earlyMinutes: input.earlyMinutes,
    newStart: normalizeDateTime(input.newStart, input.baseDate),
    newEnd: normalizeDateTime(input.newEnd, input.baseDate),
    durationMinutes: input.durationMinutes,
    at: normalizeDateTime(input.at, input.baseDate)
  };

  if (input.newTask) {
    event.newTask = {
      id: input.newTask.id ?? input.newTask.taskId ?? "new_task",
      title: input.newTask.title,
      start: normalizeDateTime(input.newTask.start, input.baseDate),
      end: normalizeDateTime(input.newTask.end, input.baseDate),
      priority: normalizePriority(input.newTask.priority, isFixedScheduleItem(input.newTask)),
      status: normalizeStatus(input.newTask.status),
      deadline: normalizeDateTime(input.newTask.deadline, input.baseDate),
      kind: input.newTask.kind ?? "work",
      is_low_load: input.newTask.is_low_load ?? input.newTask.isLowLoad ?? false,
      project: input.newTask.project,
      locked: isFixedScheduleItem(input.newTask)
    };
  }

  return { schedule, event };
}

export function preserveFixedSchedule(input: FrontendReplanInput, schedule: Array<{ start: string; end: string; title: string }>) {
  const fixedItems = input.currentSchedule.filter(isFixedScheduleItem);
  if (fixedItems.length === 0) return schedule;

  const mutable = schedule.filter((item) => {
    return !fixedItems.some((fixed) => {
      const sameId = Boolean(fixed.id && item.title.includes(fixed.id));
      const sameTaskId = Boolean(fixed.taskId && item.title.includes(fixed.taskId));
      const sameTitle = item.title.trim() === fixed.title.trim();
      return sameId || sameTaskId || sameTitle;
    });
  });

  return [
    ...fixedItems.map((item) => ({
      start: toDisplayTime(normalizeDateTime(item.start, input.baseDate) ?? item.start),
      end: toDisplayTime(normalizeDateTime(item.end, input.baseDate) ?? item.end),
      title: item.title
    })),
    ...mutable
  ];
}

export function fromRuleEngineResponse(response: {
  newSchedule?: Array<{ start: string; end: string; title: string }>;
  explanation?: string;
  messages?: string[];
}) {
  return {
    newSchedule: (response.newSchedule ?? []).map((item) => ({
      start: toDisplayTime(item.start),
      end: toDisplayTime(item.end),
      title: item.title
    })),
    explanation: response.explanation ?? response.messages?.[0] ?? "系统已根据任务变化重新安排后续时间块。"
  };
}
