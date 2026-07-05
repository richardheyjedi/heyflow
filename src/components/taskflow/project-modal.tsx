"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { createProject, deleteProject, updateProject } from "@/lib/actions/projects";
import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import type { Project } from "@/generated/prisma/client";

const COLOR_OPTIONS = ["#8B5CF6", "#A855F7", "#C084FC", "#7C3AED", "#6D28D9", "#FB7185", "#60A5FA", "#F59E0B"];
const ICON_OPTIONS = [
  "Folder",
  "Layout",
  "Smartphone",
  "Megaphone",
  "Server",
  "Rocket",
  "Briefcase",
  "Code",
  "PenTool",
  "ShoppingBag",
  "Heart",
  "Star",
];

export function ProjectModal() {
  const isOpen = useUiStore((s) => s.isProjectModalOpen);
  const editingProject = useUiStore((s) => s.editingProject);
  const closeProjectModal = useUiStore((s) => s.closeProjectModal);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeProjectModal()}>
      <DialogContent className="sm:max-w-md">
        <ProjectModalForm
          key={isOpen ? (editingProject?.id ?? "new") : "closed"}
          editingProject={editingProject}
          onClose={closeProjectModal}
        />
      </DialogContent>
    </Dialog>
  );
}

function ProjectModalForm({
  editingProject,
  onClose,
}: {
  editingProject: Project | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(editingProject?.name ?? "");
  const [description, setDescription] = useState(editingProject?.description ?? "");
  const [color, setColor] = useState(editingProject?.color ?? COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(editingProject?.icon ?? ICON_OPTIONS[0]);
  const [deadline, setDeadline] = useState(
    editingProject?.deadline ? new Date(editingProject.deadline).toISOString().slice(0, 10) : ""
  );

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Dê um nome ao projeto.");
      return;
    }
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      icon,
      deadline: deadline || null,
    };

    startTransition(async () => {
      try {
        if (editingProject) {
          await updateProject(editingProject.id, input);
          toast.success("Projeto atualizado.");
        } else {
          await createProject(input);
          toast.success("Projeto criado.");
        }
        onClose();
      } catch {
        toast.error("Algo deu errado ao salvar o projeto.");
      }
    });
  }

  function handleDelete() {
    if (!editingProject) return;
    startTransition(async () => {
      await deleteProject(editingProject.id);
      toast.success("Projeto removido.");
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gradient-violet">
          {editingProject ? "Editar projeto" : "Novo projeto"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="project-name">Nome</Label>
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-description">Descrição</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-deadline">Prazo de entrega</Label>
          <Input
            id="project-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "size-7 rounded-full border-2 transition-transform duration-150",
                  color === c ? "scale-110 border-white/70" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Ícone</Label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={cn(
                  "flex items-center justify-center rounded-lg border p-2 transition-colors duration-150",
                  icon === i
                    ? "border-primary/60 bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/30"
                )}
              >
                <DynamicIcon name={i} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {editingProject ? (
          <Button variant="ghost" className="text-priority-urgent hover:text-priority-urgent" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="size-4" />
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-violet glow-violet-sm text-white">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {editingProject ? "Salvar alterações" : "Criar projeto"}
        </Button>
      </DialogFooter>
    </>
  );
}
