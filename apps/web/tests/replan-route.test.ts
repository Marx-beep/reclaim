// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const recordLlmUsage = vi.fn();

vi.mock("@/lib/server/llm-admin", () => ({
  recordLlmUsage,
  getEffectiveLlmConfig: vi.fn(async () => ({
    apiKey: process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
    model: process.env.DEEPSEEK_MODEL ?? process.env.OPENAI_MODEL ?? "deepseek-v4-flash",
    apiUrl: process.env.DEEPSEEK_API_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.deepseek.com/chat/completions",
    configured: Boolean(process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY),
    maskedKey: "te...key",
    source: process.env.DEEPSEEK_API_KEY ? "env" : "none",
    inputTokenUsdPerMillion: 0,
    outputTokenUsdPerMillion: 0
  }))
}));

describe("POST /api/scheduling/replan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("falls back to local rules and returns frontend schedule shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          newSchedule: [
            { start: "2026-05-13T11:00:00", end: "2026-05-13T11:40:00", title: "继续写论文" },
            { start: "2026-05-13T11:40:00", end: "2026-05-13T12:10:00", title: "做PPT" }
          ],
          explanation: "写论文延迟后，系统将后续任务顺延。"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { POST } = await import("@/app/api/scheduling/replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/replan", {
        method: "POST",
        body: JSON.stringify({
          type: "task_delayed",
          taskId: "task_001",
          delayMinutes: 40,
          currentSchedule: [{ id: "task_001", title: "写论文", start: "09:00", end: "11:00", priority: "A" }],
          baseDate: "2026-05-13"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("local-rules");
    expect(body.newSchedule[0]).toEqual({ start: "11:00", end: "11:40", title: "继续写论文" });
    expect(body.explanation).toContain("写论文");
  });

  it("uses DeepSeek-compatible API when configured and records usage", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  newSchedule: [{ start: "11:00", end: "11:40", title: "继续写论文" }],
                  explanation: "AI 已根据延迟重新安排时间。"
                })
              }
            }
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 40,
            total_tokens: 160
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { POST } = await import("@/app/api/scheduling/replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/replan", {
        method: "POST",
        body: JSON.stringify({
          type: "task_delayed",
          taskId: "task_001",
          delayMinutes: 40,
          currentSchedule: [{ id: "task_001", title: "写论文", start: "09:00", end: "11:00" }]
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("ai");
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.usage.totalTokens).toBe(160);
    expect(recordLlmUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-v4-flash",
        status: "success",
        totalTokens: 160
      })
    );
  });

  it("keeps fixed schedule blocks unchanged after AI suggestions", async () => {
    process.env.DEEPSEEK_API_KEY = "test-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  newSchedule: [{ start: "10:00", end: "11:00", title: "弹性任务" }],
                  explanation: "固定任务保持不变，仅调整弹性任务。"
                })
              }
            }
          ],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 30,
            total_tokens: 130
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { POST } = await import("@/app/api/scheduling/replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/replan", {
        method: "POST",
        body: JSON.stringify({
          type: "task_delayed",
          taskId: "task_flexible",
          delayMinutes: 30,
          currentSchedule: [
            { id: "fixed_001", title: "固定会议", start: "09:00", end: "10:00", scheduleMode: "fixed" },
            { id: "task_flexible", title: "弹性任务", start: "10:00", end: "10:30", scheduleMode: "flexible" }
          ],
          baseDate: "2026-05-13"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("ai");
    expect(body.newSchedule).toContainEqual({ start: "09:00", end: "10:00", title: "固定会议" });
    expect(body.newSchedule).toContainEqual({ start: "10:00", end: "11:00", title: "弹性任务" });
  });
});
