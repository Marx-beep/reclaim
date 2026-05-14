import { X, RotateCcw, Filter } from "lucide-react";
import type { FilterState } from "../types/filters";
import { FILTER_OPTIONS, getActiveFilterCount } from "../types/filters";
import { FilterTagGroup } from "./FilterTagGroup";

interface FilterPanelProps {
  filterState: FilterState;
  onToggle: (category: keyof FilterState, value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export function FilterPanel({
  filterState,
  onToggle,
  onClear,
  onClose
}: FilterPanelProps) {
  const activeCount = getActiveFilterCount(filterState);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[360px] rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">筛选</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-page-subtle)] hover:text-[var(--color-text-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[400px] space-y-4 overflow-y-auto pr-1">
        <FilterTagGroup
          label="日程类型"
          options={FILTER_OPTIONS.eventTypes}
          selectedValues={filterState.eventTypes}
          onToggle={(value) => onToggle("eventTypes", value)}
        />

        <FilterTagGroup
          label="任务优先级"
          options={FILTER_OPTIONS.priorities}
          selectedValues={filterState.priorities}
          onToggle={(value) => onToggle("priorities", value)}
        />

        <FilterTagGroup
          label="能量需求"
          options={FILTER_OPTIONS.energies}
          selectedValues={filterState.energies}
          onToggle={(value) => onToggle("energies", value)}
        />

        <FilterTagGroup
          label="截止日期"
          options={FILTER_OPTIONS.dueDates}
          selectedValues={filterState.dueDates}
          onToggle={(value) => onToggle("dueDates", value)}
        />

        <FilterTagGroup
          label="排程状态"
          options={FILTER_OPTIONS.scheduleStatuses}
          selectedValues={filterState.scheduleStatuses}
          onToggle={(value) => onToggle("scheduleStatuses", value)}
        />
      </div>

      <div className="mt-4 flex items-center justify-end border-t border-[var(--color-border-subtle)] pt-3">
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
            activeCount > 0
              ? "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page-subtle)] hover:text-[var(--color-text-primary)]"
              : "cursor-not-allowed text-[var(--color-text-muted)]"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          清除筛选
        </button>
      </div>
    </div>
  );
}
