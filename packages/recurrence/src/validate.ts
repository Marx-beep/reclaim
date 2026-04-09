import { RRule } from "rrule";

export function validateRRule(value: string): { valid: boolean; error?: string } {
  try {
    RRule.fromString(value);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Invalid recurrence rule" };
  }
}
