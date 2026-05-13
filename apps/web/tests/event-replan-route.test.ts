// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("POST /api/scheduling/event-replan", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("proxies request to scheduler and returns JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, messages: [], explanation: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await import("@/app/api/scheduling/event-replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/event-replan", {
        method: "POST",
        body: JSON.stringify({ schedule: [], event: { type: "task_added" } }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

describe("POST /api/scheduling/event-replan/undo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("proxies undo request to scheduler", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, oldSchedule: [], messages: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await import("@/app/api/scheduling/event-replan/undo/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/event-replan/undo", {
        method: "POST",
        body: JSON.stringify({ undoToken: "token-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
