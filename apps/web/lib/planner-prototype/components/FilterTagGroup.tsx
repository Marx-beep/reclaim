interface FilterTagGroupProps {
  label: string;
  options: readonly { value: string; label: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

export function FilterTagGroup({
  label,
  options,
  selectedValues,
  onToggle
}: FilterTagGroupProps) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-medium text-[var(--color-text-secondary)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                isSelected
                  ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-lighter)] text-[var(--color-primary)]"
                  : "border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
