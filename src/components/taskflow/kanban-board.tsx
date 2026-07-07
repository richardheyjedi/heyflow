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
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { TaskCard } from "@/components/taskflow/task-card";
import { EmptyState } from "@/components/taskflow/empty-state";
import { STATUS_LABEL, type TaskStatus, type TaskWithRelations } from "@/lib/types";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function KanbanBoard({ tasks }: { tasks: TaskWithRelations[] }) {
  const [items, setItems] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [, startTransition] = useTransition();

  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setItems(tasks);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetStatus = over.id as TaskStatus;
    const task = items.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    setItems((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t)));

    // A Server Action já revalida as rotas — sem router.refresh() extra
    // (que refazia a página inteira uma segunda vez a cada arrasto).
    startTransition(async () => {
      await updateTaskStatus(taskId, targetStatus);
    });
  }

  return (
    <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((status) => {
          const columnTasks = items.filter((t) => t.status === status);
          return (
            <DroppableColumn key={status} id={status}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{STATUS_LABEL[status]}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {columnTasks.length === 0 ? (
                  <EmptyState title="Vazio" className="p-6" />
                ) : (
                  columnTasks.map((task) => <DraggableTaskCard key={task.id} task={task} />)
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-64 flex-col rounded-2xl border border-border/70 bg-card/40 p-3.5 transition-colors duration-150",
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
