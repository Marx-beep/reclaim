import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { dynamicReplanParamsSchema, executeDynamicReplan } from "@/lib/server/dynamic-replan";
import { requestLlmReplanSuggestion } from "@/lib/server/llm-replan";
import { getLlmRulebook } from "@/lib/server/llm-rulebook";

const baseParamsSchema = dynamicReplanParamsSchema
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
  .partial();

export const llmReplanExecutionSchema = z.object({
  instruction: z.string().trim().min(1).max(1200),
  fallbackOnError: z.boolean().default(true),
  model: z.string().trim().min(1).max(120).optional(),
  baseParams: baseParamsSchema.default({})
});

export type LlmReplanExecutionInput = z.infer<typeof llmReplanExecutionSchema>;

export async function executeLlmDrivenReplan(userId: string, input: LlmReplanExecutionInput) {
  const now = new Date();
  const horizonHours = input.baseParams.horizonHours ?? 24 * 7;
  const baseStart = input.baseParams.windowStart ? new Date(input.baseParams.windowStart) : now;
  const baseEnd = input.baseParams.windowEnd ? new Date(input.baseParams.windowEnd) : new Date(baseStart.getTime() + horizonHours * 60 * 60_000);

  const [events, rulebook] = await Promise.all([
    prisma.smartEvent.findMany({
      where: {
        userId,
        deletedAt: null,
        startAt: { lt: baseEnd },
        endAt: { gt: baseStart }
      },
      orderBy: { startAt: "asc" },
      take: 120
    }),
    getLlmRulebook(userId)
  ]);

  const fallbackParams = dynamicReplanParamsSchema.parse({
    mode: "COMMIT",
    trigger: "MANUAL",
    reason: "llm-fallback",
    ...input.baseParams
  });

  const runWithParams = async (params: z.infer<typeof dynamicReplanParamsSchema>, llmMeta?: Record<string, unknown>) => {
    const result = await executeDynamicReplan(userId, params);
    if (!result.ok) {
      return { ok: false as const, status: result.status, message: result.message };
    }

    await prisma.auditLog.create({
      data: {
        userId,
        actorType: "SYSTEM",
        action: "LLM_REPLAN_EXECUTED",
        entityType: "RescheduleJob",
        entityId: result.payload.mode === "COMMIT" ? (result.payload.jobId ?? "none") : "preview",
        after: {
          llm: llmMeta ?? null,
          params,
          outputMode: result.payload.mode,
          rulebookVersion: rulebook.version
        } as Prisma.InputJsonValue
      }
    });

    return {
      ok: true as const,
      payload: {
        ...result.payload,
        llm: llmMeta ?? { used: false, fallback: true },
        rulebook: {
          version: rulebook.version,
          enabledRules: rulebook.rules.filter((rule) => rule.enabled).length,
          updatedAt: rulebook.updatedAt?.toISOString() ?? null
        }
      }
    };
  };

  try {
    const suggestionResult = await requestLlmReplanSuggestion({
      instruction: input.instruction,
      windowStart: baseStart,
      windowEnd: baseEnd,
      events,
      model: input.model,
      rulebook: rulebook.rules
    });

    const mergedParams = dynamicReplanParamsSchema.parse({
      ...fallbackParams,
      ...suggestionResult.suggestion,
      reason: suggestionResult.suggestion.reason ?? `llm:${input.instruction.slice(0, 80)}`
    });

    return runWithParams(mergedParams, {
      used: true,
      model: suggestionResult.modelUsed,
      suggestion: suggestionResult.suggestion,
      fallback: false
    });
  } catch (error) {
    if (!input.fallbackOnError) {
      return { ok: false as const, status: 502, message: error instanceof Error ? error.message : "LLM replan failed" };
    }

    return runWithParams(fallbackParams, {
      used: false,
      fallback: true,
      error: error instanceof Error ? error.message : "LLM replan failed"
    });
  }
}
