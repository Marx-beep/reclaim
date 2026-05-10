// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const executeLlmDrivenReplan = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/llm-replan-orchestrator", async () => {
  const { z } = await import("zod");
  return {
    llmReplanExecutionSchema: z.object({
      instruction: z.string(),
      fallbackOnError: z.boolean().optional().default(true),
      model: z.string().optional(),
      baseParams: z.record(z.any()).optional().default({})
    }),
    executeLlmDrivenReplan
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/scheduling/llm-replan", () => {
  it("returns orchestrated LLM scheduling result", async () => {
    executeLlmDrivenReplan.mockResolvedValueOnce({
      ok: true,
      payload: {
        mode: "COMMIT",
        jobId: "job_1",
        window: { startAt: "2026-05-10T00:00:00.000Z", endAt: "2026-05-11T00:00:00.000Z", source: "horizon" },
        impactedEventCount: 0,
        result: { feasible: true, solver: "heuristics-v1", score: 0, moves: [], unscheduled_event_ids: [], explanations: {} },
        llm: { used: true, fallback: false },
        rulebook: { version: 2, enabledRules: 2, updatedAt: null }
      }
    });

    const { POST } = await import("@/app/api/scheduling/llm-replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/llm-replan", {
        method: "POST",
        body: JSON.stringify({ instruction: "优先处理48小时内截止任务" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(executeLlmDrivenReplan).toHaveBeenCalledTimes(1);
    expect(body.llm.used).toBe(true);
    expect(body.jobId).toBe("job_1");
  });
});
