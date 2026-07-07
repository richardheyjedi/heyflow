import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, getWeek, parseISO } from "date-fns";
import { dateOnlyKey } from "@/lib/dates";
import { ptBR } from "date-fns/locale";
import { ViewNav } from "@/components/taskflow/view-nav";
import { TaskFilterBar } from "@/components/taskflow/task-filter-bar";
import { WeekGrid, type WeekColumn } from "@/components/taskflow/week-grid";
import { getTasksInRange } from "@/lib/data/tasks";
import { getProjectsForSelect } from "@/lib/data/projects";
import { getTags } from "@/lib/data/tags";
import type { TaskPriority } from "@/lib/types";

type SearchParams = Promise<{ date?: string; projectId?: string; priority?: string; tagId?: string }>;

export default async function WeekPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // parseISO: new Date("yyyy-MM-dd") é meia-noite UTC e desloca o dia em servidores fora do UTC.
  const referenceDate = params.date ? parseISO(params.date) : new Date();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [tasks, projects, tags] = await Promise.all([
    getTasksInRange(weekStart, weekEnd, {
      projectId: params.projectId,
      priority: params.priority as TaskPriority | undefined,
      tagId: params.tagId,
    }),
    getProjectsForSelect(),
    getTags(),
  ]);

  const columns: WeekColumn[] = days.map((day) => {
    const dateISO = format(day, "yyyy-MM-dd");
    return {
      dateISO,
      dayLabel: format(day, "EEEEEE", { locale: ptBR }),
      dayNumber: format(day, "d MMM", { locale: ptBR }),
      isToday: isToday(day),
      tasks: tasks.filter((t) => t.dueDate && dateOnlyKey(t.dueDate) === dateISO),
    };
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Semana</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Semana {getWeek(referenceDate, { weekStartsOn: 1 })} · {format(weekStart, "d MMM", { locale: ptBR })} –{" "}
            {format(weekEnd, "d MMM", { locale: ptBR })}
          </p>
        </div>
        <ViewNav
          basePath="/semana"
          unit="week"
          currentDate={format(referenceDate, "yyyy-MM-dd")}
          label={`${format(weekStart, "d MMM", { locale: ptBR })} – ${format(weekEnd, "d MMM", { locale: ptBR })}`}
          showPicker={false}
        />
      </div>

      <TaskFilterBar projects={projects} tags={tags} />

      <WeekGrid initialColumns={columns} />
    </div>
  );
}
