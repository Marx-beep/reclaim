import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { buildQuadrantBuckets, classifyTaskQuadrant, type QuadrantTask } from "@/lib/dashboard/quadrants";

function task(input: Partial<QuadrantTask> & { id: string; priority?: "P1" | "P2" | "P3" | "P4"; dueAt?: string | null }): QuadrantTask {
  return {
    id: input.id,
    smartEvent: {
      title: `Task ${input.id}`,
      priority: input.priority ?? "P3",
      dueAt: input.dueAt ?? null,
      status: "SCHEDULED"
    }
  };
}

describe("quadrant classification", () => {
  const now = Temporal.Instant.from("2026-04-09T00:00:00Z");

  it("marks high-priority near deadline task as importantUrgent", () => {
    const result = classifyTaskQuadrant(task({ id: "a", priority: "P1", dueAt: "2026-04-09T20:00:00Z" }), now);
    expect(result).toBe("importantUrgent");
  });

  it("marks high-priority far deadline task as importantNotUrgent", () => {
    const result = classifyTaskQuadrant(task({ id: "b", priority: "P2", dueAt: "2026-04-12T00:00:00Z" }), now);
    expect(result).toBe("importantNotUrgent");
  });

  it("rebalance keeps quadrant one from over-crowding", () => {
    const tasks: QuadrantTask[] = [
      task({ id: "1", priority: "P1", dueAt: "2026-04-09T06:00:00Z" }),
      task({ id: "2", priority: "P1", dueAt: "2026-04-09T07:00:00Z" }),
      task({ id: "3", priority: "P1", dueAt: "2026-04-09T08:00:00Z" }),
      task({ id: "4", priority: "P1", dueAt: "2026-04-09T09:00:00Z" }),
      task({ id: "5", priority: "P2", dueAt: "2026-04-10T00:00:00Z" }),
      task({ id: "6", priority: "P3", dueAt: null })
    ];

    const buckets = buildQuadrantBuckets(tasks, now);
    expect(buckets.importantUrgent.length).toBeLessThanOrEqual(3);
    expect(buckets.importantNotUrgent.length).toBeGreaterThanOrEqual(1);
  });
});

