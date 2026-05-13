import { z } from "zod";

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
  currentSchedule: unknown[];
  userInstruction?: string;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const endpoint =
    process.env.DEEPSEEK_API_URL ??
    process.env.OPENAI_BASE_URL ??
    "https://api.deepseek.com/chat/completions";
  const model = process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_MODEL ?? "deepseek-v4-flash";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a time scheduling engine. Return JSON only. Generate a practical new schedule after a task change. Preserve fixed/locked items, shift lower priority work first, insert buffer time when useful, and explain the change briefly in Chinese."
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
              durationMinutes: input.durationMinutes
            },
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

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
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
    model
  };
}
