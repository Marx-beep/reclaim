// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateCurrentUserId = vi.fn();
const prisma = {
  user: { count: vi.fn() },
  externalCalendar: { count: vi.fn() },
  smartEvent: { count: vi.fn() },
  task: { count: vi.fn() },
  schedulingLink: { count: vi.fn() },
  rescheduleJob: { count: vi.fn() },
  schedulingDecision: { count: vi.fn() }
};

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId
}));

vi.mock("@/lib/server/db", () => ({
  prisma
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/overview", () => {
  it("returns ops overview metrics", async () => {
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    prisma.user.count.mockResolvedValueOnce(3);
    prisma.externalCalendar.count.mockResolvedValueOnce(5);
    prisma.smartEvent.count.mockResolvedValueOnce(12);
    prisma.task.count.mockResolvedValueOnce(4);
    prisma.schedulingLink.count.mockResolvedValueOnce(2);
    prisma.rescheduleJob.count.mockResolvedValueOnce(8);
    prisma.schedulingDecision.count.mockResolvedValueOnce(16);

    const { GET } = await import("@/app/api/admin/overview/route");
    const response = await GET(new Request("http://localhost/api/admin/overview", { headers: { cookie: "ops_auth=test" } }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.users).toBe(3);
    expect(payload.linksActive).toBe(2);
    expect(payload.decisions24h).toBe(16);
  });
});
