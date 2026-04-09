import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { bookSchedulingLink } from "@/lib/server/scheduling-links";

const bodySchema = z.object({
  startAt: z.string().datetime(),
  attendeeName: z.string().optional(),
  attendeeEmail: z.string().email().optional(),
  notes: z.string().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const parsed = bodySchema.parse(await request.json());
    const result = await bookSchedulingLink({
      slug,
      startAt: new Date(parsed.startAt),
      attendeeName: parsed.attendeeName,
      attendeeEmail: parsed.attendeeEmail,
      notes: parsed.notes
    });

    if ("error" in result) {
      const message = result.error ?? "Failed to book scheduling link";
      if (message === "Scheduling link not found") return fail(message, 404);
      return fail(message, 409);
    }

    return ok(result, 201);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to book scheduling link");
  }
}
