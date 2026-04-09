// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const bookSchedulingLink = vi.fn();

vi.mock("@/lib/server/scheduling-links", () => ({
  bookSchedulingLink
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/links/[slug]/book", () => {
  it("returns 404 when link is missing", async () => {
    bookSchedulingLink.mockResolvedValueOnce({ error: "Scheduling link not found" });
    const { POST } = await import("@/app/api/links/[slug]/book/route");
    const response = await POST(
      new Request("http://localhost/api/links/missing/book", {
        method: "POST",
        body: JSON.stringify({ startAt: "2026-04-10T02:00:00.000Z" })
      }),
      { params: Promise.resolve({ slug: "missing" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 201 for successful booking", async () => {
    bookSchedulingLink.mockResolvedValueOnce({
      link: { id: "l_1", slug: "intro-30", title: "Intro 30" },
      meeting: { id: "evt_1" },
      buffers: [],
      recompute: { jobId: "job_1" }
    });

    const { POST } = await import("@/app/api/links/[slug]/book/route");
    const response = await POST(
      new Request("http://localhost/api/links/intro-30/book", {
        method: "POST",
        body: JSON.stringify({
          startAt: "2026-04-10T02:00:00.000Z",
          attendeeName: "Demo",
          attendeeEmail: "demo@example.com"
        })
      }),
      { params: Promise.resolve({ slug: "intro-30" }) }
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.meeting.id).toBe("evt_1");
  });
});
