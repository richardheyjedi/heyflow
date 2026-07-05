import { TaskCard } from "@/components/taskflow/task-card";
import { EmptyState } from "@/components/taskflow/empty-state";
import type { TaskWithRelations } from "@/lib/types";

export function DayTimeline({ tasks }: { tasks: TaskWithRelations[] }) {
  const untimed = tasks.filter((t) => !t.dueTime);
  const timed = tasks.filter((t) => t.dueTime);

  const taskHours = timed.map((t) => parseInt(t.dueTime!.split(":")[0], 10));
  const minHour = Math.min(7, ...taskHours);
  const maxHour = Math.max(21, ...taskHours);
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa para este dia"
        description="Aproveite para planejar algo novo ou aproveite a folga."
      />
    );
  }

  return (
    <div className="space-y-6">
      {untimed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Sem horário</p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {untimed.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
        <div className="flex flex-col">
          {hours.map((hour) => {
            const hourTasks = timed.filter((t) => parseInt(t.dueTime!.split(":")[0], 10) === hour);
            return (
              <div key={hour} className="flex gap-4 border-t border-border/40 py-3 first:border-t-0">
                <div className="w-14 shrink-0 pt-1 text-right text-xs font-medium text-muted-foreground">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {hourTasks.length === 0 ? (
                    <div className="h-1" />
                  ) : (
                    hourTasks.map((task) => <TaskCard key={task.id} task={task} compact />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
