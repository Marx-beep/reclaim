import { Temporal } from "@js-temporal/polyfill";

export function toZoned(iso: string, timezone: string): Temporal.ZonedDateTime {
  return Temporal.Instant.from(iso).toZonedDateTimeISO(timezone);
}

export function addMinutes(iso: string, timezone: string, minutes: number): string {
  return toZoned(iso, timezone).add({ minutes }).toInstant().toString();
}

export function startOfDay(iso: string, timezone: string): string {
  const zdt = toZoned(iso, timezone);
  const dayStart = Temporal.ZonedDateTime.from({
    year: zdt.year,
    month: zdt.month,
    day: zdt.day,
    hour: 0,
    minute: 0,
    second: 0,
    timeZone: timezone
  });
  return dayStart.toInstant().toString();
}
