import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: "demo@reclaim.local" },
    update: {
      name: "本地用户",
      timezone: "Asia/Shanghai",
      locale: "zh-CN"
    },
    create: {
      email: "demo@reclaim.local",
      name: "本地用户",
      timezone: "Asia/Shanghai",
      locale: "zh-CN"
    }
  });

  await prisma.timePolicy.upsert({
    where: { userId: user.id },
    update: {
      defaultTimezone: "Asia/Shanghai",
      workdayStart: "09:00",
      workdayEnd: "18:00",
      noMeetingWeekdays: [],
      softLockLeadHours: 24,
      hardLockLeadHours: 4
    },
    create: {
      userId: user.id,
      defaultTimezone: "Asia/Shanghai",
      workdayStart: "09:00",
      workdayEnd: "18:00",
      noMeetingWeekdays: [],
      softLockLeadHours: 24,
      hardLockLeadHours: 4
    }
  });

  console.log("Seed complete: created a blank local workspace for", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
