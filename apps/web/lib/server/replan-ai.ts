import { z } from "zod";
import { getEffectiveLlmConfig } from "@/lib/server/llm-admin";

const timeBlockSchema = z.object({
  start: z.string().min(1).max(40),
  end: z.string().min(1).max(40),
  title: z.string().min(1).max(120)
});

export const aiReplanResultSchema = z.object({
  newSchedule: z.array(timeBlockSchema).max(120),
  explanation: z.string().min(1).max(1200)
});

export type AiReplanResult = z.infer<typeof aiReplanResultSchema>;

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

export async function requestAiReplan(input: {
  type: string;
  taskId?: string;
  delayMinutes?: number;
  earlyMinutes?: number;
  newStart?: string;
  newEnd?: string;
  durationMinutes?: number;
  allowOverlap?: boolean;
  conflictStrategy?: string;
  currentSchedule: unknown[];
  newTask?: unknown;
  userInstruction?: string;
}) {
  const config = await getEffectiveLlmConfig();
  if (!config.apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

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
            "You are a time scheduling engine. Return JSON only. Generate a practical new schedule after a task change. Fixed/locked items are hard constraints: never move, resize, delete, or rename them. Only flexible items can be shifted. If a user drags a block onto another block, treat the overlap as a temporary conflict to optimize, not as a valid final state. Resolve conflicts by keeping fixed items first, then higher priority and earlier deadline work, shifting lower priority flexible work first, inserting buffer time when useful, and explaining the change briefly in Chinese."
        },
        {
          role: "user",
          content: JSON.stringify({
            requiredOutput: {
              newSchedule: [{ start: "HH:mm or ISO datetime", end: "HH:mm or ISO datetime", title: "string" }],
              explanation: "Chinese explanation"
            },
            event: {
              type: input.type,
              taskId: input.taskId,
              delayMinutes: input.delayMinutes,
              earlyMinutes: input.earlyMinutes,
              newStart: input.newStart,
              newEnd: input.newEnd,
              durationMinutes: input.durationMinutes,
              allowOverlap: input.allowOverlap,
              conflictStrategy: input.conflictStrategy
            },
            newTask: input.newTask,
            userInstruction: input.userInstruction,
            currentSchedule: input.currentSchedule
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI replan request failed: ${response.status} ${message}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: ChatCompletionUsage;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned empty content");
  }

  const parsed = aiReplanResultSchema.safeParse(JSON.parse(extractJsonObject(content)));
  if (!parsed.success) {
    throw new Error(`AI replan validation failed: ${parsed.error.message}`);
  }

  return {
    ...parsed.data,
    model: config.model,
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens:
        json.usage?.total_tokens ??
        (json.usage?.prompt_tokens ?? 0) + (json.usage?.completion_tokens ?? 0)
    }
  };
}
