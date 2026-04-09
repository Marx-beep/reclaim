import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { getSchedulingLinkAvailability } from "@/lib/server/scheduling-links";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  slotStepMinutes: z.coerce.number().int().min(5).max(120).optional()
});

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      slotStepMinutes: url.searchParams.get("slotStepMinutes") ?? undefined
    });

    // Keep default query window small for responsive availability lookups.
    const from = parsed.from ? new Date(parsed.from) : new Date();
    const to = parsed.to ? new Date(parsed.to) : new Date(Date.now() + 14 * 24 * 60 * 60_000);

    const result = await getSchedulingLinkAvailability({
      slug,
      from,
      to,
      slotStepMinutes: parsed.slotStepMinutes
    });

    if (!result) return fail("Scheduling link not found", 404);

    return ok({
      link: {
        id: result.link.id,
        slug: result.link.slug,
        title: result.link.title,
        durationMinutes: result.link.durationMinutes,
        noticeMinutes: result.link.noticeMinutes,
        minSchedulingHours: result.link.minSchedulingHours,
        maxSchedulingDays: result.link.maxSchedulingDays
      },
      slots: result.slots
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load availability");
  }
}
