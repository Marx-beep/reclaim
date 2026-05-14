import { X } from "lucide-react";

interface InfoModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  lines: string[];
  onClose: () => void;
}

export function InfoModal({ open, title, subtitle, lines, onClose }: InfoModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/25 px-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold text-slate-950">{title}</h2>
            {subtitle ? <div className="mt-1 text-[13px] text-slate-500">{subtitle}</div> : null}
          </div>
          <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {lines.map((line) => (
            <div key={line} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] leading-6 text-slate-700">
              {line}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-[var(--color-btn-solid)] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[var(--color-btn-solid-hover)]"
          onClick={onClose}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
