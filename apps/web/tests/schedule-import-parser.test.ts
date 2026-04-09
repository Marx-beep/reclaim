import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { parseScheduleText } from "@/lib/server/schedule-import/parser";

describe("parseScheduleText", () => {
  it("parses explicit date and time range", () => {
    const result = parseScheduleText({
      text: "2026-04-10 08:00-09:30 高等数学",
      timezone: "Asia/Shanghai",
      baseDate: "2026-04-06"
    });

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0].title).toContain("高等数学");
    expect(result.parsed[0].confidence).toBeGreaterThan(0.9);
  });

  it("parses weekday line and maps to next weekday", () => {
    const result = parseScheduleText({
      text: "周三 14:00-15:30 软件工程",
      timezone: "Asia/Shanghai",
      baseDate: "2026-04-06" // Monday
    });

    expect(result.parsed).toHaveLength(1);
    const expectedStart = Temporal.PlainDate.from("2026-04-08")
      .toZonedDateTime({ timeZone: "Asia/Shanghai", plainTime: "14:00" })
      .toInstant()
      .toString();
    expect(result.parsed[0].startAt).toBe(expectedStart);
    expect(result.parsed[0].title).toContain("软件工程");
  });

  it("skips lines without recognizable time range", () => {
    const result = parseScheduleText({
      text: "这是一段没有时间范围的描述",
      timezone: "Asia/Shanghai",
      baseDate: "2026-04-06"
    });

    expect(result.parsed).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it("parses class periods like 第1-2节", () => {
    const result = parseScheduleText({
      text: "周一 第1-2节 高等数学",
      timezone: "Asia/Shanghai",
      baseDate: "2026-04-06"
    });

    expect(result.parsed).toHaveLength(1);
    const first = result.parsed[0];
    expect(first.title).toContain("高等数学");
    expect(first.startAt).toContain("T00:00:00Z");
    expect(first.endAt).toContain("T01:40:00Z");
  });
});
