import { fail, ok } from "@/lib/api/response";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { isOpsRequestAuthorized } from "@/lib/server/ops-auth";

export async function GET(request: Request) {
  if (!isOpsRequestAuthorized(request)) {
    return fail("Unauthorized", 401);
  }

  const userId = await getOrCreateCurrentUserId();

  const [jobs, decisions] = await Promise.all([
    prisma.rescheduleJob.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
      take: 20
    }),
    prisma.schedulingDecision.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30
    })
  ]);

  return ok({ jobs, decisions });
}
