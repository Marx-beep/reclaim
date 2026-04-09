// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
const checkQueueRuntimeHealth = vi.fn();

vi.mock("@/lib/server/db", () => ({
  prisma: {
    $queryRaw: queryRaw
  }
}));

vi.mock("@/lib/server/queue-runtime", () => ({
  checkQueueRuntimeHealth
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("GET /api/admin/health", () => {
  it("reports degraded queue when redis does not support BullMQ", async () => {
    queryRaw.mockResolvedValueOnce([1]);
    checkQueueRuntimeHealth.mockResolvedValueOnce({
      status: "degraded",
      mode: "auto",
      redisVersion: "3.0.504",
      bullmqEnabled: false,
      reason: "Redis 3.0.504 is below 6.x. BullMQ dispatch is disabled."
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })) as any);

    const { GET } = await import("@/app/api/admin/health/route");
    const response = await GET(new Request("http://localhost/api/admin/health", { headers: { cookie: "ops_auth=test" } }));
    const body = await response.json();

    expect(body.db).toBe("up");
    expect(body.scheduler).toBe("up");
    expect(body.queue).toBe("degraded");
    expect(body.queueDetails.bullmqEnabled).toBe(false);
  });
});
