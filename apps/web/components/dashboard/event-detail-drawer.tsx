"use client";

import { Drawer } from "@/components/shared/drawer";
import { t } from "@/lib/i18n";

type SelectedEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps?: Record<string, unknown>;
};

export function EventDetailDrawer({ event, open, onClose }: { event: SelectedEvent | null; open: boolean; onClose: () => void }) {
  const copy = t("dashboard");
  return (
    <Drawer open={open} title={copy.eventDetails} onClose={onClose}>
      {!event ? <div className="text-sm text-slate-500">{copy.noEventSelected}</div> : null}
      {event ? (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase text-slate-400">{copy.eventTitle}</div>
            <div className="font-medium text-slate-900">{event.title}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">{copy.eventStart}</div>
            <div>{new Date(event.start).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">{copy.eventEnd}</div>
            <div>{new Date(event.end).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">{copy.eventMeta}</div>
            <pre className="overflow-auto rounded bg-slate-50 p-2 text-xs">{JSON.stringify(event.extendedProps ?? {}, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
