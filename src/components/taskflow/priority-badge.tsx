import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, type TaskPriority } from "@/lib/types";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  urgent: "bg-priority-urgent/15 text-priority-urgent border-priority-urgent/25",
  high: "bg-priority-high/15 text-priority-high border-priority-high/25",
  medium: "bg-priority-medium/15 text-priority-medium border-priority-medium/25",
  low: "bg-priority-low/15 text-priority-low border-priority-low/25",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-priority-urgent",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[priority])} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
