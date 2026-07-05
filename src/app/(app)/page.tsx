import { CheckCircle2, ListTodo, AlertTriangle, TrendingUp, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetricCard } from "@/components/taskflow/dashboard/metric-card";
import { WeeklyChart } from "@/components/taskflow/dashboard/weekly-chart";
import { ProjectDistributionChart } from "@/components/taskflow/dashboard/project-distribution-chart";
import { ProjectDeadlines } from "@/components/taskflow/dashboard/project-deadlines";
import { TaskCard } from "@/components/taskflow/task-card";
import { EmptyState } from "@/components/taskflow/empty-state";
import { getDashboardMetrics, getProjectDistribution, getWeeklyProgress } from "@/lib/data/dashboard";
import { getOverdueTasks, getTasksDueToday, getUpcomingTasks } from "@/lib/data/tasks";
import { getProjectDeadlines } from "@/lib/data/projects";

export default async function DashboardPage() {
  const [metrics, weeklyProgress, distribution, today, upcoming, overdue, deadlines] = await Promise.all([
    getDashboardMetrics(),
    getWeeklyProgress(),
    getProjectDistribution(),
    getTasksDueToday(),
    getUpcomingTasks(6),
    getOverdueTasks(6),
    getProjectDeadlines(),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Concluídas hoje" value={metrics.completedToday} icon={CheckCircle2} accent="violet" />
        <MetricCard label="Pendentes" value={metrics.pending} icon={ListTodo} accent="violet" />
        <MetricCard label="Atrasadas" value={metrics.overdue} icon={AlertTriangle} accent="rose" />
        <MetricCard
          label="Taxa de conclusão (semana)"
          value={metrics.completionRate}
          suffix="%"
          icon={TrendingUp}
          accent="amber"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Tarefas de hoje</h2>
          {today.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {today.length}
            </span>
          )}
        </div>
        {today.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {today.map((task) => (
              <TaskCard key={task.id} task={task} compact />
            ))}
          </div>
        ) : (
          <EmptyState title="Nada agendado para hoje" description="Aproveite para adiantar tarefas futuras." />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 xl:col-span-3">
          <h2 className="text-sm font-semibold text-foreground">Progresso semanal</h2>
          <p className="mb-2 text-xs text-muted-foreground">Tarefas previstas x concluídas por dia</p>
          <WeeklyChart data={weeklyProgress} />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Distribuição por projeto</h2>
          <p className="mb-4 text-xs text-muted-foreground">Total de tarefas por projeto</p>
          {distribution.length > 0 ? (
            <ProjectDistributionChart data={distribution} />
          ) : (
            <EmptyState title="Sem dados ainda" description="Crie tarefas em projetos para ver a distribuição." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Próximas tarefas</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((task) => (
                <TaskCard key={task.id} task={task} compact />
              ))}
            </div>
          ) : (
            <EmptyState title="Tudo em dia" description="Nenhuma tarefa futura pendente." />
          )}
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Atrasadas</h2>
          {overdue.length > 0 ? (
            <div className="space-y-2">
              {overdue.map((task) => (
                <TaskCard key={task.id} task={task} compact />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhum atraso" description="Todas as tarefas estão em dia." />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Prazos dos projetos</h2>
        <ProjectDeadlines projects={deadlines} />
      </div>
    </div>
  );
}
