import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

type Tone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "priority";

const dotColorMap: Record<Tone, string> = {
  default: "bg-[var(--color-text-muted)]",
  success: "bg-[var(--color-accent-green-dark)]",
  warning: "bg-[var(--color-accent-amber-dark)]",
  danger: "bg-[var(--color-accent-coral)]",
  info: "bg-[var(--color-accent-blue-dark)]",
  priority: "bg-[var(--color-btn-primary-text)]"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "default", size = "md", dot = false, children, ...props }, ref) => {
    const baseStyles = toneStyles[tone];
    const sizeStyle = size === "sm" ? "px-2 py-0.5 text-[11px] rounded-full" : "px-2.5 py-1 text-xs rounded-full";

    return (
      <span ref={ref} className={cn("inline-flex items-center gap-1.5 font-medium", baseStyles, sizeStyle, className)} {...props}>
        {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColorMap[tone])} />}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

const toneStyles: Record<Tone, string> = {
  default: "bg-[var(--color-btn-solid-light)] text-[var(--color-text-secondary)] border border-[rgba(157,180,192,0.20)]",
  success: "bg-[var(--color-event-focus-light)] text-[var(--color-event-focus-text)] border border-[rgba(210,224,170,0.40)]",
  warning: "bg-[var(--color-event-meeting-light)] text-[var(--color-event-meeting-text)] border border-[rgba(252,206,180,0.40)]",
  danger: "bg-[var(--color-accent-coral-light)] text-[var(--color-accent-coral-dark)] border border-[rgba(249,140,83,0.25)]",
  info: "bg-[var(--color-event-task-light)] text-[var(--color-event-task-text)] border border-[rgba(171,215,251,0.40)]",
  priority: "bg-[var(--color-btn-primary-light)] text-[var(--color-btn-primary-text)] border border-[rgba(232,184,154,0.25)]"
};
