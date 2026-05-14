"use client";

import dynamic from "next/dynamic";

const PlannerPrototypeApp = dynamic(() => import("@/lib/planner-prototype/App"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#eef3f8] text-slate-500">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-4 text-sm shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        正在加载 Planner...
      </div>
    </div>
  )
});

export function PlannerClientPage() {
  return <PlannerPrototypeApp />;
}
