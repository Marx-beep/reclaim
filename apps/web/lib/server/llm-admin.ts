import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const settingsSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().default("deepseek-v4-flash"),
  apiUrl: z.string().url().default("https://api.deepseek.com/chat/completions"),
  inputTokenUsdPerMillion: z.coerce.number().min(0).default(0),
  outputTokenUsdPerMillion: z.coerce.number().min(0).default(0),
  updatedAt: z.string().optional()
});

const usageEntrySchema = z.object({
  at: z.string(),
  provider: z.string(),
  model: z.string(),
  status: z.enum(["success", "fallback", "error"]),
  promptTokens: z.number().int().min(0).default(0),
  completionTokens: z.number().int().min(0).default(0),
  totalTokens: z.number().int().min(0).default(0),
  estimatedCostUsd: z.number().min(0).default(0),
  reason: z.string().optional()
});

const usageStateSchema = z.object({
  entries: z.array(usageEntrySchema).default([])
});

export type LlmSettings = z.infer<typeof settingsSchema>;
export type LlmUsageEntry = z.infer<typeof usageEntrySchema>;

function findWorkspaceRoot() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(cursor, "pnpm-workspace.yaml"))) return cursor;
    const next = path.dirname(cursor);
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function runtimeDir() {
  return process.env.RECLAIM_RUNTIME_DIR ?? path.join(findWorkspaceRoot(), ".runtime");
}

async function ensureRuntimeDir() {
  await mkdir(runtimeDir(), { recursive: true });
}

function settingsPath() {
  return path.join(runtimeDir(), "llm-settings.json");
}

function usagePath() {
  return path.join(runtimeDir(), "llm-usage.json");
}

function maskKey(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function readJsonFile<T>(filePath: string, fallback: T) {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content.replace(/^\uFEFF/, "")) as T;
  } catch {
    return fallback;
  }
}

export async function getStoredLlmSettings() {
  const stored = await readJsonFile<unknown>(settingsPath(), {});
  const parsed = settingsSchema.partial().safeParse(stored);
  return parsed.success ? parsed.data : {};
}

export async function getEffectiveLlmConfig() {
  const stored = await getStoredLlmSettings();
  const apiKey = stored.apiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  const model = stored.model || process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-v4-flash";
  const apiUrl =
    stored.apiUrl ||
    process.env.DEEPSEEK_API_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.deepseek.com/chat/completions";

  return {
    apiKey,
    model,
    apiUrl,
    inputTokenUsdPerMillion: stored.inputTokenUsdPerMillion ?? 0,
    outputTokenUsdPerMillion: stored.outputTokenUsdPerMillion ?? 0,
    configured: Boolean(apiKey),
    maskedKey: maskKey(apiKey),
    source: stored.apiKey ? "runtime" : apiKey ? "env" : "none"
  };
}

export async function saveLlmSettings(input: {
  apiKey?: string;
  clearApiKey?: boolean;
  model?: string;
  apiUrl?: string;
  inputTokenUsdPerMillion?: number;
  outputTokenUsdPerMillion?: number;
}) {
  await ensureRuntimeDir();
  const current = await getStoredLlmSettings();
  const next = settingsSchema.parse({
    ...current,
    apiKey: input.clearApiKey ? undefined : input.apiKey?.trim() || current.apiKey,
    model: input.model?.trim() || current.model || "deepseek-v4-flash",
    apiUrl: input.apiUrl?.trim() || current.apiUrl || "https://api.deepseek.com/chat/completions",
    inputTokenUsdPerMillion: input.inputTokenUsdPerMillion ?? current.inputTokenUsdPerMillion ?? 0,
    outputTokenUsdPerMillion: input.outputTokenUsdPerMillion ?? current.outputTokenUsdPerMillion ?? 0,
    updatedAt: new Date().toISOString()
  });
  await writeFile(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return getEffectiveLlmConfig();
}

function estimateCostUsd(input: {
  promptTokens: number;
  completionTokens: number;
  inputTokenUsdPerMillion: number;
  outputTokenUsdPerMillion: number;
}) {
  return (
    (input.promptTokens / 1_000_000) * input.inputTokenUsdPerMillion +
    (input.completionTokens / 1_000_000) * input.outputTokenUsdPerMillion
  );
}

export async function recordLlmUsage(input: {
  model: string;
  status: "success" | "fallback" | "error";
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  reason?: string;
}) {
  await ensureRuntimeDir();
  const config = await getEffectiveLlmConfig();
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + completionTokens;
  const state = usageStateSchema.parse(await readJsonFile<unknown>(usagePath(), { entries: [] }));
  const entry = usageEntrySchema.parse({
    at: new Date().toISOString(),
    provider: "deepseek",
    model: input.model,
    status: input.status,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd: estimateCostUsd({
      promptTokens,
      completionTokens,
      inputTokenUsdPerMillion: config.inputTokenUsdPerMillion,
      outputTokenUsdPerMillion: config.outputTokenUsdPerMillion
    }),
    reason: input.reason
  });
  state.entries.unshift(entry);
  state.entries = state.entries.slice(0, 500);
  await writeFile(usagePath(), JSON.stringify(state, null, 2), "utf8");
  return entry;
}

export async function getLlmUsageSummary() {
  const config = await getEffectiveLlmConfig();
  const state = usageStateSchema.parse(await readJsonFile<unknown>(usagePath(), { entries: [] }));
  const totals = state.entries.reduce(
    (acc, entry) => {
      acc.calls += 1;
      acc.success += entry.status === "success" ? 1 : 0;
      acc.fallback += entry.status === "fallback" ? 1 : 0;
      acc.error += entry.status === "error" ? 1 : 0;
      acc.promptTokens += entry.promptTokens;
      acc.completionTokens += entry.completionTokens;
      acc.totalTokens += entry.totalTokens;
      acc.estimatedCostUsd += entry.estimatedCostUsd;
      return acc;
    },
    {
      calls: 0,
      success: 0,
      fallback: 0,
      error: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0
    }
  );

  return {
    config: {
      configured: config.configured,
      maskedKey: config.maskedKey,
      source: config.source,
      model: config.model,
      apiUrl: config.apiUrl,
      inputTokenUsdPerMillion: config.inputTokenUsdPerMillion,
      outputTokenUsdPerMillion: config.outputTokenUsdPerMillion
    },
    totals,
    recent: state.entries.slice(0, 20)
  };
}
