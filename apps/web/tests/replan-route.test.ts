// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/scheduling/replan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it("uses DeepSeek-compatible API when configured", async () => {
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
          ]
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
    expect(body.newSchedule).toHaveLength(1);
  });
});
