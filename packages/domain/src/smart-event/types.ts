export type SmartEventType = "TASK" | "HABIT" | "FOCUS" | "MEETING" | "BUFFER" | "LINK_HOLD" | "PTO";

export type SmartEventPriority = "P1" | "P2" | "P3" | "P4";

export type SmartEventStatus = "DRAFT" | "SCHEDULED" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "MISSED";

export type Flexibility = "FLEXIBLE" | "SEMI_FLEXIBLE" | "FIXED";

export type LockState = "FREE" | "BUSY" | "SOFT_LOCKED" | "HARD_LOCKED";

export type SmartEventSource = "INTERNAL" | "GOOGLE" | "OUTLOOK";

export interface SmartEventModel {
  id: string;
  userId: string;
  type: SmartEventType;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  priority: SmartEventPriority;
  status: SmartEventStatus;
  flexibility: Flexibility;
  lockState: LockState;
  source: SmartEventSource;
  recurrenceRule?: string;
  dueAt?: string;
  energyProfile?: "LOW" | "MEDIUM" | "HIGH";
  calendarId?: string;
  isAllDay: boolean;
  metadata?: Record<string, unknown>;
}
