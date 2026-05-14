import { Temporal } from "@js-temporal/polyfill";

export type ParsedScheduleItem = {
  sourceLine: string;
  title: string;
  startAt: string;
  endAt: string;
  confidence: number;
  categoryTag?: string;
  customTags?: string[];
};

export type ParseScheduleTextInput = {
  text: string;
  timezone: string;
  baseDate?: string;
};

type ClassPeriodSlot = {
  start: string;
  end: string;
};

const defaultClassPeriodSlots: Record<number, ClassPeriodSlot> = {
  1: { start: "08:00", end: "08:45" },
  2: { start: "08:55", end: "09:40" },
  3: { start: "10:10", end: "10:55" },
  4: { start: "11:05", end: "11:50" },
  5: { start: "14:00", end: "14:45" },
  6: { start: "14:55", end: "15:40" },
  7: { start: "16:10", end: "16:55" },
  8: { start: "17:05", end: "17:50" },
  9: { start: "19:00", end: "19:45" },
  10: { start: "19:55", end: "20:40" },
  11: { start: "20:50", end: "21:35" },
  12: { start: "21:45", end: "22:30" }
};

const weekdayMap: Record<string, number> = {
  "周一": 1,
  "星期一": 1,
  mon: 1,
  monday: 1,
  "周二": 2,
  "星期二": 2,
  tue: 2,
  tuesday: 2,
  "周三": 3,
  "星期三": 3,
  wed: 3,
  wednesday: 3,
  "周四": 4,
  "星期四": 4,
  thu: 4,
  thursday: 4,
  "周五": 5,
  "星期五": 5,
  fri: 5,
  friday: 5,
  "周六": 6,
  "星期六": 6,
  sat: 6,
  saturday: 6,
  "周日": 7,
  "周天": 7,
  "星期日": 7,
  "星期天": 7,
  sun: 7,
  sunday: 7
};

function normalizeTime(value: string) {
  const [h, m] = value.replace("：", ":").split(":");
  const hour = Math.min(23, Math.max(0, Number(h)));
  const minute = Math.min(59, Math.max(0, Number(m)));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return Temporal.PlainTime.from({
    hour,
    minute
  });
}

function parseChineseNumber(input: string) {
  const normalized = input.replace(/\s+/g, "");
  if (/^\d+$/.test(normalized)) return Number(normalized);

  const unitMap: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
  };

  if (normalized === "十") return 10;
  if (normalized.startsWith("十")) {
    const ones = unitMap[normalized.slice(1)] ?? 0;
    return 10 + ones;
  }
  if (normalized.includes("十")) {
    const [tensRaw, onesRaw] = normalized.split("十");
    const tens = unitMap[tensRaw] ?? 0;
    const ones = onesRaw ? unitMap[onesRaw] ?? 0 : 0;
    return tens * 10 + ones;
  }

  return unitMap[normalized] ?? NaN;
}

function extractClassPeriodRange(line: string) {
  const match = line.match(/第\s*([0-9一二三四五六七八九十]{1,3})\s*(?:[-~—到至]\s*([0-9一二三四五六七八九十]{1,3}))?\s*节/);
  if (!match) return null;
  const startPeriod = parseChineseNumber(match[1]);
  const endPeriod = parseChineseNumber(match[2] ?? match[1]);
  if (!Number.isFinite(startPeriod) || !Number.isFinite(endPeriod)) return null;
  const minPeriod = Math.min(startPeriod, endPeriod);
  const maxPeriod = Math.max(startPeriod, endPeriod);
  const startSlot = defaultClassPeriodSlots[minPeriod];
  const endSlot = defaultClassPeriodSlots[maxPeriod];
  if (!startSlot || !endSlot) return null;
  return {
    matchedText: match[0],
    start: startSlot.start,
    end: endSlot.end
  };
}

function extractDate(line: string, fallbackYear: number) {
  const full = line.match(/(?:^|[^\d:])(20\d{2})[./-](\d{1,2})[./-](\d{1,2})(?:[^\d:]|$)/);
  if (full) {
    return Temporal.PlainDate.from({
      year: Number(full[1]),
      month: Number(full[2]),
      day: Number(full[3])
    });
  }

  const shortDate = line.match(/(?:^|[^\d:])(\d{1,2})[./-](\d{1,2})(?:[^\d:]|$)/);
  if (shortDate) {
    return Temporal.PlainDate.from({
      year: fallbackYear,
      month: Number(shortDate[1]),
      day: Number(shortDate[2])
    });
  }

  return null;
}

function extractWeekday(line: string) {
  const normalized = line.toLowerCase();
  for (const [token, dayOfWeek] of Object.entries(weekdayMap)) {
    if (normalized.includes(token)) return dayOfWeek;
  }
  return null;
}

function resolveDateFromWeekday(baseDate: Temporal.PlainDate, targetWeekday: number) {
  const delta = (targetWeekday - baseDate.dayOfWeek + 7) % 7;
  return baseDate.add({ days: delta });
}

function cleanupTitle(line: string, matchedRange: string) {
  const withoutTime = line.replace(matchedRange, " ");
  return withoutTime
    .replace(/\s+/g, " ")
    .replace(/[|｜\-—:：]+/g, " ")
    .trim();
}

export function parseScheduleText(input: ParseScheduleTextInput) {
  const baseDate = input.baseDate
    ? Temporal.PlainDate.from(input.baseDate)
    : Temporal.Now.zonedDateTimeISO(input.timezone).toPlainDate();
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parsed: ParsedScheduleItem[] = [];
  const skipped: string[] = [];

  for (const line of lines) {
    const rangeMatch = line.match(/(\d{1,2}[:：]\d{2})\s*(?:-|~|—|到|至)\s*(\d{1,2}[:：]\d{2})/);
    const periodRange = rangeMatch ? null : extractClassPeriodRange(line);

    if (!rangeMatch && !periodRange) {
      skipped.push(line);
      continue;
    }

    const startTime = normalizeTime(rangeMatch ? rangeMatch[1] : periodRange!.start);
    const endTime = normalizeTime(rangeMatch ? rangeMatch[2] : periodRange!.end);
    if (!startTime || !endTime) {
      skipped.push(line);
      continue;
    }

    let date = extractDate(line, baseDate.year);
    let confidence = 0.95;

    if (!date) {
      const weekday = extractWeekday(line);
      if (weekday) {
        date = resolveDateFromWeekday(baseDate, weekday);
        confidence = 0.75;
      }
    }

    if (!date) {
      // If no date/weekday is present, keep the item on baseDate to avoid dropping useful entries.
      date = baseDate;
      confidence = 0.6;
    }

    const startZdt = date.toZonedDateTime({
      timeZone: input.timezone,
      plainTime: startTime
    });
    let endZdt = date.toZonedDateTime({
      timeZone: input.timezone,
      plainTime: endTime
    });

    if (Temporal.ZonedDateTime.compare(endZdt, startZdt) <= 0) {
      endZdt = endZdt.add({ days: 1 });
    }

    const title = cleanupTitle(line, rangeMatch ? rangeMatch[0] : periodRange!.matchedText) || "导入日程";

    parsed.push({
      sourceLine: line,
      title,
      startAt: startZdt.toInstant().toString(),
      endAt: endZdt.toInstant().toString(),
      confidence
    });
  }

  return { parsed, skipped };
}
