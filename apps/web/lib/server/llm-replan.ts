import { z } from "zod";
import type { SmartEvent } from "@prisma/client";
import { dynamicReplanParamsSchema } from "@/lib/server/dynamic-replan";

const suggestionSchema = dynamicReplanParamsSchema
  .pick({
    mode: true,
    trigger: true,
    reason: true,
    windowStart: true,
    windowEnd: true,
    horizonHours: true,
    impactedEventIds: true,
    expandBeforeHours: true,
    expandAfterHours: true
  })
  .partial()
  .extend({
    rationale: z.string().max(800).optional(),
    riskFlags: z.array(z.string().max(80)).max(10).optional()
  });

export type LlmReplanSuggestion = z.infer<typeof suggestionSchema>;

function extractJsonObject(content: string) {
  const cleaned = content.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error("LLM response does not contain a JSON object");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

function summarizeEvents(events: SmartEvent[]) {
  return events.map((event) => ({
    id: event.id,
    type: event.type,
    priority: event.priority,
    lockState: event.lockState,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    dueAt: event.dueAt?.toISOString() ?? null,
    timezone: event.timezone,
    title: event.title.slice(0, 80)
  }));
}

export async function requestLlmReplanSuggestion(input: {
  instruction: string;
  windowStart: Date;
  windowEnd: Date;
  events: SmartEvent[];
  rulebook?: Array<{ content: string; enabled: boolean; weight: number }>;
  model?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = input.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const endpoint = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1/chat/completions";
  const payload = {
    model,
    temperature: 0.1,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system",
        content:
          "You are a scheduling strategy assistant. Output JSON only. Do not schedule exact minute-level slots. Return strategy parameters for a separate scheduler."
      },
      {
        role: "user",
        content: JSON.stringify({
          instruction: input.instruction,
          window: {
            startAt: input.windowStart.toISOString(),
            endAt: input.windowEnd.toISOString()
          },
          allowedOutput: {
            mode: "PREVIEW | COMMIT",
            trigger: "MANUAL | CALENDAR_SYNC | USER_CHANGE | POLICY_CHANGE | WEBHOOK | SYSTEM",
            reason: "string <= 200",
            windowStart: "ISO datetime (optional)",
            windowEnd: "ISO datetime (optional)",
            horizonHours: "1..720",
            impactedEventIds: "array of known ids",
            expandBeforeHours: "0..168",
            expandAfterHours: "0..336",
            rationale: "short explanation",
            riskFlags: "array of short risk labels"
          },
          rules: [
            "Only use event IDs from context",
            "Keep hard-locked events stable",
            "Prefer local replan windows",
            "If uncertain, return conservative PREVIEW"
          ],
          userRulebook: (input.rulebook ?? []).filter((item) => item.enabled).map((item) => ({
            content: item.content,
            weight: item.weight
          })),
          events: summarizeEvents(input.events)
        })
      }
    ]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty content");
  }

  const parsed = suggestionSchema.safeParse(JSON.parse(extractJsonObject(content)));
  if (!parsed.success) {
    throw new Error(`LLM suggestion validation failed: ${parsed.error.message}`);
  }

  return { suggestion: parsed.data, modelUsed: model };
}
