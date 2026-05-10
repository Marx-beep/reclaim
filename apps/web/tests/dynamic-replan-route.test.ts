// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const previewWindowForUser = vi.fn();
const recomputeWindowForUser = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/db", () => ({
  prisma: {
    smartEvent: {
      findMany
    }
  }
}));

vi.mock("@/lib/server/recompute", () => ({
  previewWindowForUser,
  recomputeWindowForUser
}));

describe("POST /api/scheduling/dynamic-replan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T08:00:00.000Z"));
    vi.clearAllMocks();
    findMany.mockReset();
    previewWindowForUser.mockReset();
    recomputeWindowForUser.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("supports preview mode with explicit window", async () => {
    previewWindowForUser.mockResolvedValueOnce({
      windowStart: new Date("2026-05-10T09:00:00.000Z"),
      windowEnd: new Date("2026-05-10T15:00:00.000Z"),
      result: { feasible: true, solver: "heuristics", score: 42, moves: [], unscheduled_event_ids: [], explanations: {} }
    });

    const { POST } = await import("@/app/api/scheduling/dynamic-replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/dynamic-replan", {
        method: "POST",
        body: JSON.stringify({
          mode: "PREVIEW",
          windowStart: "2026-05-10T09:00:00.000Z",
          windowEnd: "2026-05-10T15:00:00.000Z"
        })
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("PREVIEW");
    expect(body.window.source).toBe("explicit");
    expect(previewWindowForUser).toHaveBeenCalledTimes(1);
    expect(recomputeWindowForUser).not.toHaveBeenCalled();
  });

  it("expands window from impacted events on commit mode", async () => {
    findMany.mockResolvedValue([
      {
        id: "evt_1",
        startAt: new Date("2026-05-11T02:00:00.000Z"),
        endAt: new Date("2026-05-11T03:00:00.000Z")
      },
      {
        id: "evt_2",
        startAt: new Date("2026-05-11T05:00:00.000Z"),
        endAt: new Date("2026-05-11T06:00:00.000Z")
      }
    ]);
    recomputeWindowForUser.mockResolvedValueOnce({
      jobId: "job_1",
      result: { feasible: true, solver: "heuristics", score: 1, moves: [], unscheduled_event_ids: [], explanations: {} }
    });

    const { POST } = await import("@/app/api/scheduling/dynamic-replan/route");
    const response = await POST(
      new Request("http://localhost/api/scheduling/dynamic-replan", {
        method: "POST",
        body: JSON.stringify({
          mode: "COMMIT",
          impactedEventIds: ["evt_1", "evt_2"],
          expandBeforeHours: 2,
          expandAfterHours: 4
        })
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mode).toBe("COMMIT");
    expect(body.window.source).toBe("impacted-events");
    expect(body.jobId).toBe("job_1");
    expect(recomputeWindowForUser).toHaveBeenCalledTimes(1);

    const callArg = recomputeWindowForUser.mock.calls[0][0];
    expect(callArg.windowStart.toISOString()).toBe("2026-05-11T00:00:00.000Z");
    expect(callArg.windowEnd.toISOString()).toBe("2026-05-11T10:00:00.000Z");
  });
});
