import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { getLlmUsageSummary, saveLlmSettings } from "@/lib/server/llm-admin";
import { isOpsRequestAuthorized } from "@/lib/server/ops-auth";

const settingsSchema = z.object({
  apiKey: z.string().max(300).optional(),
  clearApiKey: z.boolean().optional(),
  model: z.string().min(1).max(80).optional(),
  apiUrl: z.string().url().optional(),
  inputTokenUsdPerMillion: z.coerce.number().min(0).optional(),
  outputTokenUsdPerMillion: z.coerce.number().min(0).optional()
});

export async function GET(request: Request) {
  if (!isOpsRequestAuthorized(request)) {
    return fail("Unauthorized", 401);
  }

  return ok(await getLlmUsageSummary());
}

export async function POST(request: Request) {
  try {
    if (!isOpsRequestAuthorized(request)) {
      return fail("Unauthorized", 401);
    }

    const parsed = settingsSchema.parse(await request.json().catch(() => ({})));
    await saveLlmSettings(parsed);

    return ok(await getLlmUsageSummary());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to save LLM settings", 400);
  }
}
