"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { moveTaskToDate } from "@/lib/actions/tasks";
import { TaskCard } from "@/components/taskflow/task-card";
import { useUiStore } from "@/store/ui-store";
import type { TaskWithRelations } from "@/lib/types";

export type WeekColumn = {
  dateISO: string;
  dayLabel: string;
  dayNumber: string;
  isToday: boolean;
  tasks: TaskWithRelations[];
};

export function WeekGrid({ initialColumns }: { initialColumns: WeekColumn[] }) {
  const [columns, setColumns] = useState(initialColumns);
  const [prevInitialColumns, setPrevInitialColumns] = useState(initialColumns);
  const [, startTransition] = useTransition();
  const openCreateTaskModal = useUiStore((s) => s.openCreateTaskModal);

  if (initialColumns !== prevInitialColumns) {
    setPrevInitialColumns(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetDate = String(over.id);
    const sourceColumn = columns.find((col) => col.tasks.some((t) => t.id === taskId));
    if (!sourceColumn || sourceColumn.dateISO === targetDate) return;

    setColumns((prev) => {
      let movedTask: TaskWithRelations | undefined;
      const cleared = prev.map((col) => {
        const found = col.tasks.find((t) => t.id === taskId);
        if (found) movedTask = found;
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      });
      if (!movedTask) return prev;
      const updatedTask = { ...movedTask, dueDate: new Date(targetDate) };
      return cleared.map((col) =>
        col.dateISO === targetDate ? { ...col, tasks: [...col.tasks, updatedTask] } : col
      );
    });

    // A Server Action já revalida as rotas — sem router.refresh() extra.
    startTransition(async () => {
      await moveTaskToDate(taskId, targetDate);
    });
  }

  return (
    <DndContext id="week-grid" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {columns.map((column) => (
          <DroppableColumn key={column.dateISO} id={column.dateISO} isToday={column.isToday}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {column.dayLabel}
                </p>
                <p className={cn("text-sm font-semibold", column.isToday ? "text-primary" : "text-foreground")}>
                  {column.dayNumber}
                </p>
              </div>
              <button
                onClick={() => openCreateTaskModal(column.dateISO)}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {column.tasks.map((task) => (
                <DraggableTaskCard key={task.id} task={task} />
              ))}
            </div>
          </DroppableColumn>
        ))}
      </div>
    </DndContext>
  );
}

function DroppableColumn({
  id,
  isToday,
  children,
}: {
  id: string;
  isToday: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-52 flex-col rounded-2xl border p-3 transition-colors duration-150",
        isToday ? "border-primary/30 bg-primary/5" : "border-border/70 bg-card/40",
        isOver && "border-primary/60 bg-primary/10"
      )}
    >
      {children}
    </div>
  );
}

function DraggableTaskCard({ task }: { task: TaskWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50 opacity-50")}>
      <TaskCard task={task} compact dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
