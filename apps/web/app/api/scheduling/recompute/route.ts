import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { ok, fail } from "@/lib/api/response";
import { recomputeWindowForUser } from "@/lib/server/recompute";
import { executeLlmDrivenReplan } from "@/lib/server/llm-replan-orchestrator";

const schema = z.object({
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
  trigger: z.enum(["MANUAL", "CALENDAR_SYNC", "USER_CHANGE", "POLICY_CHANGE", "WEBHOOK", "SYSTEM"]).default("MANUAL"),
  useLlmAdvisor: z.boolean().default(false),
  instruction: z.string().trim().min(1).max(1200).optional(),
  fallbackOnError: z.boolean().default(true),
  model: z.string().trim().min(1).max(120).optional()
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const windowStart = parsed.windowStart ? new Date(parsed.windowStart) : new Date();
    const windowEnd = parsed.windowEnd ? new Date(parsed.windowEnd) : new Date(windowStart.getTime() + 7 * 24 * 60 * 60_000);

    if (parsed.useLlmAdvisor) {
      const llmResult = await executeLlmDrivenReplan(userId, {
        instruction: parsed.instruction ?? "在保证计划稳定和截止时间的前提下执行局部重排",
        fallbackOnError: parsed.fallbackOnError,
        model: parsed.model,
        baseParams: {
          mode: "COMMIT",
          trigger: parsed.trigger,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString()
        }
      });

      if (!llmResult.ok) return fail(llmResult.message, llmResult.status);
      return ok({
        jobId: llmResult.payload.mode === "COMMIT" ? llmResult.payload.jobId ?? null : null,
        result: llmResult.payload.result,
        llm: llmResult.payload.llm,
        rulebook: llmResult.payload.rulebook,
        queueWarning: "当前为本地直连执行，已跳过队列分发。"
      });
    }

    const recomputed = await recomputeWindowForUser({
      userId,
      trigger: parsed.trigger,
      windowStart,
      windowEnd
    });

    return ok({
      jobId: recomputed.jobId,
      result: recomputed.result,
      queueWarning: "当前为本地直连执行，已跳过队列分发。"
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Recompute failed", 500);
  }
}
