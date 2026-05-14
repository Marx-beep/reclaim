"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/shared/button";
import { Badge } from "@/components/shared/badge";
import { t } from "@/lib/i18n";

export function TopBar({ onSync }: { onSync: () => void }) {
  const copy = t("topBar");
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] bg-white px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-xs text-[var(--color-text-muted)]">{copy.today}</div>
        <h1 className="truncate text-base font-semibold leading-tight">{format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone="success">{copy.syncReady}</Badge>
        <Button variant="secondary" size="sm" onClick={onSync}>
          {copy.syncCalendars}
        </Button>
      </div>
    </header>
  );
}
