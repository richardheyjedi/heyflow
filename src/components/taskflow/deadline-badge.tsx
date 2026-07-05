import { differenceInCalendarDays } from "date-fns";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeadlineBadge({
  deadline,
  className,
}: {
  deadline: Date | string | null;
  className?: string;
}) {
  if (!deadline) return null;

  const days = differenceInCalendarDays(new Date(deadline), new Date());
  const isOverdue = days < 0;
  const isUrgent = days >= 0 && days <= 3;

  const label =
    days < 0
      ? `Atrasado há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`
      : days === 0
        ? "Prazo é hoje"
        : `Faltam ${days} dia${days === 1 ? "" : "s"}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        isOverdue
          ? "border-priority-urgent/25 bg-priority-urgent/15 text-priority-urgent"
          : isUrgent
            ? "border-priority-high/25 bg-priority-high/15 text-priority-high"
            : "border-primary/25 bg-primary/15 text-primary",
        className
      )}
    >
      {isOverdue ? <AlertTriangle className="size-3" /> : <CalendarClock className="size-3" />}
      {label}
    </span>
  );
}
