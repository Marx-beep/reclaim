"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Drawer({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className={cn("fixed inset-0 z-40 transition", open ? "pointer-events-auto" : "pointer-events-none")}>
      <div className={cn("absolute inset-0 bg-black/20 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button className="text-sm text-slate-500" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="p-4">{children}</div>
      </aside>
    </div>
  );
}
