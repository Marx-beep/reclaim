import { describe, expect, it } from "vitest";
import { plannerSettings } from "@/lib/planner-prototype/data/mockEvents";
import { requestScheduleReplan } from "@/lib/planner-prototype/utils/replanClient";

describe("planner overlap replan", () => {
  it("allows a temporary overlap after dragging and resolves it by priority", async () => {
    const result = await requestScheduleReplan({
      currentEvents: [
        {
          id: "high",
          title: "High priority work",
          type: "task",
          day: 1,
          startHour: 9,
          duration: 1,
          priority: "P1",
          status: "scheduled",
          movable: true,
          fixed: false,
          flexible: true,
          energyLevel: "high",
          aiGenerated: false
        },
        {
          id: "low",
          title: "Low priority work",
          type: "task",
          day: 1,
          startHour: 11,
          duration: 1,
          priority: "P4",
          status: "scheduled",
          movable: true,
          fixed: false,
          flexible: true,
          energyLevel: "low",
          aiGenerated: false
        }
      ],
      currentTasks: [],
      action: {
        kind: "drag",
        eventId: "low",
        day: 1,
        startHour: 9,
        focusDay: 1,
        allowOverlap: true,
        conflictStrategy: "ai_replan"
      },
      settings: plannerSettings
    });

    const high = result.events.find((event) => event.id === "high");
    const low = result.events.find((event) => event.id === "low");
    expect(high?.startHour).toBe(9);
    expect(low?.startHour).toBeGreaterThanOrEqual(10);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
