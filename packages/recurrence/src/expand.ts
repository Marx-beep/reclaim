import { RRule } from "rrule";

export type ExpandRuleInput = {
  rrule: string;
  dtstart: string;
  betweenStart: string;
  betweenEnd: string;
};

export function expandOccurrences(input: ExpandRuleInput): string[] {
  const base = RRule.fromString(input.rrule);
  const rule = new RRule({ ...base.origOptions, dtstart: new Date(input.dtstart) });

  return rule
    .between(new Date(input.betweenStart), new Date(input.betweenEnd), true)
    .map((date) => date.toISOString());
}
