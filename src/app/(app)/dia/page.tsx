import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ViewNav } from "@/components/taskflow/view-nav";
import { TaskFilterBar } from "@/components/taskflow/task-filter-bar";
import { DayTimeline } from "@/components/taskflow/day-timeline";
import { getTasksInRange } from "@/lib/data/tasks";
import { getProjectsForSelect } from "@/lib/data/projects";
import { getTags } from "@/lib/data/tags";
import type { TaskPriority } from "@/lib/types";

type SearchParams = Promise<{ date?: string; projectId?: string; priority?: string; tagId?: string }>;

export default async function DayPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const date = params.date ? new Date(params.date) : new Date();

  const [tasks, projects, tags] = await Promise.all([
    getTasksInRange(startOfDay(date), endOfDay(date), {
      projectId: params.projectId,
      priority: params.priority as TaskPriority | undefined,
      tagId: params.tagId,
    }),
    getProjectsForSelect(),
    getTags(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hoje</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sua agenda organizada por horário.</p>
        </div>
        <ViewNav
          basePath="/dia"
          unit="day"
          currentDate={format(date, "yyyy-MM-dd")}
          label={format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        />
      </div>

      <TaskFilterBar projects={projects} tags={tags} />

      <DayTimeline tasks={tasks} />
    </div>
  );
}
