import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "violet",
  suffix,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "violet" | "rose" | "amber";
  suffix?: string;
}) {
  const accentStyles = {
    violet: "bg-primary/15 text-primary",
    rose: "bg-priority-urgent/15 text-priority-urgent",
    amber: "bg-priority-medium/15 text-priority-medium",
  }[accent];

  return (
    <div className="animate-fade-slide-in rounded-2xl border border-border/70 bg-card/60 p-5 transition-colors duration-200 hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            {value}
            {suffix && <span className="ml-1 text-base font-medium text-muted-foreground">{suffix}</span>}
          </p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", accentStyles)}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
