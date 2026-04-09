import { Temporal } from "@js-temporal/polyfill";
import { prisma } from "@/lib/server/db";
import { expandOccurrences } from "@reclaim/recurrence";
import { recomputeWindowSafely } from "@/lib/server/recompute";

type BusyInterval = {
  start: Temporal.Instant;
  end: Temporal.Instant;
};

type LinkWithTemplate = Awaited<ReturnType<typeof getLinkBySlug>>;

function toInstant(date: Date) {
  return Temporal.Instant.from(date.toISOString());
}

function overlaps(a: BusyInterval, b: BusyInterval) {
  return a.start.epochNanoseconds < b.end.epochNanoseconds && a.end.epochNanoseconds > b.start.epochNanoseconds;
}

function parseClock(value: string) {
  const [h, m] = value.split(":").map((item) => Number(item));
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

function toJsDayOfWeek(temporalDayOfWeek: number) {
  // Temporal: 1(Mon) .. 7(Sun) -> JS-like: 1(Mon) .. 6(Sat), 0(Sun)
  return temporalDayOfWeek % 7;
}

async function getBusyIntervals(userId: string, from: Date, to: Date): Promise<BusyInterval[]> {
  const events = await prisma.smartEvent.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { notIn: ["DRAFT", "CANCELLED"] },
      OR: [
        {
          startAt: { lt: to },
          endAt: { gt: from }
        },
        {
          recurrenceRule: { not: null }
        }
      ]
    }
  });

  return events.flatMap((event) => {
    if (!event.recurrenceRule) {
      return [{ start: toInstant(event.startAt), end: toInstant(event.endAt) }];
    }

    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const occurrences = expandOccurrences({
      rrule: event.recurrenceRule,
      dtstart: event.startAt.toISOString(),
      betweenStart: from.toISOString(),
      betweenEnd: to.toISOString()
    });

    return occurrences.map((occurrence) => {
      const startDate = new Date(occurrence);
      return {
        start: toInstant(startDate),
        end: toInstant(new Date(startDate.getTime() + durationMs))
      };
    });
  });
}

async function getEffectiveWorkHours(userId: string) {
  const [rules, policy] = await Promise.all([
    prisma.workHourRule.findMany({
      where: { userId, enabled: true, deletedAt: null },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    }),
    prisma.timePolicy.findUnique({ where: { userId } })
  ]);

  if (rules.length > 0) {
    return {
      timezone: policy?.defaultTimezone ?? "UTC",
      rules: rules.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime
      }))
    };
  }

  const defaultStart = policy?.workdayStart ?? "09:00";
  const defaultEnd = policy?.workdayEnd ?? "18:00";
  const fallbackRules = [1, 2, 3, 4, 5].map((dow) => ({
    dayOfWeek: dow,
    startTime: defaultStart,
    endTime: defaultEnd
  }));

  return {
    timezone: policy?.defaultTimezone ?? "UTC",
    rules: fallbackRules
  };
}

export async function getLinkBySlug(slug: string) {
  return prisma.schedulingLink.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: { meetingTemplate: true }
  });
}

export async function getSchedulingLinkAvailability(input: {
  slug: string;
  from: Date;
  to: Date;
  slotStepMinutes?: number;
}) {
  const link = await getLinkBySlug(input.slug);
  if (!link) return null;

  const slotStepMinutes = input.slotStepMinutes ?? 30;
  const now = new Date();
  const minAllowed = new Date(now.getTime() + link.minSchedulingHours * 60 * 60_000);
  const maxAllowed = new Date(now.getTime() + link.maxSchedulingDays * 24 * 60 * 60_000);

  const effectiveFrom = input.from > minAllowed ? input.from : minAllowed;
  const effectiveTo = input.to < maxAllowed ? input.to : maxAllowed;

  if (effectiveTo <= effectiveFrom) {
    return { link, slots: [] as string[] };
  }

  const [busy, workHours] = await Promise.all([
    getBusyIntervals(link.userId, effectiveFrom, effectiveTo),
    getEffectiveWorkHours(link.userId)
  ]);

  const timezone = workHours.timezone;
  const fromInstant = toInstant(effectiveFrom);
  const toInstantValue = toInstant(effectiveTo);
  const duration = Temporal.Duration.from({ minutes: link.durationMinutes });
  const step = Temporal.Duration.from({ minutes: slotStepMinutes });

  let cursorDate = fromInstant.toZonedDateTimeISO(timezone).toPlainDate();
  const endDate = toInstantValue.toZonedDateTimeISO(timezone).toPlainDate();

  const slots: string[] = [];

  while (Temporal.PlainDate.compare(cursorDate, endDate) <= 0) {
    const dayStart = cursorDate.toZonedDateTime({ timeZone: timezone, plainTime: "00:00" });
    const jsDayOfWeek = toJsDayOfWeek(dayStart.dayOfWeek);
    const dayRule = workHours.rules.find((item) => item.dayOfWeek === jsDayOfWeek);

    if (dayRule) {
      const startClock = parseClock(dayRule.startTime);
      const endClock = parseClock(dayRule.endTime);
      let slotStart = dayStart.withPlainTime({ hour: startClock.hour, minute: startClock.minute }).toInstant();
      const workEnd = dayStart.withPlainTime({ hour: endClock.hour, minute: endClock.minute }).toInstant();

      if (slotStart.epochNanoseconds < fromInstant.epochNanoseconds) {
        slotStart = fromInstant;
      }

      while (slotStart.epochNanoseconds < workEnd.epochNanoseconds) {
        const slotEnd = slotStart.add(duration);
        if (
          slotEnd.epochNanoseconds > workEnd.epochNanoseconds ||
          slotEnd.epochNanoseconds > toInstantValue.epochNanoseconds
        ) {
          break;
        }

        const candidate = { start: slotStart, end: slotEnd };
        const isBusy = busy.some((item) => overlaps(item, candidate));
        if (!isBusy) {
          slots.push(slotStart.toString());
        }
        slotStart = slotStart.add(step);
      }
    }

    cursorDate = cursorDate.add({ days: 1 });
  }

  return { link, slots };
}

export async function bookSchedulingLink(input: {
  slug: string;
  startAt: Date;
  attendeeName?: string;
  attendeeEmail?: string;
  notes?: string;
}) {
  const link = await getLinkBySlug(input.slug);
  if (!link) {
    return { error: "Scheduling link not found" as const };
  }

  const now = new Date();
  const minAllowed = new Date(now.getTime() + link.minSchedulingHours * 60 * 60_000);
  const maxAllowed = new Date(now.getTime() + link.maxSchedulingDays * 24 * 60 * 60_000);
  if (input.startAt < minAllowed || input.startAt > maxAllowed) {
    return { error: "Selected time is outside scheduling window" as const };
  }

  const endAt = new Date(input.startAt.getTime() + link.durationMinutes * 60_000);
  const busy = await getBusyIntervals(link.userId, new Date(input.startAt.getTime() - 24 * 60 * 60_000), endAt);
  const requested = { start: toInstant(input.startAt), end: toInstant(endAt) };
  const isBusy = busy.some((item) => overlaps(item, requested));
  if (isBusy) {
    return { error: "Selected slot is no longer available" as const };
  }

  const policy = await prisma.timePolicy.findUnique({ where: { userId: link.userId } });
  const bufferBeforeMinutes = policy?.defaultBufferBeforeMinutes ?? 5;
  const bufferAfterMinutes = policy?.defaultBufferAfterMinutes ?? 5;

  const result = await prisma.$transaction(async (tx) => {
    const meeting = await tx.smartEvent.create({
      data: {
        userId: link.userId,
        type: "MEETING",
        title: link.title,
        description: input.notes,
        startAt: input.startAt,
        endAt,
        timezone: policy?.defaultTimezone ?? "UTC",
        priority: "P2",
        flexibility: "FIXED",
        lockState: "BUSY",
        metadata: {
          source: "SCHEDULING_LINK",
          slug: link.slug,
          attendeeName: input.attendeeName ?? null,
          attendeeEmail: input.attendeeEmail ?? null
        }
      }
    });

    const bufferEvents = [];
    if (bufferBeforeMinutes > 0) {
      bufferEvents.push(
        tx.smartEvent.create({
          data: {
            userId: link.userId,
            type: "BUFFER",
            title: `Buffer before: ${link.title}`,
            startAt: new Date(input.startAt.getTime() - bufferBeforeMinutes * 60_000),
            endAt: input.startAt,
            timezone: policy?.defaultTimezone ?? "UTC",
            priority: "P3",
            flexibility: "FIXED",
            lockState: "BUSY",
            metadata: {
              relatedMeetingId: meeting.id,
              bufferPosition: "BEFORE"
            }
          }
        })
      );
    }
    if (bufferAfterMinutes > 0) {
      bufferEvents.push(
        tx.smartEvent.create({
          data: {
            userId: link.userId,
            type: "BUFFER",
            title: `Buffer after: ${link.title}`,
            startAt: endAt,
            endAt: new Date(endAt.getTime() + bufferAfterMinutes * 60_000),
            timezone: policy?.defaultTimezone ?? "UTC",
            priority: "P3",
            flexibility: "FIXED",
            lockState: "BUSY",
            metadata: {
              relatedMeetingId: meeting.id,
              bufferPosition: "AFTER"
            }
          }
        })
      );
    }

    const createdBuffers = await Promise.all(bufferEvents);
    return { meeting, buffers: createdBuffers };
  });

  const recompute = await recomputeWindowSafely({
    userId: link.userId,
    trigger: "USER_CHANGE",
    windowStart: new Date(input.startAt.getTime() - 3 * 60 * 60_000),
    windowEnd: new Date(endAt.getTime() + 12 * 60 * 60_000)
  });

  return { link, ...result, recompute };
}

