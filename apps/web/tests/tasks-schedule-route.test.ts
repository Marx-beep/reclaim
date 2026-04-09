// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const update = vi.fn();
const recomputeWindowSafely = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/db", () => ({
  prisma: {
    task: { findUnique },
    smartEvent: { update }
  }
}));

vi.mock("@/lib/server/recompute", () => ({
  recomputeWindowSafely
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/tasks/[id]/schedule", () => {
  it("returns 404 when task does not exist", async () => {
    findUnique.mockResolvedValueOnce(null);

    const { PATCH } = await import("@/app/api/tasks/[id]/schedule/route");
    const response = await PATCH(
      new Request("http://localhost/api/tasks/t_1/schedule", {
        method: "PATCH",
        body: JSON.stringify({
          startAt: "2026-04-10T02:00:00.000Z",
          endAt: "2026-04-10T03:00:00.000Z"
        })
      }),
      { params: Promise.resolve({ id: "t_1" }) }
    );

    expect(response.status).toBe(404);
  });

  it("updates smart event with category tag and custom tags", async () => {
    findUnique.mockResolvedValueOnce({
      id: "t_1",
      smartEventId: "evt_1",
      smartEvent: {
        id: "evt_1",
        userId: "u1",
        deletedAt: null,
        timezone: "Asia/Shanghai",
        metadata: { source: "seed" }
      }
    });

    update.mockResolvedValueOnce({
      id: "evt_1",
      startAt: new Date("2026-04-10T02:00:00.000Z"),
      endAt: new Date("2026-04-10T03:30:00.000Z")
    });

    recomputeWindowSafely.mockResolvedValueOnce({ jobId: "job_1" });

    const { PATCH } = await import("@/app/api/tasks/[id]/schedule/route");
    const response = await PATCH(
      new Request("http://localhost/api/tasks/t_1/schedule", {
        method: "PATCH",
        body: JSON.stringify({
          startAt: "2026-04-10T02:00:00.000Z",
          endAt: "2026-04-10T03:30:00.000Z",
          categoryTag: "STUDY",
          tags: ["深度工作", "深度工作", "复盘"]
        })
      }),
      { params: Promise.resolve({ id: "t_1" }) }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(body.categoryTag).toBe("STUDY");
    expect(body.customTags).toEqual(["深度工作", "复盘"]);
    expect(body.tags).toEqual(["深度工作", "复盘"]);

    const payload = update.mock.calls[0][0].data.metadata;
    expect(payload.categoryTag).toBe("STUDY");
    expect(payload.customTags).toEqual(["深度工作", "复盘"]);
  });
});
