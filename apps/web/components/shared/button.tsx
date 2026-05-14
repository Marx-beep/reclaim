"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--color-btn-primary)] text-white border-transparent shadow-sm hover:bg-[var(--color-btn-primary-hover)] hover:shadow-md active:scale-[0.97]",
  secondary:
    "bg-[var(--color-btn-solid-light)] text-[var(--color-btn-solid-text)] border-[rgba(157,180,192,0.25)] hover:bg-[rgba(157,180,192,0.18)] hover:border-[rgba(157,180,192,0.40)] active:scale-[0.97]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-btn-ghost)] hover:text-[var(--color-text-primary)] active:scale-[0.97]",
  outline:
    "bg-transparent text-[var(--color-primary-dark)] border-[var(--color-border-default)] hover:bg-[var(--color-btn-primary-light)] hover:border-[var(--color-primary)] active:scale-[0.97]",
  danger:
    "bg-[var(--color-accent-amber)] text-white border-transparent shadow-sm hover:bg-[var(--color-accent-amber-dark)] hover:shadow-md active:scale-[0.97]",
  link:
    "bg-transparent text-[var(--color-primary-dark)] border-transparent shadow-none hover:underline hover:underline-offset-2 active:scale-[0.97]"
};

const sizeStyles: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-base gap-2.5 rounded-xl"
};

const loadingDot = "inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = "primary", size = "md", loading = false, icon, iconEnd, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-[120ms]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-blue)] focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className={loadingDot} />
              <span className={loadingDot} style={{ animationDelay: "160ms" }} />
              <span className={loadingDot} style={{ animationDelay: "320ms" }} />
            </span>
            <span className="ml-1">{children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
            {iconEnd && <span className="shrink-0">{iconEnd}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
