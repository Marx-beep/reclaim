// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateCurrentUserId = vi.fn();
const runCalendarSync = vi.fn();
const checkQueueRuntimeHealth = vi.fn();
const addReschedule = vi.fn();
const addAnalytics = vi.fn();
const addCleanup = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId
}));

vi.mock("@/lib/server/calendar-sync", () => ({
  runCalendarSync
}));

vi.mock("@/lib/server/queue-runtime", () => ({
  checkQueueRuntimeHealth
}));

vi.mock("@reclaim/queue", () => ({
  getRescheduleQueue: () => ({ add: addReschedule }),
  getAnalyticsRollupQueue: () => ({ add: addAnalytics }),
  getCleanupQueue: () => ({ add: addCleanup })
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/actions", () => {
  it("returns warning when queue is unavailable", async () => {
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    checkQueueRuntimeHealth.mockResolvedValueOnce({
      status: "degraded",
      mode: "auto",
      redisVersion: "3.0.504",
      bullmqEnabled: false,
      reason: "Redis 3.0.504 is below 6.x. BullMQ dispatch is disabled."
    });

    const { POST } = await import("@/app/api/admin/actions/route");
    const response = await POST(
      new Request("http://localhost/api/admin/actions", {
        method: "POST",
        body: JSON.stringify({ action: "recompute" })
      })
    );
    const body = await response.json();

    expect(body.queued).toBe(false);
    expect(body.warning).toContain("Redis 3.0.504");
  });

  it("queues recompute when queue is available", async () => {
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    checkQueueRuntimeHealth.mockResolvedValueOnce({
      status: "up",
      mode: "enabled",
      redisVersion: "7.2.6",
      bullmqEnabled: true,
      reason: null
    });
    addReschedule.mockResolvedValueOnce({ id: "job-1" });

    const { POST } = await import("@/app/api/admin/actions/route");
    const response = await POST(
      new Request("http://localhost/api/admin/actions", {
        method: "POST",
        body: JSON.stringify({ action: "recompute" })
      })
    );
    const body = await response.json();

    expect(body.queued).toBe(true);
    expect(body.jobId).toBe("job-1");
  });

  it("runs direct sync action", async () => {
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    runCalendarSync.mockResolvedValueOnce({ synced: 3, providers: ["GOOGLE"] });

    const { POST } = await import("@/app/api/admin/actions/route");
    const response = await POST(
      new Request("http://localhost/api/admin/actions", {
        method: "POST",
        body: JSON.stringify({ action: "sync" })
      })
    );
    const body = await response.json();

    expect(body.action).toBe("sync");
    expect(body.result.synced).toBe(3);
  });
});
