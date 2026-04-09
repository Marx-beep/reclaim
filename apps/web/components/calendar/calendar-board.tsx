"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import zhCnLocale from "@fullcalendar/core/locales/zh-cn";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps?: Record<string, unknown>;
};

export function CalendarBoard({
  events,
  onSelectEvent,
  onSelectTimeRange
}: {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectTimeRange?: (range: { start: string; end: string }) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        locale={zhCnLocale}
        initialView="timeGridWeek"
        nowIndicator
        slotMinTime="06:00:00"
        scrollTime="06:00:00"
        allDaySlot={false}
        slotEventOverlap={false}
        expandRows
        stickyHeaderDates
        height="calc(100vh - 250px)"
        selectable
        selectMirror
        events={events}
        datesSet={(info) => setCurrentDate(info.start)}
        // Drag-to-select sends a prefill range for manual creation on the right panel.
        select={(info) =>
          onSelectTimeRange?.({
            start: info.start.toISOString(),
            end: info.end.toISOString()
          })
        }
        eventClick={(info) => {
          const found = events.find((item) => item.id === info.event.id);
          if (found) onSelectEvent(found);
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        }}
        buttonText={{
          today: "今天",
          month: "月",
          week: "周",
          day: "日"
        }}
      />
      <div className="px-2 py-1 text-xs text-slate-500">当前周起始：{currentDate.toLocaleDateString("zh-CN")}</div>
    </div>
  );
}
