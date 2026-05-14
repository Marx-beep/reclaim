"use client";

import dynamic from "next/dynamic";

const PlannerPrototypeApp = dynamic(() => import("@/lib/planner-prototype/App"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#f6f7fb] text-slate-500">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        正在加载 Planner...
      </div>
    </div>
  )
});

export function PlannerClientPage() {
  return <PlannerPrototypeApp />;
}
