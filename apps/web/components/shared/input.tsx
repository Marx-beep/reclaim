import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs rounded-lg",
  md: "h-9 px-3 text-sm rounded-lg",
  lg: "h-11 px-4 text-base rounded-xl"
};

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: Size;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]",
          "border border-[var(--color-border-default)]",
          "transition-all duration-[160ms]",
          "focus:outline-none focus:border-[var(--color-accent-blue)] focus:ring-2 focus:ring-[rgba(171,215,251,0.35)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-page-subtle)]",
          sizeStyles[inputSize],
          className
        )}
        disabled={disabled}
        size={undefined}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
