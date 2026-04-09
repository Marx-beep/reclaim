"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { apiFetch } from "@/lib/api/client";
import { t } from "@/lib/i18n";

type Suggestion = {
  eventId: string;
  reason: string;
};

type PreviewResponse = {
  moves: Array<{ event_id: string; reason_text: string }>;
};

export function SmartSuggestionsPanel() {
  const copy = t("dashboard");
  const preview = useMutation({
    mutationFn: async () => apiFetch<PreviewResponse>("/api/scheduling/preview", { method: "POST", body: JSON.stringify({ horizonDays: 7 }) })
  });

  const analytics = useQuery({
    queryKey: ["weekly-analytics"],
    queryFn: () => apiFetch<{ focusMinutes: number; meetingMinutes: number }>("/api/analytics/weekly")
  });

  const suggestions: Suggestion[] =
    preview.data?.moves.map((move) => ({
      eventId: move.event_id,
      reason: move.reason_text
    })) ?? [];

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>{copy.suggestions}</CardTitle>
        <CardContent>
          <Button variant="secondary" className="mb-3 w-full" onClick={() => preview.mutate()}>
            {copy.recompute}
          </Button>
          <div className="space-y-2 text-sm">
            {suggestions.length === 0 ? <div className="text-slate-500">{copy.noSuggestions}</div> : null}
            {suggestions.map((suggestion) => (
              <div key={suggestion.eventId} className="rounded-md border border-slate-200 p-2 text-slate-700">
                <div className="font-medium">{suggestion.eventId}</div>
                <div className="text-xs text-slate-500">{suggestion.reason}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardTitle>{copy.weekSnapshot}</CardTitle>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <div className="flex justify-between">
            <span>{copy.focus}</span>
            <span>{analytics.data?.focusMinutes ?? 0}m</span>
          </div>
          <div className="flex justify-between">
            <span>{copy.meetings}</span>
            <span>{analytics.data?.meetingMinutes ?? 0}m</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
