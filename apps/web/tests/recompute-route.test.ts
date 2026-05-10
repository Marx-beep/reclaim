// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const recomputeWindowForUser = vi.fn();
const executeLlmDrivenReplan = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/recompute", () => ({
  recomputeWindowForUser
}));

vi.mock("@/lib/server/llm-replan-orchestrator", () => ({
  executeLlmDrivenReplan
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/scheduling/recompute", () => {
  it("uses classic recompute when useLlmAdvisor=false", async () => {
    recomputeWindowForUser.mockResolvedValueOnce({
      jobId: "job_plain",
      result: { feasible: true, moves: [] }
    });

    const { POST } = await import("@/app/api/scheduling/recompute/route");
    const response = await POST(new Request("http://localhost/api/scheduling/recompute", { method: "POST", body: JSON.stringify({}) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(recomputeWindowForUser).toHaveBeenCalledTimes(1);
    expect(executeLlmDrivenReplan).not.toHaveBeenCalled();
    expect(body.jobId).toBe("job_plain");
  });

  it("uses LLM orchestrator when useLlmAdvisor=true", async () => {
    executeLlmDrivenReplan.mockResolvedValueOnce({
      ok: true,
      payload: {
        mode: "COMMIT",
        jobId: "job_llm",
        result: { feasible: true, moves: [] },
        llm: { used: true, fallback: false },
        rulebook: { version: 1, enabledRules: 1, updatedAt: null }
      }
    });

    const { POST } = await import("@/app/api/scheduling/recompute/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/recompute", {
        method: "POST",
        body: JSON.stringify({ useLlmAdvisor: true, instruction: "按规则重排" })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(executeLlmDrivenReplan).toHaveBeenCalledTimes(1);
    expect(body.jobId).toBe("job_llm");
    expect(body.llm.used).toBe(true);
  });
});
