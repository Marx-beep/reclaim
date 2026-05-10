import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";
import { executeLlmDrivenReplan, llmReplanExecutionSchema } from "@/lib/server/llm-replan-orchestrator";

export async function POST(request: Request) {
  const parsed = llmReplanExecutionSchema.parse(await request.json().catch(() => ({})));
  const userId = await getOrCreateCurrentUserId();
  const result = await executeLlmDrivenReplan(userId, parsed);
  if (!result.ok) return fail(result.message, result.status);
  return ok(result.payload);
}
