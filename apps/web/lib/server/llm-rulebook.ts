import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/server/db";

export const llmRuleSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  content: z.string().trim().min(1).max(300),
  enabled: z.boolean().default(true),
  weight: z.coerce.number().min(0).max(10).default(1)
});

export const llmRulebookSchema = z.object({
  rules: z.array(llmRuleSchema).max(80).default([])
});

export type LlmRule = z.infer<typeof llmRuleSchema>;
export type LlmRulebook = z.infer<typeof llmRulebookSchema>;

const CONSTRAINT_NAME = "LLM_RULEBOOK";

function normalizeRulebookPayload(payload: unknown): LlmRulebook {
  const asRulebook = llmRulebookSchema.safeParse(payload);
  if (asRulebook.success) {
    return asRulebook.data;
  }

  if (Array.isArray(payload)) {
    const fromArray = llmRulebookSchema.safeParse({
      rules: payload.map((item) => item as unknown)
    });
    if (fromArray.success) return fromArray.data;
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as { rules?: unknown[] }).rules)) {
    const nested = llmRulebookSchema.safeParse(payload);
    if (nested.success) return nested.data;
  }

  return { rules: [] };
}

export async function getLlmRulebook(userId: string) {
  const entry = await prisma.schedulingConstraint.findFirst({
    where: {
      userId,
      kind: "CUSTOM",
      name: CONSTRAINT_NAME,
      enabled: true,
      deletedAt: null
    },
    orderBy: { updatedAt: "desc" }
  });

  if (!entry) {
    return {
      rules: [] as LlmRule[],
      version: 0,
      updatedAt: null as Date | null
    };
  }

  const parsed = normalizeRulebookPayload(entry.payload);

  return {
    rules: parsed.rules,
    version: parsed.rules.length,
    updatedAt: entry.updatedAt
  };
}

export async function upsertLlmRulebook(userId: string, input: LlmRulebook) {
  const existing = await prisma.schedulingConstraint.findFirst({
    where: {
      userId,
      kind: "CUSTOM",
      name: CONSTRAINT_NAME,
      deletedAt: null
    },
    orderBy: { updatedAt: "desc" }
  });

  const payload = {
    rules: input.rules.map((rule, index) => ({
      id: rule.id ?? `rule-${index + 1}`,
      content: rule.content,
      enabled: rule.enabled,
      weight: rule.weight
    }))
  };

  if (existing) {
    return prisma.schedulingConstraint.update({
      where: { id: existing.id },
      data: {
        enabled: true,
        payload: payload as Prisma.InputJsonValue
      }
    });
  }

  return prisma.schedulingConstraint.create({
    data: {
      userId,
      kind: "CUSTOM",
      name: CONSTRAINT_NAME,
      isHard: false,
      weight: 1,
      enabled: true,
      payload: payload as Prisma.InputJsonValue
    }
  });
}
