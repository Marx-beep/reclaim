"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";

export default function OpsLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/ops/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ message: "登录失败，请检查管理口令。" }));
        throw new Error(payload.message ?? "登录失败，请检查管理口令。");
      }
      router.replace("/ops");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败，请检查管理口令。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md p-6">
        <CardTitle className="text-xl">运营后台登录</CardTitle>
        <CardContent className="mt-4">
          <p className="mb-4 text-sm text-slate-500">这里是维护者入口，用于监控系统健康、用户规模和 AI 调度用量。</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1 text-sm text-slate-700">
              <span className="font-medium">管理口令</span>
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="默认：reclaim-admin" />
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "正在验证..." : "进入后台"}
            </Button>
            {error ? <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</div> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
