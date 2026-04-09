import { describe, expect, it } from "vitest";
import { buildSchedulerPayload } from "@/lib/server/scheduler";

describe("buildSchedulerPayload", () => {
  it("keeps event lock state and due date fields", () => {
    const payload = buildSchedulerPayload({
      userId: "u1",
      windowStart: new Date("2026-04-09T00:00:00.000Z"),
      windowEnd: new Date("2026-04-10T00:00:00.000Z"),
      events: [
        {
          id: "e1",
          userId: "u1",
          calendarId: null,
          parentEventId: null,
          type: "TASK",
          title: "Task",
          description: null,
          startAt: new Date("2026-04-09T08:00:00.000Z"),
          endAt: new Date("2026-04-09T09:00:00.000Z"),
          timezone: "UTC",
          priority: "P1",
          status: "SCHEDULED",
          flexibility: "FLEXIBLE",
          lockState: "FREE",
          source: "INTERNAL",
          recurrenceRule: null,
          dueAt: new Date("2026-04-09T12:00:00.000Z"),
          energyProfile: null,
          isAllDay: false,
          metadata: {},
          softLockAt: null,
          hardLockAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        }
      ] as any
    });

    expect(payload.events[0].lock_state).toBe("FREE");
    expect(payload.events[0].due_at).toBe("2026-04-09T12:00:00.000Z");
  });
});
