export type EventType = "focus" | "task" | "meeting" | "habit" | "break" | "buffer";

export type EventPriority = "P1" | "P2" | "P3" | "P4";

export type EventStatus = "scheduled" | "completed" | "interrupted" | "overtime" | "unscheduled";

export type EnergyLevel = "high" | "medium" | "low";

export type NavigationSection =
  | "Planner"
  | "Tasks"
  | "Habits"
  | "Focus"
  | "Meetings"
  | "Links"
  | "Sync"
  | "Analytics"
  | "Settings";

export interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  startHour: number;
  duration: number;
  type: EventType;
  priority: EventPriority;
  status: EventStatus;
  movable: boolean;
  fixed: boolean;
  flexible: boolean;
  energyLevel: EnergyLevel;
  aiGenerated: boolean;
  taskId?: string;
  splitFromId?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  priority: EventPriority;
  dueDate: string;
  dueDay: number;
  dueHour: number;
  estimatedMinutes: number;
  remainingMinutes: number;
  status: "unscheduled" | "scheduled" | "completed";
  upNext: boolean;
  energyLevel: EnergyLevel;
  splittable: boolean;
}

export interface HabitItem {
  id: string;
  name: string;
  frequency: "每天" | "工作日" | "每周三次";
  durationHours: number;
  preferredStartHour: number;
  preferredEndHour: number;
  weeklyTarget: number;
  completedCount: number;
  priority: EventPriority;
  active: boolean;
}

export interface FocusPlan {
  weeklyTargetHours: number;
  protectedHours: number;
  protectedEventIds: string[];
}

export interface SmartMeetingItem {
  id: string;
  title: string;
  attendees: string[];
  frequency: "一次性" | "每周" | "每两周";
  durationHours: number;
  priority: EventPriority;
  scheduledDay: number;
  scheduledHour: number;
  conflictStatus: "正常" | "冲突" | "待安排";
  active: boolean;
  linkedEventId?: string;
}

export interface SchedulingLinkItem {
  id: string;
  name: string;
  durationHours: number;
  rangeStartHour: number;
  rangeEndHour: number;
  priority: EventPriority;
  enabled: boolean;
  url: string;
}

export interface CalendarConnectionItem {
  id: string;
  name: string;
  provider: "Google" | "Outlook" | "Internal";
  status: "已同步" | "待授权" | "失败";
  privacy: "显示详情" | "仅显示忙碌" | "隐藏";
  lastSynced: string;
}

export interface PlannerSuggestion {
  id: string;
  title: string;
  description: string;
  action:
    | { kind: "focus_slot"; day: number; startHour: number }
    | { kind: "insert_buffer"; day: number; startHour: number }
    | { kind: "rebalance"; targetEventId?: string }
    | { kind: "urgent"; title: string };
}

export interface QuickTaskInput {
  title: string;
  durationHours: number;
  priority: EventPriority;
  urgent: boolean;
  energyLevel: EnergyLevel;
  targetDay?: number;
  targetStartHour?: number;
  pinToSlot?: boolean;
}

export interface AiLog {
  id: string;
  time: string;
  action: string;
  summary: string;
  changes: string[];
  warnings: string[];
}

export interface GiveUpFeedbackStep {
  id: string;
  label: string;
  title: string;
  detail: string;
  startHour: number;
  endHour?: number;
  tone: "focus" | "recovery" | "light" | "resume";
}

export interface GiveUpFeedback {
  sourceEventId: string;
  sourceTitle: string;
  day: number;
  dayLabel: string;
  originalStartHour: number;
  originalEndHour: number;
  originalFocusMinutes: number;
  immediateFocusMinutes: number;
  recoveryMinutes: number;
  lightTaskMinutes: number;
  resumedAtHour: number;
  affectedTaskCount: number;
  steps: GiveUpFeedbackStep[];
  changes: string[];
  warnings: string[];
}

export interface PlannerSettings {
  workStart: number;
  workEnd: number;
  lunchStart: number;
  lunchEnd: number;
  bufferMinutes: number;
  replanMode: "conservative" | "balanced" | "aggressive";
  maxFocusBlockMinutes: number;
  allowSplitTasks: boolean;
  autoLockTimeBlocks: boolean;
  defaultTaskPriority: EventPriority;
  calendarColorStyle: "柔和" | "高对比";
  lowLoadTaskPreference: string;
}

export type ReplanActionKind =
  | "drag"
  | "resize"
  | "complete"
  | "early_complete"
  | "overtime"
  | "give_up"
  | "delete"
  | "add_task"
  | "add_urgent_task"
  | "auto_schedule"
  | "insert_buffer"
  | "rebalance";

export interface ReplanAction {
  kind: ReplanActionKind;
  eventId?: string;
  taskId?: string;
  day?: number;
  startHour?: number;
  duration?: number;
  currentTimeHour?: number;
  completedAtHour?: number;
  title?: string;
  priority?: EventPriority;
  dueDay?: number;
  dueHour?: number;
  energyLevel?: EnergyLevel;
  focusDay?: number;
  pinToSlot?: boolean;
}

export type ReplanChangeType =
  | "moved"
  | "resized"
  | "inserted"
  | "completed"
  | "deleted"
  | "split"
  | "buffered"
  | "unscheduled"
  | "replanned";

export interface ReplanChange {
  eventId: string;
  title: string;
  type: ReplanChangeType;
  from?: string;
  to?: string;
}

export interface ReplanRequest {
  currentEvents: CalendarEvent[];
  currentTasks: TaskItem[];
  action: ReplanAction;
  settings: PlannerSettings;
}

export interface ReplanResult {
  events: CalendarEvent[];
  tasks: TaskItem[];
  changes: ReplanChange[];
  summary: string;
  warnings: string[];
  latestLog: AiLog;
  movedCount: number;
  focusDay: number;
}
