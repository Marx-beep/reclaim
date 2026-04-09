"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";

export default function SignInPage() {
  const [email, setEmail] = useState("demo@reclaim.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
    if (result?.error) {
      setError(result.error);
      return;
    }
    window.location.href = "/";
  };

  return (
    <main className="mx-auto mt-24 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-semibold">登录</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="text-sm">
          邮箱
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="text-sm">
          密码
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="w-full">
          继续
        </Button>
      </form>
    </main>
  );
}
