import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { ok, fail } from "@/lib/api/response";

const schema = z.object({
  title: z.string().min(1),
  slug: z.string().min(3),
  durationMinutes: z.number().int().min(15).max(180),
  noticeMinutes: z.number().int().min(0).default(120),
  minSchedulingHours: z.number().int().min(1).default(12),
  maxSchedulingDays: z.number().int().min(1).default(30)
});

export async function GET() {
  const userId = await getOrCreateCurrentUserId();
  const links = await prisma.schedulingLink.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
  return ok(links);
}

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const parsed = schema.parse(await request.json());

    const template = await prisma.meetingTemplate.create({
      data: {
        userId,
        title: parsed.title,
        defaultDurationMinutes: parsed.durationMinutes
      }
    });

    const link = await prisma.schedulingLink.create({
      data: {
        userId,
        meetingTemplateId: template.id,
        slug: parsed.slug,
        title: parsed.title,
        durationMinutes: parsed.durationMinutes,
        noticeMinutes: parsed.noticeMinutes,
        minSchedulingHours: parsed.minSchedulingHours,
        maxSchedulingDays: parsed.maxSchedulingDays,
        isActive: true
      }
    });

    return ok(link, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to create scheduling link");
  }
}
