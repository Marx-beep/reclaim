import { cn } from "@/lib/utils";

export function Badge({ children, tone = "default" }: { children: string; tone?: "default" | "success" | "warning" }) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700"
  } as const;

  return <span className={cn("rounded px-2 py-0.5 text-xs font-medium", styles[tone])}>{children}</span>;
}
