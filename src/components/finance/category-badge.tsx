import { Home, User, Briefcase, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_GROUP_LABEL, type CategoryGroup } from "@/lib/finance/types";

export const CATEGORY_GROUP_STYLES: Record<CategoryGroup, string> = {
  casa: "bg-primary/15 text-primary border-primary/25",
  pessoal: "bg-[#60A5FA]/15 text-[#60A5FA] border-[#60A5FA]/25",
  negocio: "bg-priority-medium/15 text-priority-medium border-priority-medium/25",
  outro: "bg-muted text-muted-foreground border-border/60",
};

export const CATEGORY_GROUP_ICON = {
  casa: Home,
  pessoal: User,
  negocio: Briefcase,
  outro: MoreHorizontal,
} as const;

export function CategoryBadge({
  name,
  group,
  className,
}: {
  name: string;
  group: CategoryGroup;
  className?: string;
}) {
  const Icon = CATEGORY_GROUP_ICON[group];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        CATEGORY_GROUP_STYLES[group],
        className
      )}
    >
      <Icon className="size-3" />
      {name}
    </span>
  );
}

export function CategoryGroupBadge({ group, className }: { group: CategoryGroup; className?: string }) {
  const Icon = CATEGORY_GROUP_ICON[group];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        CATEGORY_GROUP_STYLES[group],
        className
      )}
    >
      <Icon className="size-3" />
      {CATEGORY_GROUP_LABEL[group]}
    </span>
  );
}
