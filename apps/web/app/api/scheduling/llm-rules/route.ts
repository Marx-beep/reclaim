import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";
import { getLlmRulebook, llmRulebookSchema, upsertLlmRulebook } from "@/lib/server/llm-rulebook";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getOrCreateCurrentUserId();
    const rulebook = await getLlmRulebook(userId);
    return ok(rulebook);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to load LLM rules", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = llmRulebookSchema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const saved = await upsertLlmRulebook(userId, parsed);
    return ok({
      id: saved.id,
      updatedAt: saved.updatedAt.toISOString(),
      rules: parsed.rules
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed to save LLM rules", 400);
  }
}
