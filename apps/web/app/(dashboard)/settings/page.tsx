"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

type TimePolicy = {
  defaultTimezone: string;
  workdayStart: string;
  workdayEnd: string;
  softLockLeadHours: number;
  hardLockLeadHours: number;
};

export default function SettingsPage() {
  const copy = t("settings");
  const query = useQuery({
    queryKey: ["time-policy"],
    queryFn: () => apiFetch<TimePolicy>("/api/settings/time-policy")
  });

  const mutation = useMutation({
    mutationFn: (payload: TimePolicy) =>
      apiFetch<TimePolicy>("/api/settings/time-policy", {
        method: "PUT",
        body: JSON.stringify(payload)
      })
  });

  const [form, setForm] = useState<TimePolicy>({
    defaultTimezone: "UTC",
    workdayStart: "09:00",
    workdayEnd: "18:00",
    softLockLeadHours: 24,
    hardLockLeadHours: 4
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  const current = query.data ?? form;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{copy.calendarSync}</CardTitle>
        <CardContent className="flex gap-2">
          <a href="/api/calendars/connect/google" className="rounded border px-3 py-2 text-sm">
            {copy.connectGoogle}
          </a>
          <a href="/api/calendars/connect/outlook" className="rounded border px-3 py-2 text-sm">
            {copy.connectOutlook}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{copy.timePolicy}</CardTitle>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="text-sm">
              {copy.timezone}
              <Input
                value={current.defaultTimezone}
                onChange={(e) => setForm({ ...current, defaultTimezone: e.target.value })}
              />
            </label>
            <label className="text-sm">
              {copy.workdayStart}
              <Input value={current.workdayStart} onChange={(e) => setForm({ ...current, workdayStart: e.target.value })} />
            </label>
            <label className="text-sm">
              {copy.workdayEnd}
              <Input value={current.workdayEnd} onChange={(e) => setForm({ ...current, workdayEnd: e.target.value })} />
            </label>
            <label className="text-sm">
              {copy.softLockLeadHours}
              <Input
                type="number"
                value={current.softLockLeadHours}
                onChange={(e) => setForm({ ...current, softLockLeadHours: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              {copy.hardLockLeadHours}
              <Input
                type="number"
                value={current.hardLockLeadHours}
                onChange={(e) => setForm({ ...current, hardLockLeadHours: Number(e.target.value) })}
              />
            </label>
            <div className="md:col-span-2">
              <Button type="submit">{copy.savePolicy}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
