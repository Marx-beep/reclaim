"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardTitle } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
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
        const payload = await response.json().catch(() => ({ message: "登录失败" }));
        throw new Error(payload.message ?? "登录失败");
      }
      router.replace("/ops");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardTitle>Ops 登录</CardTitle>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <label className="block text-sm text-slate-700">
              管理口令
              <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "验证中..." : "进入 Ops"}
            </Button>
            {error ? <div className="text-xs text-red-600">{error}</div> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

