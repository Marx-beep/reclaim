import { fail, ok } from "@/lib/api/response";
import { recordLlmUsage } from "@/lib/server/llm-admin";
import { frontendReplanSchema, fromRuleEngineResponse, toRuleEnginePayload } from "@/lib/server/replan-adapter";
import { requestAiReplan } from "@/lib/server/replan-ai";

async function runLocalReplan(input: ReturnType<typeof frontendReplanSchema.parse>) {
  const baseUrl = process.env.SCHEDULER_BASE_URL ?? "http://localhost:8000";
  const response = await fetch(`${baseUrl}/schedule/event-replan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toRuleEnginePayload(input))
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Local replan failed: ${response.status} ${message}`);
  }

  return fromRuleEngineResponse(await response.json());
}

async function safeRecordUsage(input: Parameters<typeof recordLlmUsage>[0]) {
  try {
    await recordLlmUsage(input);
  } catch (error) {
    console.warn("Failed to record LLM usage", error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = frontendReplanSchema.parse(await request.json().catch(() => ({})));

    if (parsed.useAi) {
      try {
        const aiResult = await requestAiReplan({
          type: parsed.type,
          taskId: parsed.taskId,
          delayMinutes: parsed.delayMinutes,
          earlyMinutes: parsed.earlyMinutes,
          newStart: parsed.newStart,
          newEnd: parsed.newEnd,
          durationMinutes: parsed.durationMinutes,
          currentSchedule: parsed.currentSchedule,
          userInstruction: parsed.userInstruction
        });

        await safeRecordUsage({
          model: aiResult.model,
          status: "success",
          promptTokens: aiResult.usage.promptTokens,
          completionTokens: aiResult.usage.completionTokens,
          totalTokens: aiResult.usage.totalTokens
        });

        return ok({
          newSchedule: aiResult.newSchedule,
          explanation: aiResult.explanation,
          source: "ai",
          model: aiResult.model,
          usage: aiResult.usage
        });
      } catch (error) {
        await safeRecordUsage({
          model: process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_MODEL ?? "deepseek-v4-flash",
          status: parsed.fallbackToLocal ? "fallback" : "error",
          reason: error instanceof Error ? error.message : "AI replan failed"
        });
        if (!parsed.fallbackToLocal) {
          return fail(error instanceof Error ? error.message : "AI replan failed", 502);
        }
      }
    }

    const localResult = await runLocalReplan(parsed);
    return ok({
      ...localResult,
      source: "local-rules"
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Replan failed", 500);
  }
}
