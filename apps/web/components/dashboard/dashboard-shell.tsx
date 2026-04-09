"use client";

import { ReactNode } from "react";
import { AppProviders } from "@/lib/query/providers";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { TopBar } from "@/components/dashboard/top-bar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const syncCalendars = async () => {
    await fetch("/api/calendars/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ force: true }) });
  };

  return (
    <AppProviders>
      <div className="flex min-h-screen overflow-hidden bg-slate-50">
        <SidebarNav />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">
            <TopBar onSync={syncCalendars} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </main>
      </div>
    </AppProviders>
  );
}
