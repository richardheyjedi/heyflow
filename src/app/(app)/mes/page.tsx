import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ViewNav } from "@/components/taskflow/view-nav";
import { TaskFilterBar } from "@/components/taskflow/task-filter-bar";
import { MonthCalendar } from "@/components/taskflow/month-calendar";
import { getTasksInRange } from "@/lib/data/tasks";
import { getProjectsForSelect } from "@/lib/data/projects";
import { getTags } from "@/lib/data/tags";
import type { TaskPriority } from "@/lib/types";
import type { TaskWithRelations } from "@/lib/types";

type SearchParams = Promise<{ date?: string; projectId?: string; priority?: string; tagId?: string }>;

export default async function MonthPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const referenceDate = params.date ? new Date(params.date) : new Date();
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weekStarts = eachWeekOfInterval({ start: gridStart, end: gridEnd }, { weekStartsOn: 1 });
  const weeks = weekStarts.map((weekStart) =>
    eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  );

  const [tasks, projects, tags] = await Promise.all([
    getTasksInRange(gridStart, gridEnd, {
      projectId: params.projectId,
      priority: params.priority as TaskPriority | undefined,
      tagId: params.tagId,
    }),
    getProjectsForSelect(),
    getTags(),
  ]);

  const tasksByDate: Record<string, TaskWithRelations[]> = {};
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const key = format(new Date(task.dueDate), "yyyy-MM-dd");
    (tasksByDate[key] ??= []).push(task);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground capitalize">
            {format(referenceDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral do mês.</p>
        </div>
        <ViewNav
          basePath="/mes"
          unit="month"
          currentDate={format(referenceDate, "yyyy-MM-dd")}
          label={format(referenceDate, "MMMM yyyy", { locale: ptBR })}
          showPicker={false}
        />
      </div>

      <TaskFilterBar projects={projects} tags={tags} />

      <MonthCalendar weeks={weeks} currentMonth={referenceDate} tasksByDate={tasksByDate} />
    </div>
  );
}
