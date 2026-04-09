// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateCurrentUserId = vi.fn();
const extractTextFromScheduleFile = vi.fn();
const parseScheduleText = vi.fn();
const recomputeWindowSafely = vi.fn();
const userFindUnique = vi.fn();
const policyFindUnique = vi.fn();
const txFindFirst = vi.fn();
const txCreate = vi.fn();

const prisma = {
  user: { findUnique: userFindUnique },
  timePolicy: { findUnique: policyFindUnique },
  $transaction: vi.fn(async (fn: any) =>
    fn({
      smartEvent: {
        findFirst: txFindFirst,
        create: txCreate
      }
    })
  )
};

vi.mock("@/lib/auth/session", () => ({
  getOrCreateCurrentUserId
}));

vi.mock("@/lib/server/schedule-import/extract", () => ({
  extractTextFromScheduleFile
}));

vi.mock("@/lib/server/schedule-import/parser", () => ({
  parseScheduleText
}));

vi.mock("@/lib/server/recompute", () => ({
  recomputeWindowSafely
}));

vi.mock("@/lib/server/db", () => ({
  prisma
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/import/schedule", () => {
  it("imports parsed schedule entries and triggers recompute", async () => {
    getOrCreateCurrentUserId.mockResolvedValueOnce("u1");
    userFindUnique.mockResolvedValueOnce({ timezone: "Asia/Shanghai" });
    policyFindUnique.mockResolvedValueOnce({ defaultTimezone: "Asia/Shanghai" });
    extractTextFromScheduleFile.mockResolvedValueOnce({ text: "raw text", engine: "pdf" });
    parseScheduleText.mockReturnValueOnce({
      parsed: [
        {
          sourceLine: "周三 14:00-15:30 软件工程",
          title: "软件工程",
          startAt: "2026-04-08T06:00:00.000Z",
          endAt: "2026-04-08T07:30:00.000Z",
          confidence: 0.8
        }
      ],
      skipped: []
    });
    txFindFirst.mockResolvedValueOnce(null);
    txCreate.mockResolvedValueOnce({
      id: "evt_1",
      startAt: new Date("2026-04-08T06:00:00.000Z"),
      endAt: new Date("2026-04-08T07:30:00.000Z")
    });
    recomputeWindowSafely.mockResolvedValueOnce({ jobId: "job_1" });

    const form = new FormData();
    form.append("file", new File(["demo"], "schedule.pdf", { type: "application/pdf" }));

    const { POST } = await import("@/app/api/import/schedule/route");
    const response = await POST(
      new Request("http://localhost/api/import/schedule", {
        method: "POST",
        body: form
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.createdCount).toBe(1);
    expect(recomputeWindowSafely).toHaveBeenCalledTimes(1);
  });
});
