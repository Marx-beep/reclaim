export interface TimePolicyModel {
  defaultTimezone: string;
  workdayStart: string;
  workdayEnd: string;
  softLockLeadHours: number;
  hardLockLeadHours: number;
  noMeetingWeekdays: number[];
  allowOvertime: boolean;
}

export const defaultTimePolicy: TimePolicyModel = {
  defaultTimezone: "UTC",
  workdayStart: "09:00",
  workdayEnd: "18:00",
  softLockLeadHours: 24,
  hardLockLeadHours: 4,
  noMeetingWeekdays: [],
  allowOvertime: false
};
