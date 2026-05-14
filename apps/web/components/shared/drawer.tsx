"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}

const widthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg"
};

export function Drawer({ open, title, children, onClose, footer, width = "md" }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity duration-300",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "absolute inset-0 bg-[rgba(100,90,82,0.10)] backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full flex-col bg-white shadow-[-8px_0_40px_rgba(100,90,82,0.08)] transition-transform duration-300",
          widthMap[width],
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-4 shrink-0">
          {title && (
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
          )}
          <button
            className={cn(
              "ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "text-[var(--color-text-muted)] transition-all duration-120",
              "hover:bg-[var(--color-btn-ghost)] hover:text-[var(--color-text-primary)]"
            )}
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-[var(--color-border-subtle)] px-5 py-4">{footer}</footer>
        )}
      </aside>
    </div>
  );
}
