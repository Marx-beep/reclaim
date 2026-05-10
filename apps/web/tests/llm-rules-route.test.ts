// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getLlmRulebook = vi.fn();
const upsertLlmRulebook = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/llm-rulebook", async () => {
  const { z } = await import("zod");
  return {
    llmRulebookSchema: z.object({
      rules: z
        .array(
          z.object({
            id: z.string().optional(),
            content: z.string(),
            enabled: z.boolean().default(true),
            weight: z.number().default(1)
          })
        )
        .default([])
    }),
    getLlmRulebook,
    upsertLlmRulebook
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/scheduling/llm-rules", () => {
  it("returns current rulebook", async () => {
    getLlmRulebook.mockResolvedValueOnce({
      rules: [{ id: "rule-1", content: "高优先级任务优先", enabled: true, weight: 2 }],
      version: 1,
      updatedAt: new Date("2026-05-10T00:00:00.000Z")
    });

    const { GET } = await import("@/app/api/scheduling/llm-rules/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.version).toBe(1);
    expect(body.rules).toHaveLength(1);
  });
});

describe("PUT /api/scheduling/llm-rules", () => {
  it("saves rulebook", async () => {
    upsertLlmRulebook.mockResolvedValueOnce({
      id: "sc_1",
      updatedAt: new Date("2026-05-10T01:00:00.000Z")
    });

    const { PUT } = await import("@/app/api/scheduling/llm-rules/route");
    const response = await PUT(
      new Request("http://localhost/api/scheduling/llm-rules", {
        method: "PUT",
        body: JSON.stringify({
          rules: [{ content: "硬锁事件不移动", enabled: true, weight: 3 }]
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("sc_1");
    expect(body.rules).toHaveLength(1);
  });
});
