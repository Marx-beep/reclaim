import { fail, ok } from "@/lib/api/response";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { prisma } from "@/lib/server/db";
import { recomputeWindowSafely } from "@/lib/server/recompute";
import { requestAiScheduleImport } from "@/lib/server/schedule-import/ai";
import { extractTextFromScheduleFile } from "@/lib/server/schedule-import/extract";
import { parseScheduleText, type ParsedScheduleItem } from "@/lib/server/schedule-import/parser";
import { buildTagMetadata } from "@/lib/tags/time-categories";

function inferCategoryTagByTitle(title: string) {
  const normalized = title.toLowerCase();
  if (/课程|上课|课表|class|lecture|study|学习/.test(normalized)) return "STUDY";
  if (/会议|meeting|standup|sync/.test(normalized)) return "MEETING";
  if (/锻炼|健身|run|workout|exercise|运动/.test(normalized)) return "EXERCISE";
  if (/通勤|地铁|bus|commute/.test(normalized)) return "COMMUTE";
  return "WORK";
}

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
    const requestedScheduleMode = String(formData.get("scheduleMode") ?? "fixed");
    const scheduleMode = requestedScheduleMode === "flexible" ? "flexible" : "fixed";

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
    let importEngine: string = extracted.engine;
    let aiExplanation: string | undefined;
    let parsedItems: ParsedScheduleItem[] = [];
    let skippedLines: string[] = [];

    try {
      const aiParsed = await requestAiScheduleImport({
        text: extracted.text,
        timezone,
        fileName: fileValue.name
      });
      if (aiParsed.parsed.length > 0) {
        parsedItems = aiParsed.parsed;
        aiExplanation = aiParsed.explanation;
        importEngine = `llm:${aiParsed.model}`;
      }
    } catch (error) {
      // AI parsing is an enhancement, not a hard dependency. Keep local parsing as a stable fallback.
      aiExplanation = error instanceof Error ? `AI parsing fallback: ${error.message}` : "AI parsing fallback";
    }

    if (parsedItems.length === 0) {
      const parsed = parseScheduleText({
        text: extracted.text,
        timezone
      });
      parsedItems = parsed.parsed;
      skippedLines = parsed.skipped;
    }

    if (parsedItems.length === 0) {
      return fail("No schedule entries recognized from file. Please use clearer time-format text.");
    }

    let createdCount = 0;
    const createdEventIds: string[] = [];
    const skippedDuplicates: string[] = [];

    if (autoCreate) {
      const created = await prisma.$transaction(async (tx) => {
        const results: Array<{ id: string; startAt: Date; endAt: Date }> = [];
        for (const item of parsedItems) {
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
              flexibility: scheduleMode === "fixed" ? "FIXED" : "FLEXIBLE",
              lockState: scheduleMode === "fixed" ? "HARD_LOCKED" : "BUSY",
              metadata: {
                ...buildTagMetadata(undefined, {
                  categoryTag: item.categoryTag ?? inferCategoryTagByTitle(item.title),
                  customTags: ["文件导入", ...(item.customTags ?? [])],
                  fallbackCategory: "WORK"
                }),
                imported: true,
                importSource: "FILE",
                scheduleMode,
                importEngine,
                aiExplanation,
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
      importEngine,
      aiExplanation,
      extractedTextPreview: extracted.text.slice(0, 8000),
      parsedCount: parsedItems.length,
      createdCount,
      createdEventIds,
      skippedLines,
      skippedDuplicates,
      autoCreate,
      scheduleMode
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to import schedule file");
  }
}
