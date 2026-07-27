import { Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/generated/prisma/client";

export function ProjectTypeBadge({ type, className }: { type: ProjectType; className?: string }) {
  const isClient = type === "cliente";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        isClient
          ? "border-amber-500/25 bg-amber-500/15 text-amber-500"
          : "border-primary/25 bg-primary/15 text-primary",
        className
      )}
    >
      {isClient ? <Briefcase className="size-3" /> : <User className="size-3" />}
      {isClient ? "Cliente" : "Pessoal"}
    </span>
  );
}
