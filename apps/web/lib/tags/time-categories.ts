export const CATEGORY_TAG_VALUES = [
  "WORK",
  "STUDY",
  "MEETING",
  "DEEP_WORK",
  "ADMIN",
  "PROJECT",
  "READING",
  "WRITING",
  "EXERCISE",
  "HEALTH",
  "FAMILY",
  "SOCIAL",
  "ENTERTAINMENT",
  "FINANCE",
  "COMMUTE",
  "CHORES",
  "REST",
  "TRAVEL",
  "PERSONAL",
  "OTHER"
] as const;

export type CategoryTag = (typeof CATEGORY_TAG_VALUES)[number];

export const CATEGORY_TAG_OPTIONS: Array<{ value: CategoryTag; label: string }> = [
  { value: "WORK", label: "工作" },
  { value: "STUDY", label: "学习" },
  { value: "MEETING", label: "会议" },
  { value: "DEEP_WORK", label: "深度工作" },
  { value: "ADMIN", label: "行政事务" },
  { value: "PROJECT", label: "项目推进" },
  { value: "READING", label: "阅读" },
  { value: "WRITING", label: "写作" },
  { value: "EXERCISE", label: "运动" },
  { value: "HEALTH", label: "健康" },
  { value: "FAMILY", label: "家庭" },
  { value: "SOCIAL", label: "社交" },
  { value: "ENTERTAINMENT", label: "娱乐" },
  { value: "FINANCE", label: "财务" },
  { value: "COMMUTE", label: "通勤" },
  { value: "CHORES", label: "家务" },
  { value: "REST", label: "休息" },
  { value: "TRAVEL", label: "出行" },
  { value: "PERSONAL", label: "个人事务" },
  { value: "OTHER", label: "其他" }
];

const CATEGORY_TAG_SET = new Set<string>(CATEGORY_TAG_VALUES);

export function normalizeCategoryTag(input: string | undefined | null, fallback: CategoryTag = "OTHER"): CategoryTag {
  if (!input) return fallback;
  const value = input.trim().toUpperCase();
  return CATEGORY_TAG_SET.has(value) ? (value as CategoryTag) : fallback;
}

export function normalizeCustomTags(input: string[] | undefined | null): string[] {
  if (!input || input.length === 0) return [];
  const cleaned = input
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
  return Array.from(new Set(cleaned));
}

export function categoryTagLabel(value: string | null | undefined) {
  const found = CATEGORY_TAG_OPTIONS.find((item) => item.value === value);
  return found?.label ?? "其他";
}

export function buildTagMetadata(
  previous: Record<string, unknown> | null | undefined,
  input: {
    categoryTag?: string | null;
    customTags?: string[] | null;
    fallbackCategory?: CategoryTag;
  }
) {
  const categoryTag = normalizeCategoryTag(input.categoryTag, input.fallbackCategory ?? "OTHER");
  const customTags = normalizeCustomTags(input.customTags);

  return {
    ...(previous ?? {}),
    categoryTag,
    customTags,
    // Keep backward-compatible field for old clients/tests.
    tags: customTags
  };
}

