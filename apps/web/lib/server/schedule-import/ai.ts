import { z } from "zod";
import { getEffectiveLlmConfig, recordLlmUsage } from "@/lib/server/llm-admin";
import { CATEGORY_TAG_VALUES, normalizeCategoryTag } from "@/lib/tags/time-categories";
import type { ParsedScheduleItem } from "./parser";

const aiScheduleItemSchema = z.object({
  title: z.string().min(1).max(160),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  categoryTag: z.string().optional(),
  customTags: z.array(z.string().min(1).max(32)).max(12).optional(),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  sourceLine: z.string().max(500).optional()
});

const aiScheduleImportSchema = z.object({
  items: z.array(aiScheduleItemSchema).max(80),
  explanation: z.string().max(1000).optional()
});

const alternativeArrayKeys = ["items", "events", "schedule", "timeBlocks", "time_blocks", "courses", "classes", "entries"];

type ChatCompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 90_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonObject(content: string) {
  const cleaned = content.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("AI response does not contain JSON");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

function normalizeIsoDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function coerceAiImportPayload(raw: unknown) {
  const root = asRecord(raw);
  let items: unknown[] | undefined;
  for (const key of alternativeArrayKeys) {
    if (Array.isArray(root[key])) {
      items = root[key] as unknown[];
      break;
    }
  }
  if (!items && Array.isArray(raw)) {
    items = raw;
  }

  const normalizedItems = (items ?? []).map((value) => {
    const record = asRecord(value);
    return {
      title: pickString(record, ["title", "name", "course", "courseName", "summary", "subject"]) ?? "Imported event",
      startAt: pickString(record, ["startAt", "start", "startTime", "begin", "beginAt"]) ?? "",
      endAt: pickString(record, ["endAt", "end", "endTime", "finish", "finishAt"]) ?? "",
      categoryTag: pickString(record, ["categoryTag", "category", "type"]),
      customTags: Array.isArray(record.customTags)
        ? record.customTags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
      confidence: typeof record.confidence === "number" || typeof record.confidence === "string" ? record.confidence : 0.75,
      sourceLine: pickString(record, ["sourceLine", "source", "raw", "evidence"])
    };
  });

  return {
    items: normalizedItems,
    explanation: pickString(root, ["explanation", "reason", "summary", "message"])
  };
}

function toParsedItem(item: z.infer<typeof aiScheduleItemSchema>): ParsedScheduleItem | null {
  const startAt = normalizeIsoDateTime(item.startAt);
  const endAt = normalizeIsoDateTime(item.endAt);
  if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return null;
  }

  return {
    title: item.title.trim(),
    startAt,
    endAt,
    confidence: item.confidence,
    sourceLine: item.sourceLine?.trim() || item.title.trim(),
    categoryTag: normalizeCategoryTag(item.categoryTag, "WORK"),
    customTags: item.customTags ?? []
  };
}

export async function requestAiScheduleImport(input: {
  text: string;
  timezone: string;
  fileName?: string;
  nowIso?: string;
}) {
  const config = await getEffectiveLlmConfig();
  if (!config.configured || !config.apiKey) {
    throw new Error("LLM API key is not configured");
  }

  const allowedCategories = CATEGORY_TAG_VALUES.join(", ");
  const response = await fetchWithTimeout(config.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a schedule-file parser. Return JSON only. Extract calendar-ready blocks from OCR/text of class timetables, meetings, tasks, shifts and activities. Do not invent entries. If date/time cannot be determined, omit that entry."
        },
        {
          role: "user",
          content: JSON.stringify({
            requiredOutput: {
              items: [
                {
                  title: "event title",
                  startAt: "ISO datetime",
                  endAt: "ISO datetime",
                  categoryTag: allowedCategories,
                  customTags: ["file-import"],
                  confidence: 0.0,
                  sourceLine: "raw evidence"
                }
              ],
              explanation: "short Chinese explanation"
            },
            acceptedAlternativeKeys: ["events", "schedule", "timeBlocks", "courses", "classes"],
            constraints: [
              "startAt and endAt must be valid ISO datetimes parseable by JavaScript Date",
              "endAt must be later than startAt",
              "categoryTag must be selected from allowedCategories",
              "omit uncertain rows",
              "title should be concise and should not include redundant time text",
              "For class timetable images, identify course name, weekday, period, class time and room. If only a week range is present, infer dates from the week range and weekday columns."
            ],
            timezone: input.timezone,
            nowIso: input.nowIso ?? new Date().toISOString(),
            fileName: input.fileName,
            allowedCategories,
            text: input.text.slice(0, 18000)
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    await recordLlmUsage({
      model: config.model,
      status: "error",
      reason: `schedule import failed: ${response.status} ${message.slice(0, 200)}`
    });
    throw new Error(`AI schedule import failed: ${response.status} ${message}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: ChatCompletionUsage;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    await recordLlmUsage({ model: config.model, status: "error", reason: "schedule import empty content" });
    throw new Error("AI returned empty schedule import content");
  }

  const parsed = aiScheduleImportSchema.safeParse(coerceAiImportPayload(JSON.parse(extractJsonObject(content))));
  if (!parsed.success) {
    await recordLlmUsage({ model: config.model, status: "error", reason: "schedule import validation failed" });
    throw new Error(`AI schedule import validation failed: ${parsed.error.message}`);
  }

  await recordLlmUsage({
    model: config.model,
    status: "success",
    promptTokens: json.usage?.prompt_tokens ?? 0,
    completionTokens: json.usage?.completion_tokens ?? 0,
    totalTokens:
      json.usage?.total_tokens ??
      (json.usage?.prompt_tokens ?? 0) + (json.usage?.completion_tokens ?? 0),
    reason: "schedule_import"
  });

  return {
    parsed: parsed.data.items.map(toParsedItem).filter((item): item is ParsedScheduleItem => Boolean(item)),
    explanation: parsed.data.explanation ?? "",
    model: config.model
  };
}
