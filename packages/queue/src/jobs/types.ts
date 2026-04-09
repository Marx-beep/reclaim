export type RescheduleJobPayload = {
  userId: string;
  windowStart: string;
  windowEnd: string;
  trigger: "MANUAL" | "CALENDAR_SYNC" | "USER_CHANGE" | "POLICY_CHANGE" | "WEBHOOK" | "SYSTEM";
};

export type CalendarSyncJobPayload = {
  userId: string;
  provider: "GOOGLE" | "OUTLOOK";
  connectionId: string;
};
