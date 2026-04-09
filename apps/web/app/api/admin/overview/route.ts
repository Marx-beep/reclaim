import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";
import { isOpsRequestAuthorized } from "@/lib/server/ops-auth";

export async function GET(request: Request) {
  try {
    if (!isOpsRequestAuthorized(request)) {
      return fail("Unauthorized", 401);
    }

    const userId = await getOrCreateCurrentUserId();
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60_000);
    const before24h = new Date(now.getTime() - 24 * 60 * 60_000);

    const [users, calendars, upcomingEvents7d, openTasks, linksActive, rescheduleJobs24h, decisions24h] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.externalCalendar.count({ where: { deletedAt: null } }),
      prisma.smartEvent.count({
        where: {
          deletedAt: null,
          startAt: { gte: now, lt: in7Days }
        }
      }),
      prisma.task.count({
        where: {
          deletedAt: null,
          smartEvent: {
            userId,
            status: { not: "DONE" },
            deletedAt: null
          }
        }
      }),
      prisma.schedulingLink.count({ where: { isActive: true, deletedAt: null } }),
      prisma.rescheduleJob.count({ where: { requestedAt: { gte: before24h }, deletedAt: null } }),
      prisma.schedulingDecision.count({ where: { createdAt: { gte: before24h } } })
    ]);

    return ok({
      users,
      calendars,
      upcomingEvents7d,
      openTasks,
      linksActive,
      rescheduleJobs24h,
      decisions24h
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load admin overview");
  }
}
