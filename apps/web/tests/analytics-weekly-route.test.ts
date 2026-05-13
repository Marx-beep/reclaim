// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateCurrentUserId = vi.fn();

const prisma = {
  user: { findUnique: vi.fn() },
  timePolicy: { findUnique: vi.fn() },
  smartEvent: { findMany: vi.fn() },
  analyticsSnapshot: { upsert: vi.fn() }
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

describe("GET /api/analytics/weekly", () => {
  it("returns enriched analytics payload", async () => {
    const now = Date.now();
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    prisma.user.findUnique.mockResolvedValueOnce({ timezone: "Asia/Shanghai" });
    prisma.timePolicy.findUnique.mockResolvedValueOnce({
      defaultTimezone: "Asia/Shanghai",
      focusTargetMinutesPerDay: 120,
      workdayStart: "09:00",
      workdayEnd: "18:00"
    });
    prisma.smartEvent.findMany.mockResolvedValueOnce([
      {
        id: "e1",
        type: "FOCUS",
        title: "Focus",
        startAt: new Date(now - 24 * 60 * 60_000),
        endAt: new Date(now - 23 * 60 * 60_000),
        metadata: null,
        recurrenceRule: null,
        status: "SCHEDULED"
      },
      {
        id: "e2",
        type: "MEETING",
        title: "Meeting",
        startAt: new Date(now - 22 * 60 * 60_000),
        endAt: new Date(now - 21 * 60 * 60_000),
        metadata: null,
        recurrenceRule: null,
        status: "SCHEDULED"
      }
    ]);
    prisma.analyticsSnapshot.upsert.mockResolvedValueOnce({});

    const { GET } = await import("@/app/api/analytics/weekly/route");
    const response = await GET(new Request("http://localhost/api/analytics/weekly?days=14"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.breakdown).toBeDefined();
    expect(payload.trend).toBeDefined();
    expect(payload.insights).toBeDefined();
    expect(payload.focusMinutes).toBeGreaterThan(0);
  });
});
