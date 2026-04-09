"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarBoard, type CalendarEvent } from "@/components/calendar/calendar-board";
import { SmartSuggestionsPanel } from "@/components/dashboard/smart-suggestions";
import { EventDetailDrawer } from "@/components/dashboard/event-detail-drawer";
import { QuickCreatePanel } from "@/components/dashboard/quick-create";
import { ScheduleImportPanel } from "@/components/dashboard/schedule-import-panel";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

export default function DashboardPage() {
  const copy = t("dashboard");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [manualRange, setManualRange] = useState<{ start: string; end: string } | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: () => apiFetch<Array<{ id: string; title: string; startAt: string; endAt: string; metadata?: Record<string, unknown> }>>("/api/events")
  });

  const events: CalendarEvent[] = (eventsQuery.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    start: item.startAt,
    end: item.endAt,
    extendedProps: item.metadata
  }));

  const todaysCount = useMemo(() => {
    const now = new Date();
    return events.filter((item) => {
      const date = new Date(item.start);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;
  }, [events]);

  return (
    <>
      <div className="mx-auto w-full max-w-[1680px] space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{copy.todayEvents}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{todaysCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{copy.loadedEvents}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{events.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{copy.currentView}</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{copy.currentViewWeek}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <CalendarBoard events={events} onSelectEvent={setSelected} onSelectTimeRange={setManualRange} />
          </div>

          <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
            <SmartSuggestionsPanel />
            <QuickCreatePanel selectedRange={manualRange} />
            <ScheduleImportPanel />
          </div>
        </div>
      </div>
      <EventDetailDrawer event={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </>
  );
}
