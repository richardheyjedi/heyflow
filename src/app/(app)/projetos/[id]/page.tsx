import { notFound } from "next/navigation";
import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import { ProjectHeaderActions } from "@/components/taskflow/project-header-actions";
import { DeadlineBadge } from "@/components/taskflow/deadline-badge";
import { KanbanBoard } from "@/components/taskflow/kanban-board";
import { getProjectById } from "@/lib/data/projects";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "done").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${project.color}22`, color: project.color }}
            >
              <DynamicIcon name={project.icon} className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
                <DeadlineBadge deadline={project.deadline} />
              </div>
              {project.description && (
                <p className="mt-1 max-w-lg text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
          </div>
          <ProjectHeaderActions project={project} taskCount={total} />
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium text-foreground">
              {done}/{total} tarefas · {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-violet transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <KanbanBoard tasks={project.tasks} />
    </div>
  );
}
