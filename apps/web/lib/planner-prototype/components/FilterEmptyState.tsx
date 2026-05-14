import { RotateCcw, InboxIcon } from "lucide-react";

interface FilterEmptyStateProps {
  onClearFilters: () => void;
}

export function FilterEmptyState({ onClearFilters }: FilterEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-[320px] flex-col items-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white/60 px-6 py-10 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-bg-page-subtle)]">
          <InboxIcon className="h-6 w-6 text-[var(--color-text-muted)]" />
        </div>
        <p className="mb-1 text-[14px] font-medium text-[var(--color-text-primary)]">
          没有符合当前筛选条件的日程
        </p>
        <p className="mb-5 text-[12px] text-[var(--color-text-muted)]">
          尝试调整筛选条件或清除所有筛选以查看全部内容
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          清除筛选
        </button>
      </div>
    </div>
  );
}
