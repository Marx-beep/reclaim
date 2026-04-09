import { fail, ok } from "@/lib/api/response";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { recomputeWindowSafely } from "@/lib/server/recompute";
import { extractTextFromScheduleFile } from "@/lib/server/schedule-import/extract";
import { parseScheduleText } from "@/lib/server/schedule-import/parser";

export async function POST(request: Request) {
  try {
    const userId = await getOrCreateCurrentUserId();
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return fail("Missing file. Please select an image, PDF, DOCX or TXT file.");
    }

    const requestedTimezone = formData.get("timezone");
    const autoCreate = String(formData.get("autoCreate") ?? "true") !== "false";

    const [user, policy] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } }),
      prisma.timePolicy.findUnique({ where: { userId }, select: { defaultTimezone: true } })
    ]);

    const timezone =
      (typeof requestedTimezone === "string" && requestedTimezone) ||
      user?.timezone ||
      policy?.defaultTimezone ||
      "UTC";

    const extracted = await extractTextFromScheduleFile(fileValue);
    const parsed = parseScheduleText({
      text: extracted.text,
      timezone
    });

    if (parsed.parsed.length === 0) {
      return fail("No schedule entries recognized from file. Please use clearer time-format text.");
    }

    let createdCount = 0;
    const createdEventIds: string[] = [];
    const skippedDuplicates: string[] = [];

    if (autoCreate) {
      const created = await prisma.$transaction(async (tx) => {
        const results: Array<{ id: string; startAt: Date; endAt: Date }> = [];
        for (const item of parsed.parsed) {
          const startAt = new Date(item.startAt);
          const endAt = new Date(item.endAt);

          const exists = await tx.smartEvent.findFirst({
            where: {
              userId,
              deletedAt: null,
              title: item.title,
              startAt,
              endAt
            },
            select: { id: true }
          });

          if (exists) {
            skippedDuplicates.push(item.sourceLine);
            continue;
          }

          const event = await tx.smartEvent.create({
            data: {
              userId,
              type: "MEETING",
              title: item.title,
              startAt,
              endAt,
              timezone,
              priority: "P2",
              flexibility: "FIXED",
              lockState: "BUSY",
              metadata: {
                imported: true,
                importSource: "FILE",
                importEngine: extracted.engine,
                confidence: item.confidence,
                sourceLine: item.sourceLine
              }
            },
            select: { id: true, startAt: true, endAt: true }
          });
          results.push(event);
        }
        return results;
      });

      createdCount = created.length;
      createdEventIds.push(...created.map((item) => item.id));

      if (created.length > 0) {
        const rangeStart = created.reduce((min, item) => (item.startAt < min ? item.startAt : min), created[0].startAt);
        const rangeEnd = created.reduce((max, item) => (item.endAt > max ? item.endAt : max), created[0].endAt);

        await recomputeWindowSafely({
          userId,
          trigger: "USER_CHANGE",
          windowStart: new Date(rangeStart.getTime() - 6 * 60 * 60_000),
          windowEnd: new Date(rangeEnd.getTime() + 24 * 60 * 60_000)
        });
      }
    }

    return ok({
      timezone,
      importEngine: extracted.engine,
      extractedTextPreview: extracted.text.slice(0, 8000),
      parsedCount: parsed.parsed.length,
      createdCount,
      createdEventIds,
      skippedLines: parsed.skipped,
      skippedDuplicates,
      autoCreate
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to import schedule file");
  }
}

