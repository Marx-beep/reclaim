"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

type SchedulingLink = {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  noticeMinutes: number;
  minSchedulingHours: number;
  maxSchedulingDays: number;
  isActive: boolean;
};

type AvailabilityResponse = {
  link: {
    id: string;
    slug: string;
    title: string;
    durationMinutes: number;
    noticeMinutes: number;
    minSchedulingHours: number;
    maxSchedulingDays: number;
  };
  slots: string[];
};

function toLocalInputValue(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default function LinksPage() {
  const copy = t("links");
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ["links"],
    queryFn: () => apiFetch<SchedulingLink[]>("/api/links")
  });

  const [title, setTitle] = useState("30分钟沟通");
  const [slug, setSlug] = useState("intro-30");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [noticeMinutes, setNoticeMinutes] = useState(120);
  const [minSchedulingHours, setMinSchedulingHours] = useState(12);
  const [maxSchedulingDays, setMaxSchedulingDays] = useState(21);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<SchedulingLink>("/api/links", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug,
          durationMinutes,
          noticeMinutes,
          minSchedulingHours,
          maxSchedulingDays
        })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["links"] });
    }
  });

  const firstSlug = linksQuery.data?.[0]?.slug ?? "";
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const effectiveSlug = selectedSlug || firstSlug;
  const [fromAt, setFromAt] = useState(toLocalInputValue(new Date()));
  const [toAt, setToAt] = useState(toLocalInputValue(new Date(Date.now() + 7 * 24 * 60 * 60_000)));
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAvailability = useMutation({
    mutationFn: async () => {
      if (!effectiveSlug) throw new Error(copy.noLinks);
      const query = new URLSearchParams({
        from: new Date(fromAt).toISOString(),
        to: new Date(toAt).toISOString()
      });
      return apiFetch<AvailabilityResponse>(`/api/links/${effectiveSlug}/availability?${query.toString()}`);
    },
    onSuccess: (data) => {
      setAvailability(data);
      setFeedback(null);
    },
    onError: (error: Error) => setFeedback(error.message)
  });

  const bookMutation = useMutation({
    mutationFn: async (startAt: string) => {
      if (!effectiveSlug) throw new Error(copy.noLinks);
      return apiFetch(`/api/links/${effectiveSlug}/book`, {
        method: "POST",
        body: JSON.stringify({
          startAt,
          attendeeName: "Demo Guest",
          attendeeEmail: "guest@example.com"
        })
      });
    },
    onSuccess: () => setFeedback(copy.booked),
    onError: (error: Error) => setFeedback(error.message)
  });

  const visibleSlots = useMemo(() => availability?.slots.slice(0, 10) ?? [], [availability?.slots]);

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>{copy.create}</CardTitle>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
            <label className="text-sm">
              {copy.title}
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="text-sm">
              {copy.slug}
              <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
            </label>
            <label className="text-sm">
              {copy.duration}
              <Input type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
            </label>
            <label className="text-sm">
              {copy.notice}
              <Input type="number" value={noticeMinutes} onChange={(event) => setNoticeMinutes(Number(event.target.value))} />
            </label>
            <label className="text-sm">
              {copy.minHours}
              <Input
                type="number"
                value={minSchedulingHours}
                onChange={(event) => setMinSchedulingHours(Number(event.target.value))}
              />
            </label>
            <label className="text-sm">
              {copy.maxDays}
              <Input type="number" value={maxSchedulingDays} onChange={(event) => setMaxSchedulingDays(Number(event.target.value))} />
            </label>
            <div className="md:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {copy.create}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{copy.activeLinks}</CardTitle>
        <CardContent className="space-y-2 text-sm">
          {(linksQuery.data ?? []).length === 0 ? <div className="text-slate-500">{copy.noLinks}</div> : null}
          {(linksQuery.data ?? []).map((link) => (
            <div key={link.id} className="rounded border p-2">
              <div className="font-medium">
                {link.title} ({link.durationMinutes}m)
              </div>
              <div className="text-xs text-slate-500">/{link.slug}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{copy.availability}</CardTitle>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <label className="text-sm md:col-span-2">
              {copy.linkLabel}
              <select
                className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
                value={effectiveSlug}
                onChange={(event) => setSelectedSlug(event.target.value)}
              >
                {(linksQuery.data ?? []).map((link) => (
                  <option key={link.id} value={link.slug}>
                    {link.title} /{link.slug}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {copy.from}
              <Input type="datetime-local" value={fromAt} onChange={(event) => setFromAt(event.target.value)} />
            </label>
            <label className="text-sm">
              {copy.to}
              <Input type="datetime-local" value={toAt} onChange={(event) => setToAt(event.target.value)} />
            </label>
          </div>
          <Button variant="secondary" onClick={() => loadAvailability.mutate()} disabled={loadAvailability.isPending}>
            {copy.loadAvailability}
          </Button>

          <div className="space-y-2 text-sm">
            {availability && visibleSlots.length === 0 ? <div className="text-slate-500">{copy.noSlots}</div> : null}
            {visibleSlots.map((slot) => (
              <div key={slot} className="flex items-center justify-between rounded border p-2">
                <span>{new Date(slot).toLocaleString("zh-CN")}</span>
                <Button variant="secondary" onClick={() => bookMutation.mutate(slot)} disabled={bookMutation.isPending}>
                  {copy.bookFirst}
                </Button>
              </div>
            ))}
          </div>

          {feedback ? <div className="text-sm text-slate-600">{feedback}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
