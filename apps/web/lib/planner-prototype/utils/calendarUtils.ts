import { addDays, format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { CalendarEvent, EventPriority, TaskItem } from "../types/calendar";

export const WORK_DAY_START = 8;
export const WORK_DAY_END = 19;
export const WORKING_HOURS_PER_WEEK = (WORK_DAY_END - WORK_DAY_START) * 7;
export const HOUR_HEIGHT = 72;
export const TODAY_INDEX = 1;

export const PRIORITY_WEIGHT: Record<EventPriority, number> = {
  P1: 4,
  P2: 3,
  P3: 2,
  P4: 1
};

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function snapToQuarterHour(hour: number) {
  return Math.round(hour * 4) / 4;
}

export function clampStartHour(startHour: number, duration: number) {
  return Math.min(Math.max(startHour, WORK_DAY_START), WORK_DAY_END - duration);
}

export function getEventEndHour(event: Pick<CalendarEvent, "startHour" | "duration">) {
  return Number((event.startHour + event.duration).toFixed(2));
}

export function hasConflict(
  eventA: Pick<CalendarEvent, "id" | "day" | "startHour" | "duration">,
  eventB: Pick<CalendarEvent, "id" | "day" | "startHour" | "duration">
) {
  if (eventA.id === eventB.id || eventA.day !== eventB.day) {
    return false;
  }

  return eventA.startHour < getEventEndHour(eventB) && eventB.startHour < getEventEndHour(eventA);
}

export function isActiveEvent(event: CalendarEvent) {
  return event.status !== "completed" && event.status !== "unscheduled";
}

export function isMovableEvent(event: CalendarEvent) {
  return event.movable && !event.fixed && event.status !== "completed" && event.status !== "unscheduled";
}

export function priorityLabel(priority: EventPriority) {
  return {
    P1: "P1 紧急",
    P2: "P2 重要",
    P3: "P3 常规",
    P4: "P4 低优先级"
  }[priority];
}

export function energyLabel(level: TaskItem["energyLevel"] | CalendarEvent["energyLevel"]) {
  return {
    high: "高能量",
    medium: "中能量",
    low: "低能量"
  }[level];
}

export function formatTime(hour: number) {
  const safe = snapToQuarterHour(hour);
  const baseHours = Math.floor(safe);
  const minutes = Math.round((safe - baseHours) * 60);
  return `${String(baseHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatEventTimeRange(event: Pick<CalendarEvent, "startHour" | "duration">) {
  return `${formatTime(event.startHour)} - ${formatTime(getEventEndHour(event))}`;
}

export function formatWeekRange(start: Date) {
  const end = addDays(start, 6);
  return `${format(start, "M月d日", { locale: zhCN })} - ${format(end, "M月d日 yyyy年", { locale: zhCN })}`;
}

export function buildHeaderDays(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      index,
      date,
      dayLabel: format(date, "EEE", { locale: zhCN }),
      dateLabel: format(date, "d")
    };
  });
}

export function sortEventsForDisplay(events: CalendarEvent[]) {
  return [...events].sort((a, b) => a.day - b.day || a.startHour - b.startHour || b.duration - a.duration);
}

export function findOpenWindowsForDay(events: CalendarEvent[], day: number, minDuration = 0.5, maxResults = 4) {
  const dayEvents = sortEventsForDisplay(events)
    .filter((event) => event.day === day && isActiveEvent(event))
    .sort((a, b) => a.startHour - b.startHour);

  const windows: Array<{ startHour: number; endHour: number; duration: number }> = [];
  let cursor = WORK_DAY_START;

  for (const event of dayEvents) {
    if (event.startHour - cursor >= minDuration) {
      windows.push({
        startHour: cursor,
        endHour: event.startHour,
        duration: Number((event.startHour - cursor).toFixed(2))
      });
    }
    cursor = Math.max(cursor, getEventEndHour(event));
  }

  if (WORK_DAY_END - cursor >= minDuration) {
    windows.push({
      startHour: cursor,
      endHour: WORK_DAY_END,
      duration: Number((WORK_DAY_END - cursor).toFixed(2))
    });
  }

  return windows.slice(0, maxResults);
}

export function findNextAvailableSlot(
  events: CalendarEvent[],
  day: number,
  duration: number,
  options?: {
    excludeId?: string;
    preferredHours?: number[];
  }
) {
  const preferredHours = options?.preferredHours ?? [];

  const candidateHours = [
    ...preferredHours.map((hour) => snapToQuarterHour(hour)),
    ...Array.from({ length: Math.floor((WORK_DAY_END - WORK_DAY_START) * 4) + 1 }, (_, index) => WORK_DAY_START + index * 0.25)
  ];

  for (const hour of candidateHours) {
    const startHour = clampStartHour(hour, duration);
    const candidate = {
      id: options?.excludeId ?? "__candidate__",
      day,
      startHour,
      duration
    };

    const conflicting = events.some(
      (event) => event.id !== options?.excludeId && isActiveEvent(event) && hasConflict(candidate, event)
    );

    if (!conflicting) {
      return startHour;
    }
  }

  return null;
}

export function findTaskByEvent(tasks: TaskItem[], event: CalendarEvent | null) {
  if (!event?.taskId) {
    return null;
  }

  return tasks.find((task) => task.id === event.taskId) ?? null;
}

export function formatHours(value: number) {
  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2).replace(/0$/, "");
  return `${rounded} 小时`;
}
