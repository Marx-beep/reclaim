import { prisma } from "@/lib/server/db";

export async function getOrCreateCurrentUserId(): Promise<string> {
  const email = "demo@reclaim.local";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      timezone: "America/Los_Angeles"
    }
  });

  return user.id;
}
