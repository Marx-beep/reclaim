export type TimeRange = { startAt: string; endAt: string };

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return Date.parse(a.startAt) < Date.parse(b.endAt) && Date.parse(a.endAt) > Date.parse(b.startAt);
}

export function durationMinutes(range: TimeRange): number {
  return Math.round((Date.parse(range.endAt) - Date.parse(range.startAt)) / 60000);
}
