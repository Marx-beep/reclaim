// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSchedulingLinkAvailability = vi.fn();

vi.mock("@/lib/server/scheduling-links", () => ({
  getSchedulingLinkAvailability
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/links/[slug]/availability", () => {
  it("returns 404 when link does not exist", async () => {
    getSchedulingLinkAvailability.mockResolvedValueOnce(null);
    const { GET } = await import("@/app/api/links/[slug]/availability/route");
    const response = await GET(new Request("http://localhost/api/links/unknown/availability"), {
      params: Promise.resolve({ slug: "unknown" })
    });

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.message).toContain("not found");
  });

  it("returns normalized link and slots", async () => {
    getSchedulingLinkAvailability.mockResolvedValueOnce({
      link: {
        id: "l_1",
        slug: "intro-30",
        title: "Intro 30",
        durationMinutes: 30,
        noticeMinutes: 120,
        minSchedulingHours: 12,
        maxSchedulingDays: 30
      },
      slots: ["2026-04-09T10:00:00.000Z"]
    });

    const { GET } = await import("@/app/api/links/[slug]/availability/route");
    const response = await GET(
      new Request("http://localhost/api/links/intro-30/availability?from=2026-04-09T00:00:00.000Z&to=2026-04-16T00:00:00.000Z"),
      { params: Promise.resolve({ slug: "intro-30" }) }
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.link.slug).toBe("intro-30");
    expect(payload.slots).toHaveLength(1);
  });
});
