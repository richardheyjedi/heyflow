"use client";

import { useTransition } from "react";
import { Check, ListChecks, Repeat, Clock } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { dateOnlyToLocal } from "@/lib/dates";
import { toggleTaskDone } from "@/lib/actions/tasks";
import { PriorityBadge } from "@/components/taskflow/priority-badge";
import { ProjectBadge } from "@/components/taskflow/project-badge";
import { useUiStore } from "@/store/ui-store";
import type { TaskWithRelations } from "@/lib/types";

export function TaskCard({
  task,
  compact = false,
  dragHandleProps,
}: {
  task: TaskWithRelations;
  compact?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [isPending, startTransition] = useTransition();
  const openEditTaskModal = useUiStore((s) => s.openEditTaskModal);

  const isDone = task.status === "done";
  // dateOnlyToLocal: dueDate é meia-noite UTC — comparar/formatar direto no
  // fuso local marcava a tarefa como atrasada no próprio dia do vencimento e
  // exibia o dia anterior para quem está a oeste do UTC.
  const isOverdue =
    !isDone && task.dueDate && isBefore(dateOnlyToLocal(task.dueDate), startOfDay(new Date()));

  const doneSubtasks = task.subtasks.filter((s) => s.done).length;

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(() => {
      toggleTaskDone(task.id);
    });
  }

  return (
    <div
      {...dragHandleProps}
      onClick={() => openEditTaskModal(task)}
      className={cn(
        "group relative cursor-pointer rounded-xl border border-border/70 bg-card/70 p-3 transition-all duration-200 animate-fade-slide-in hover:border-primary/40 hover:bg-card",
        isPending && "opacity-60",
        compact && "p-2.5"
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={handleToggle}
          aria-label={isDone ? "Marcar como não concluída" : "Marcar como concluída"}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
            isDone
              ? "border-primary bg-gradient-violet"
              : "border-muted-foreground/40 hover:border-primary"
          )}
        >
          {isDone && <Check className="size-3 text-white" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p
            className={cn(
              "text-sm font-medium text-foreground transition-all duration-200",
              isDone && "text-muted-foreground line-through decoration-2"
            )}
          >
            {task.title}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={task.priority} />
            {task.project && (
              <ProjectBadge name={task.project.name} color={task.project.color} icon={task.project.icon} />
            )}
            {task.recurrenceRule && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <Repeat className="size-3" />
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
            {task.dueDate && (
              <span className={cn("inline-flex items-center gap-1", isOverdue && "font-medium text-priority-urgent")}>
                <Clock className="size-3" />
                {format(dateOnlyToLocal(task.dueDate), "dd MMM", { locale: ptBR })}
                {task.dueTime ? ` · ${task.dueTime}` : ""}
              </span>
            )}
            {task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListChecks className="size-3" />
                {doneSubtasks}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
