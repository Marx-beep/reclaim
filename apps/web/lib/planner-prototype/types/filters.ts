import type { CalendarEvent, EventPriority, EnergyLevel, EventType } from "./calendar";

export type FilterEventType = "focus" | "task" | "meeting" | "other" | "free" | "locked";

export type FilterPriority = "P1" | "P2" | "P3" | "P4";

export type FilterEnergy = "high" | "medium" | "low";

export type FilterDueDate = "today" | "thisWeek" | "overdue" | "none";

export type FilterScheduleStatus = "scheduled" | "unscheduled" | "locked" | "flexible";

export interface FilterState {
  eventTypes: FilterEventType[];
  priorities: FilterPriority[];
  energies: FilterEnergy[];
  dueDates: FilterDueDate[];
  scheduleStatuses: FilterScheduleStatus[];
}

export const DEFAULT_FILTER_STATE: FilterState = {
  eventTypes: [],
  priorities: [],
  energies: [],
  dueDates: [],
  scheduleStatuses: []
};

export interface FilterOptions {
  eventTypes: readonly { value: FilterEventType; label: string }[];
  priorities: readonly { value: FilterPriority; label: string }[];
  energies: readonly { value: FilterEnergy; label: string }[];
  dueDates: readonly { value: FilterDueDate; label: string }[];
  scheduleStatuses: readonly { value: FilterScheduleStatus; label: string }[];
}

export const FILTER_OPTIONS: FilterOptions = {
  eventTypes: [
    { value: "focus", label: "专注任务" },
    { value: "task", label: "个人任务" },
    { value: "meeting", label: "团队会议" },
    { value: "other", label: "其他工作" },
    { value: "free", label: "空闲时间" },
    { value: "locked", label: "锁定日程" }
  ],
  priorities: [
    { value: "P1", label: "P1 紧急" },
    { value: "P2", label: "P2 重要" },
    { value: "P3", label: "P3 常规" },
    { value: "P4", label: "P4 低优先级" }
  ],
  energies: [
    { value: "high", label: "高能量" },
    { value: "medium", label: "中能量" },
    { value: "low", label: "低能量" }
  ],
  dueDates: [
    { value: "today", label: "今天截止" },
    { value: "thisWeek", label: "本周截止" },
    { value: "overdue", label: "已逾期" },
    { value: "none", label: "无截止日期" }
  ],
  scheduleStatuses: [
    { value: "scheduled", label: "已排程" },
    { value: "unscheduled", label: "未排程" },
    { value: "locked", label: "已锁定" },
    { value: "flexible", label: "可自动调整" }
  ]
};

export function mapEventTypeToFilterType(type: EventType): FilterEventType {
  if (type === "focus") return "focus";
  if (type === "task") return "task";
  if (type === "meeting") return "meeting";
  return "other";
}

export function isFilterActive(filterState: FilterState): boolean {
  return (
    filterState.eventTypes.length > 0 ||
    filterState.priorities.length > 0 ||
    filterState.energies.length > 0 ||
    filterState.dueDates.length > 0 ||
    filterState.scheduleStatuses.length > 0
  );
}

export function getActiveFilterCount(filterState: FilterState): number {
  return (
    filterState.eventTypes.length +
    filterState.priorities.length +
    filterState.energies.length +
    filterState.dueDates.length +
    filterState.scheduleStatuses.length
  );
}
