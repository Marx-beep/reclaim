import { PrismaClient, SmartEventPriority, SmartEventType } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: "demo@reclaim.local" },
    update: {},
    create: {
      email: "demo@reclaim.local",
      name: "Demo User",
      timezone: "America/Los_Angeles",
      locale: "en-US"
    }
  });

  await prisma.timePolicy.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      defaultTimezone: "America/Los_Angeles",
      noMeetingWeekdays: [3],
      softLockLeadHours: 24,
      hardLockLeadHours: 4
    }
  });

  const now = new Date();
  const oneHour = 60 * 60 * 1000;

  const task = await prisma.smartEvent.create({
    data: {
      userId: user.id,
      type: SmartEventType.TASK,
      title: "Ship scheduling MVP",
      description: "Implement baseline heuristic scheduler",
      startAt: new Date(now.getTime() + oneHour),
      endAt: new Date(now.getTime() + 2 * oneHour),
      dueAt: new Date(now.getTime() + 72 * oneHour),
      timezone: "America/Los_Angeles",
      priority: SmartEventPriority.P1,
      metadata: { tags: ["engineering", "critical"] }
    }
  });

  await prisma.task.create({
    data: {
      smartEventId: task.id,
      estimateMinutes: 120,
      remainingMinutes: 120,
      effortScore: 5
    }
  });

  const habit = await prisma.smartEvent.create({
    data: {
      userId: user.id,
      type: SmartEventType.HABIT,
      title: "Daily planning",
      startAt: new Date(now.getTime() + 3 * oneHour),
      endAt: new Date(now.getTime() + 3.5 * oneHour),
      timezone: "America/Los_Angeles",
      priority: SmartEventPriority.P3,
      recurrenceRule: "FREQ=DAILY;BYHOUR=9;BYMINUTE=0;BYSECOND=0"
    }
  });

  await prisma.habit.create({
    data: {
      smartEventId: habit.id,
      rrule: "FREQ=DAILY;INTERVAL=1",
      minDurationMinutes: 30,
      targetPerWeek: 5
    }
  });

  await prisma.analyticsSnapshot.create({
    data: {
      userId: user.id,
      periodStart: new Date(now.getTime() - 7 * 24 * oneHour),
      periodEnd: now,
      timezone: "America/Los_Angeles",
      focusMinutes: 540,
      meetingMinutes: 460,
      taskCompleted: 16,
      taskCreated: 20,
      utilization: 0.73
    }
  });

  console.log("Seed complete for user", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
