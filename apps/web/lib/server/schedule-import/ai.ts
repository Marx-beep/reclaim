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

type ChatCompletionUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

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
  const response = await fetch(config.apiUrl, {
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
            "你是时间安排文件解析器。只返回 JSON。把图片/PDF/Word OCR 或文本内容中的课程、会议、任务、排班、活动解析为可写入日历的时间块。不要编造不存在的内容；如果日期缺失，结合用户时区和当前日期推断最近一次合理日期。"
        },
        {
          role: "user",
          content: JSON.stringify({
            requiredOutput: {
              items: [
                {
                  title: "事件标题",
                  startAt: "ISO datetime",
                  endAt: "ISO datetime",
                  categoryTag: allowedCategories,
                  customTags: ["文件导入"],
                  confidence: 0.0,
                  sourceLine: "原始依据"
                }
              ],
              explanation: "中文说明"
            },
            constraints: [
              "startAt 和 endAt 必须是可被 JavaScript Date 解析的 ISO 时间",
              "endAt 必须晚于 startAt",
              "categoryTag 只能从 allowedCategories 中选择",
              "无法确定的条目不要输出",
              "标题要简洁，不要包含多余时间文字"
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

  const parsed = aiScheduleImportSchema.safeParse(JSON.parse(extractJsonObject(content)));
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
