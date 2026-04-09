// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const create = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId: vi.fn(async () => "u1")
}));

vi.mock("@/lib/server/db", () => ({
  prisma: {
    timePolicy: {
      findUnique,
      create
    }
  }
}));

describe("GET /api/settings/time-policy", () => {
  it("returns existing policy", async () => {
    findUnique.mockResolvedValueOnce({
      defaultTimezone: "UTC",
      workdayStart: "09:00",
      workdayEnd: "18:00",
      softLockLeadHours: 24,
      hardLockLeadHours: 4
    });

    const { GET } = await import("@/app/api/settings/time-policy/route");
    const response = await GET();
    const body = await response.json();

    expect(body.defaultTimezone).toBe("UTC");
  });
});
