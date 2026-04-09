import { describe, expect, it } from "vitest";
import { buildTagMetadata, normalizeCategoryTag, normalizeCustomTags } from "@/lib/tags/time-categories";

describe("time category helpers", () => {
  it("normalizes unknown category to fallback", () => {
    expect(normalizeCategoryTag("unknown", "WORK")).toBe("WORK");
    expect(normalizeCategoryTag("meeting", "WORK")).toBe("MEETING");
  });

  it("deduplicates custom tags", () => {
    expect(normalizeCustomTags(["复盘", "复盘", " 深度工作 ", ""])).toEqual(["复盘", "深度工作"]);
  });

  it("builds backward compatible metadata fields", () => {
    const metadata = buildTagMetadata(
      { source: "test" },
      { categoryTag: "STUDY", customTags: ["期末", "期末"], fallbackCategory: "WORK" }
    );
    expect(metadata.categoryTag).toBe("STUDY");
    expect(metadata.customTags).toEqual(["期末"]);
    expect(metadata.tags).toEqual(["期末"]);
  });
});

