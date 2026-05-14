import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-y bg-white text-[var(--color-text-primary)]",
          "placeholder-[var(--color-text-muted)]",
          "border border-[var(--color-border-default)] rounded-lg px-3 py-2.5 text-sm",
          "transition-all duration-[160ms]",
          "focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-lighter)] focus:ring-opacity-50",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-page-subtle)]",
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
