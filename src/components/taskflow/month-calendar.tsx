"use client";

import { useState } from "react";
import { format, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/taskflow/task-card";
import { EmptyState } from "@/components/taskflow/empty-state";
import { useUiStore } from "@/store/ui-store";
import type { TaskWithRelations } from "@/lib/types";

const PRIORITY_DOT_CLASS: Record<string, string> = {
  urgent: "bg-priority-urgent",
  high: "bg-priority-high",
  medium: "bg-priority-medium",
  low: "bg-priority-low",
};

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function MonthCalendar({
  weeks,
  currentMonth,
  tasksByDate,
}: {
  weeks: Date[][];
  currentMonth: Date;
  tasksByDate: Record<string, TaskWithRelations[]>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const openCreateTaskModal = useUiStore((s) => s.openCreateTaskModal);

  const selectedTasks = selectedDate ? tasksByDate[selectedDate] ?? [] : [];

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/70">
        <div className="grid grid-cols-7 border-b border-border/70 bg-card/60">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day) => {
            const dateISO = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDate[dateISO] ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const visible = dayTasks.slice(0, 3);
            const remaining = dayTasks.length - visible.length;

            return (
              <button
                key={dateISO}
                onClick={() => setSelectedDate(dateISO)}
                className={cn(
                  "flex min-h-24 flex-col gap-1 border-b border-r border-border/50 p-2 text-left transition-colors duration-150 hover:bg-accent/40",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground/50"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday(day) && "bg-gradient-violet text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="flex flex-col gap-1">
                  {visible.map((task) => (
                    <span key={task.id} className="flex items-center gap-1.5 truncate text-[11px] text-foreground/90">
                      <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT_CLASS[task.priority])} />
                      <span className={cn("truncate", task.status === "done" && "text-muted-foreground line-through")}>
                        {task.title}
                      </span>
                    </span>
                  ))}
                  {remaining > 0 && (
                    <span className="text-[11px] font-medium text-primary">+{remaining} mais</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="right" className="flex flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border/60">
            <SheetTitle className="capitalize">
              {selectedDate ? format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR }) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {selectedTasks.length > 0 ? (
              selectedTasks.map((task) => <TaskCard key={task.id} task={task} compact />)
            ) : (
              <EmptyState title="Nenhuma tarefa" description="Nada agendado para este dia." />
            )}
          </div>
          <div className="border-t border-border/60 p-4">
            <Button
              className="w-full bg-gradient-violet glow-violet-sm text-white"
              onClick={() => selectedDate && openCreateTaskModal(selectedDate)}
            >
              <Plus className="size-4" />
              Nova tarefa neste dia
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
