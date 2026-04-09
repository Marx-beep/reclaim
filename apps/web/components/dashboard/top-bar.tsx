"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { t } from "@/lib/i18n";

export function TopBar({ onSync }: { onSync: () => void }) {
  const copy = t("topBar");
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{copy.today}</div>
        <h1 className="text-lg font-semibold">{format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}</h1>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone="success">{copy.syncReady}</Badge>
        <Button variant="secondary" onClick={onSync}>
          {copy.syncCalendars}
        </Button>
      </div>
    </header>
  );
}
