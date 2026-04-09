import { ReactNode } from "react";
import { AppProviders } from "@/lib/query/providers";

export default function OpsLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-slate-100">{children}</div>
    </AppProviders>
  );
}

