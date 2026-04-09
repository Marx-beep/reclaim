import { describe, expect, it } from "vitest";
import { expandOccurrences } from "./expand";

describe("expandOccurrences", () => {
  it("expands recurring habit correctly", () => {
    const result = expandOccurrences({
      rrule: "FREQ=DAILY;COUNT=3",
      dtstart: "2026-04-10T01:00:00.000Z",
      betweenStart: "2026-04-10T00:00:00.000Z",
      betweenEnd: "2026-04-15T00:00:00.000Z"
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("2026-04-10T01:00:00.000Z");
  });
});
