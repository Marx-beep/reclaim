import { z } from "zod";
import { getOrCreateCurrentUserId } from "@/lib/auth/session";
import { fail, ok } from "@/lib/api/response";
import { dynamicReplanParamsSchema, executeDynamicReplan } from "@/lib/server/dynamic-replan";

export async function POST(request: Request) {
  try {
    const parsed = dynamicReplanParamsSchema.parse(await request.json().catch(() => ({})));
    const userId = await getOrCreateCurrentUserId();
    const result = await executeDynamicReplan(userId, parsed);
    if (!result.ok) return fail(result.message, result.status);
    return ok(result.payload);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Dynamic replan failed", 500);
  }
}
