import { prisma } from "@/lib/server/db";

export async function getOrCreateCurrentUserId(): Promise<string> {
  const email = "demo@reclaim.local";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "本地用户",
      timezone: "Asia/Shanghai",
      locale: "zh-CN"
    }
  });

  return user.id;
}
