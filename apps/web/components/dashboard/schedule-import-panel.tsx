"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { t } from "@/lib/i18n";

type ImportResult = {
  timezone: string;
  importEngine: string;
  parsedCount: number;
  createdCount: number;
  skippedLines: string[];
  skippedDuplicates: string[];
  autoCreate: boolean;
};

async function uploadScheduleFile(input: { file: File; previewOnly: boolean }) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("autoCreate", String(!input.previewOnly));
  formData.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  const response = await fetch("/api/import/time-arrangement", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "导入失败" }));
    throw new Error(payload.message ?? "导入失败");
  }

  return response.json() as Promise<ImportResult>;
}

export function ScheduleImportPanel() {
  const copy = t("dashboard");
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);

  const importMutation = useMutation({
    mutationFn: uploadScheduleFile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events"] });
    }
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      return;
    }
    importMutation.mutate({ file, previewOnly });
  };

  const result = importMutation.data;

  return (
    <Card>
      <CardTitle>{copy.importSchedule}</CardTitle>
      <CardContent className="space-y-3">
        <details>
          <summary className="cursor-pointer text-sm font-medium text-slate-800">{copy.importDescription}</summary>
          <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
            <label className="block text-xs text-slate-600">
              {copy.importPickFile}
              <input
                className="mt-1 block w-full text-sm"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.bmp,.pdf,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={previewOnly}
                onChange={(event) => setPreviewOnly(event.target.checked)}
              />
              {copy.importPreviewOnly}
            </label>

            <Button type="submit" className="w-full" disabled={!file || importMutation.isPending}>
              {importMutation.isPending ? copy.importRunning : copy.importRun}
            </Button>
          </form>
        </details>

        {importMutation.error ? <div className="text-xs text-red-600">{importMutation.error.message}</div> : null}

        {result ? (
          <div className="rounded border border-slate-200 p-2 text-xs text-slate-700">
            <div className="mb-1 font-medium">{copy.importResult}</div>
            <div>
              {copy.importParsed}: {result.parsedCount}
            </div>
            <div>
              {copy.importCreated}: {result.createdCount}
            </div>
            <div>
              {copy.importSkipped}: {result.skippedLines.length + result.skippedDuplicates.length}
            </div>
            <div>Engine: {result.importEngine}</div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
