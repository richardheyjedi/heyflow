import Link from "next/link";
import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import { DeadlineBadge } from "@/components/taskflow/deadline-badge";
import { EmptyState } from "@/components/taskflow/empty-state";
import type { Project } from "@/generated/prisma/client";

export function ProjectDeadlines({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <EmptyState title="Nenhum prazo definido" description="Defina um prazo de entrega ao criar ou editar um projeto." />;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projetos/${project.id}`}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-3 transition-colors duration-150 hover:border-primary/40 hover:bg-card"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${project.color}22`, color: project.color }}
          >
            <DynamicIcon name={project.icon} className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{project.name}</span>
          <DeadlineBadge deadline={project.deadline} />
        </Link>
      ))}
    </div>
  );
}
