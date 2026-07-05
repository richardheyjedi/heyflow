"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useUiStore } from "@/store/ui-store";
import { deleteAllTasksInProject } from "@/lib/actions/tasks";
import type { Project } from "@/generated/prisma/client";

export function ProjectHeaderActions({ project, taskCount }: { project: Project; taskCount: number }) {
  const openEditProjectModal = useUiStore((s) => s.openEditProjectModal);
  const openCreateTaskModal = useUiStore((s) => s.openCreateTaskModal);
  const [isPending, startTransition] = useTransition();

  function handleClearTasks() {
    startTransition(async () => {
      await deleteAllTasksInProject(project.id);
      toast.success("Todas as tarefas do projeto foram apagadas.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {taskCount > 0 && (
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="text-priority-urgent hover:text-priority-urgent" />}>
            <Trash2 className="size-3.5" />
            Apagar tarefas
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar todas as tarefas de &quot;{project.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso vai remover permanentemente as {taskCount} tarefas deste projeto (incluindo subtarefas). Essa ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearTasks}
                disabled={isPending}
                className="bg-priority-urgent text-white hover:bg-priority-urgent/90"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Apagar todas
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Button variant="outline" size="sm" onClick={() => openEditProjectModal(project)}>
        <Pencil className="size-3.5" />
        Editar
      </Button>
      <Button
        size="sm"
        className="bg-gradient-violet glow-violet-sm text-white"
        onClick={() => openCreateTaskModal(undefined, project.id)}
      >
        <Plus className="size-3.5" />
        Nova tarefa
      </Button>
    </div>
  );
}
