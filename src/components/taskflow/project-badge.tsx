import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import { cn } from "@/lib/utils";

export function ProjectBadge({
  name,
  color,
  icon,
  className,
}: {
  name: string;
  color: string;
  icon?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        className
      )}
      style={{
        backgroundColor: `${color}1A`,
        color,
        borderColor: `${color}33`,
      }}
    >
      {icon ? <DynamicIcon name={icon} className="size-3" /> : null}
      {name}
    </span>
  );
}

export function ProjectDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}
