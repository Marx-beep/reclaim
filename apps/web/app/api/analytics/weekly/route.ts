import { Prisma, type SmartEvent } from "@prisma/client";
import { Temporal } from "@js-temporal/polyfill";
import { expandOccurrences } from "@reclaim/recurrence";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok } from "@/lib/api/response";
import { CATEGORY_TAG_OPTIONS, categoryTagLabel, normalizeCategoryTag, type CategoryTag } from "@/lib/tags/time-categories";

type BucketKey = "focus" | "meeting" | "task" | "habit" | "buffer" | "personal" | "other";

type TrendBucket = {
  date: string;
  focusMinutes: number;
  meetingMinutes: number;
  taskMinutes: number;
  habitMinutes: number;
  bufferMinutes: number;
  personalMinutes: number;
  otherMinutes: number;
  totalMinutes: number;
};

type DaySegment = {
  dateKey: string;
  start: Temporal.Instant;
  end: Temporal.Instant;
  minutes: number;
};

type CategoryTagTotals = Record<CategoryTag, number>;

function clampInstant(value: Temporal.Instant, min: Temporal.Instant, max: Temporal.Instant) {
  const afterMin = Temporal.Instant.compare(value, min) < 0 ? min : value;
  return Temporal.Instant.compare(afterMin, max) > 0 ? max : afterMin;
}

function overlapMinutes(aStart: Temporal.Instant, aEnd: Temporal.Instant, bStart: Temporal.Instant, bEnd: Temporal.Instant) {
  const start = Temporal.Instant.compare(aStart, bStart) > 0 ? aStart : bStart;
  const end = Temporal.Instant.compare(aEnd, bEnd) < 0 ? aEnd : bEnd;
  if (Temporal.Instant.compare(start, end) >= 0) return 0;
  return Math.max(0, Math.round((end.epochMilliseconds - start.epochMilliseconds) / 60_000));
}

function splitByDay(start: Temporal.Instant, end: Temporal.Instant, timezone: string): DaySegment[] {
  const segments: DaySegment[] = [];
  let cursor = start;

  while (Temporal.Instant.compare(cursor, end) < 0) {
    const zoned = cursor.toZonedDateTimeISO(timezone);
    const nextDayStart = zoned.toPlainDate().add({ days: 1 }).toZonedDateTime({
      timeZone: timezone,
      plainTime: "00:00"
    });
    const segmentEnd = Temporal.Instant.compare(nextDayStart.toInstant(), end) < 0 ? nextDayStart.toInstant() : end;
    const minutes = Math.max(0, Math.round((segmentEnd.epochMilliseconds - cursor.epochMilliseconds) / 60_000));
    segments.push({
      dateKey: zoned.toPlainDate().toString(),
      start: cursor,
      end: segmentEnd,
      minutes
    });
    cursor = segmentEnd;
  }

  return segments;
}

function parseClock(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0
  };
}

function emptyCategoryTagTotals(): CategoryTagTotals {
  return CATEGORY_TAG_OPTIONS.reduce((acc, item) => {
    acc[item.value] = 0;
    return acc;
  }, {} as CategoryTagTotals);
}

function toMetadata(event: Pick<SmartEvent, "metadata">) {
  return typeof event.metadata === "object" && event.metadata ? (event.metadata as Record<string, unknown>) : null;
}

function categorizeEvent(event: Pick<SmartEvent, "type" | "metadata">): BucketKey {
  const metadata = toMetadata(event);
  const categoryTag = normalizeCategoryTag(typeof metadata?.categoryTag === "string" ? metadata.categoryTag : undefined, "OTHER");

  if (categoryTag === "MEETING") return "meeting";
  if (categoryTag === "DEEP_WORK") return "focus";
  if (categoryTag === "PERSONAL" || categoryTag === "FAMILY" || categoryTag === "SOCIAL" || categoryTag === "REST") {
    return "personal";
  }
  if (metadata?.category === "PERSONAL") return "personal";

  switch (event.type) {
    case "FOCUS":
      return "focus";
    case "MEETING":
      return "meeting";
    case "TASK":
      return "task";
    case "HABIT":
      return "habit";
    case "BUFFER":
      return "buffer";
    case "PTO":
      return "personal";
    default:
      return "other";
  }
}

function resolveEventCategoryTag(event: Pick<SmartEvent, "type" | "metadata">): CategoryTag {
  const metadata = toMetadata(event);
  const metadataCategory = normalizeCategoryTag(typeof metadata?.categoryTag === "string" ? metadata.categoryTag : undefined, "OTHER");
  if (metadataCategory !== "OTHER") return metadataCategory;

  switch (event.type) {
    case "FOCUS":
      return "DEEP_WORK";
    case "MEETING":
      return "MEETING";
    case "TASK":
    case "HABIT":
      return "WORK";
    case "PTO":
      return "PERSONAL";
    default:
      return "OTHER";
  }
}

function buildInsights(input: {
  focusMinutes: number;
  meetingMinutes: number;
  taskCreated: number;
  taskCompleted: number;
  overtimeMinutes: number;
  focusTargetMinutesPerDay: number;
  periodDays: number;
}) {
  const insights: Array<{ id: string; level: "info" | "warn"; title: string; detail: string }> = [];
  const completionRate = input.taskCreated > 0 ? input.taskCompleted / input.taskCreated : 1;
  const focusTarget = input.focusTargetMinutesPerDay * input.periodDays;

  if (input.focusMinutes < Math.round(focusTarget * 0.7)) {
    insights.push({
      id: "focus-low",
      level: "warn",
      title: "专注时间偏低",
      detail: "建议在工作日上午预留 1-2 个固定专注块，减少被会议切碎。"
    });
  }

  if (input.meetingMinutes > input.focusMinutes) {
    insights.push({
      id: "meeting-heavy",
      level: "warn",
      title: "会议占比偏高",
      detail: "建议设置无会时段，并把低优先级沟通转移到异步更新。"
    });
  }

  if (input.overtimeMinutes > 240) {
    insights.push({
      id: "overtime",
      level: "warn",
      title: "加班时长偏高",
      detail: "建议把高强度任务前置到工作时段，并降低晚间会议安排。"
    });
  }

  if (completionRate < 0.6 && input.taskCreated >= 4) {
    insights.push({
      id: "task-completion",
      level: "info",
      title: "任务完成率可优化",
      detail: "建议将大任务拆分为 30-90 分钟可执行块，并设置更清晰的截止时间。"
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "healthy",
      level: "info",
      title: "时间结构健康",
      detail: "当前节奏较平衡，建议保持固定复盘节奏并持续优化专注窗口。"
    });
  }

  return insights;
}

export async function GET(request: Request) {
  const userId = await getOrCreateCurrentUserId();
  const url = new URL(request.url);
  const days = Math.min(28, Math.max(7, Number(url.searchParams.get("days") ?? 14)));

  const [user, policy] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
    prisma.timePolicy.findUnique({ where: { userId } })
  ]);

  const timezone = user?.timezone ?? policy?.defaultTimezone ?? "UTC";
  const focusTargetMinutesPerDay = policy?.focusTargetMinutesPerDay ?? 120;
  const workdayStart = parseClock(policy?.workdayStart ?? "09:00");
  const workdayEnd = parseClock(policy?.workdayEnd ?? "18:00");

  const now = Temporal.Now.instant();
  const periodEndZoned = now.toZonedDateTimeISO(timezone).toPlainDate().add({ days: 1 }).toZonedDateTime({
    timeZone: timezone,
    plainTime: "00:00"
  });
  const periodStartZoned = periodEndZoned.subtract({ days });

  const periodStart = new Date(periodStartZoned.toInstant().toString());
  const periodEnd = new Date(periodEndZoned.toInstant().toString());
  const periodStartInstant = Temporal.Instant.from(periodStart.toISOString());
  const periodEndInstant = Temporal.Instant.from(periodEnd.toISOString());

  const baseEvents = await prisma.smartEvent.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        {
          startAt: { lt: periodEnd },
          endAt: { gt: periodStart }
        },
        { recurrenceRule: { not: null } }
      ]
    },
    orderBy: { startAt: "asc" }
  });

  const events = baseEvents.flatMap((event) => {
    if (!event.recurrenceRule) {
      return [event];
    }

    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const occurrences = expandOccurrences({
      rrule: event.recurrenceRule,
      dtstart: event.startAt.toISOString(),
      betweenStart: periodStart.toISOString(),
      betweenEnd: periodEnd.toISOString()
    });

    return occurrences.map((occurrence, index) => {
      const startAt = new Date(occurrence);
      return {
        ...event,
        id: `${event.id}::${index}`,
        startAt,
        endAt: new Date(startAt.getTime() + durationMs)
      };
    });
  });

  const trendMap = new Map<string, TrendBucket>();
  for (let i = 0; i < days; i += 1) {
    const date = periodStartZoned.toPlainDate().add({ days: i }).toString();
    trendMap.set(date, {
      date,
      focusMinutes: 0,
      meetingMinutes: 0,
      taskMinutes: 0,
      habitMinutes: 0,
      bufferMinutes: 0,
      personalMinutes: 0,
      otherMinutes: 0,
      totalMinutes: 0
    });
  }

  const totals: Record<BucketKey, number> = {
    focus: 0,
    meeting: 0,
    task: 0,
    habit: 0,
    buffer: 0,
    personal: 0,
    other: 0
  };
  const categoryTagTotals = emptyCategoryTagTotals();

  let overtimeMinutes = 0;
  let taskCreated = 0;
  let taskCompleted = 0;
  let focusSessionCount = 0;
  let meetingCount = 0;

  for (const event of events) {
    const rawStart = Temporal.Instant.from(event.startAt.toISOString());
    const rawEnd = Temporal.Instant.from(event.endAt.toISOString());
    const start = clampInstant(rawStart, periodStartInstant, periodEndInstant);
    const end = clampInstant(rawEnd, periodStartInstant, periodEndInstant);
    if (Temporal.Instant.compare(start, end) >= 0) continue;

    const category = categorizeEvent(event);
    const categoryTag = resolveEventCategoryTag(event);
    const minutes = Math.max(0, Math.round((end.epochMilliseconds - start.epochMilliseconds) / 60_000));
    totals[category] += minutes;
    categoryTagTotals[categoryTag] += minutes;

    if (event.type === "TASK") {
      taskCreated += 1;
      if (event.status === "DONE") taskCompleted += 1;
    }
    if (event.type === "FOCUS") focusSessionCount += 1;
    if (event.type === "MEETING") meetingCount += 1;

    const segments = splitByDay(start, end, timezone);
    for (const segment of segments) {
      const bucket = trendMap.get(segment.dateKey);
      if (!bucket) continue;
      bucket.totalMinutes += segment.minutes;
      if (category === "focus") bucket.focusMinutes += segment.minutes;
      else if (category === "meeting") bucket.meetingMinutes += segment.minutes;
      else if (category === "task") bucket.taskMinutes += segment.minutes;
      else if (category === "habit") bucket.habitMinutes += segment.minutes;
      else if (category === "buffer") bucket.bufferMinutes += segment.minutes;
      else if (category === "personal") bucket.personalMinutes += segment.minutes;
      else bucket.otherMinutes += segment.minutes;

      // Overtime is counted for work items scheduled outside the configured workday.
      if (category === "task" || category === "habit" || category === "focus" || category === "meeting") {
        const dayStart = segment.start.toZonedDateTimeISO(timezone);
        const dayOfWeek = dayStart.dayOfWeek; // 1-7: Mon..Sun
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
        if (isWeekend) {
          overtimeMinutes += segment.minutes;
          continue;
        }

        const workStartInstant = dayStart
          .toPlainDate()
          .toZonedDateTime({
            timeZone: timezone,
            plainTime: {
              hour: workdayStart.hour,
              minute: workdayStart.minute
            }
          })
          .toInstant();

        const workEndInstant = dayStart
          .toPlainDate()
          .toZonedDateTime({
            timeZone: timezone,
            plainTime: {
              hour: workdayEnd.hour,
              minute: workdayEnd.minute
            }
          })
          .toInstant();

        const inWorkMinutes = overlapMinutes(segment.start, segment.end, workStartInstant, workEndInstant);
        overtimeMinutes += Math.max(0, segment.minutes - inWorkMinutes);
      }
    }
  }

  const focusMinutes = totals.focus;
  const meetingMinutes = totals.meeting;
  const taskMinutes = totals.task;
  const habitMinutes = totals.habit;
  const bufferMinutes = totals.buffer;
  const personalMinutes = totals.personal;
  const totalScheduledMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const productiveMinutes = focusMinutes + taskMinutes + habitMinutes;
  const utilization = totalScheduledMinutes > 0 ? productiveMinutes / totalScheduledMinutes : 0;
  const completionRate = taskCreated > 0 ? taskCompleted / taskCreated : 1;
  const shallowMinutes = meetingMinutes + taskMinutes + habitMinutes + bufferMinutes;
  const focusRatio = focusMinutes + shallowMinutes > 0 ? focusMinutes / (focusMinutes + shallowMinutes) : 0;

  const breakdown = [
    { key: "focus", label: "专注", color: "#2ca58d", minutes: focusMinutes },
    { key: "meeting", label: "会议", color: "#f97316", minutes: meetingMinutes },
    { key: "task", label: "任务", color: "#3b82f6", minutes: taskMinutes },
    { key: "habit", label: "习惯", color: "#8b5cf6", minutes: habitMinutes },
    { key: "buffer", label: "缓冲", color: "#64748b", minutes: bufferMinutes },
    { key: "personal", label: "个人", color: "#e11d48", minutes: personalMinutes },
    { key: "other", label: "其他", color: "#94a3b8", minutes: totals.other }
  ].map((item) => ({
    ...item,
    percent: totalScheduledMinutes > 0 ? item.minutes / totalScheduledMinutes : 0
  }));

  const categoryTagBreakdown = Object.entries(categoryTagTotals)
    .map(([key, minutes]) => ({
      key,
      label: categoryTagLabel(key),
      minutes,
      percent: totalScheduledMinutes > 0 ? minutes / totalScheduledMinutes : 0
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const trend = Array.from(trendMap.values());
  const insights = buildInsights({
    focusMinutes,
    meetingMinutes,
    taskCreated,
    taskCompleted,
    overtimeMinutes,
    focusTargetMinutesPerDay,
    periodDays: days
  });

  if (days === 14) {
    await prisma.analyticsSnapshot.upsert({
      where: {
        userId_periodStart_periodEnd: {
          userId,
          periodStart,
          periodEnd
        }
      },
      update: {
        timezone,
        focusMinutes,
        meetingMinutes,
        taskCreated,
        taskCompleted,
        overtimeMinutes,
        utilization,
        payload: {
          breakdown,
          categoryTagBreakdown,
          trend,
          insights
        } as Prisma.InputJsonValue
      },
      create: {
        userId,
        periodStart,
        periodEnd,
        timezone,
        focusMinutes,
        meetingMinutes,
        taskCreated,
        taskCompleted,
        overtimeMinutes,
        utilization,
        payload: {
          breakdown,
          categoryTagBreakdown,
          trend,
          insights
        } as Prisma.InputJsonValue
      }
    });
  }

  return ok({
    focusMinutes,
    meetingMinutes,
    taskCreated,
    taskCompleted,
    utilization,
    overtimeMinutes,
    completionRate,
    focusSessionCount,
    meetingCount,
    periodStart,
    periodEnd,
    timezone,
    totalScheduledMinutes,
    categoryTotals: {
      focusMinutes,
      meetingMinutes,
      taskMinutes,
      habitMinutes,
      bufferMinutes,
      personalMinutes,
      otherMinutes: totals.other
    },
    categoryTagTotals,
    categoryTagBreakdown,
    focusVsShallow: {
      focusMinutes,
      shallowMinutes,
      focusRatio
    },
    breakdown,
    trend,
    insights
  });
}
