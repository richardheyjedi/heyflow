"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X, Trash2, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { createTask, deleteTask, updateTask, type TaskFormInput } from "@/lib/actions/tasks";
import { createTag, deleteTag } from "@/lib/actions/tags";
import { ProjectDot } from "@/components/taskflow/project-badge";
import {
  PRIORITY_LABEL,
  RECURRENCE_LABEL,
  type TaskPriority,
  type RecurrenceRule,
  type TaskWithRelations,
} from "@/lib/types";
import type { Project, Tag } from "@/generated/prisma/client";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const RECURRENCES: RecurrenceRule[] = ["daily", "weekly", "monthly", "weekdays"];

const PRIORITY_SELECT_STYLES: Record<TaskPriority, string> = {
  low: "data-[active=true]:border-priority-low data-[active=true]:bg-priority-low/15 data-[active=true]:text-priority-low",
  medium:
    "data-[active=true]:border-priority-medium data-[active=true]:bg-priority-medium/15 data-[active=true]:text-priority-medium",
  high: "data-[active=true]:border-priority-high data-[active=true]:bg-priority-high/15 data-[active=true]:text-priority-high",
  urgent:
    "data-[active=true]:border-priority-urgent data-[active=true]:bg-priority-urgent/15 data-[active=true]:text-priority-urgent",
};

type SubtaskDraft = { title: string; done: boolean };

type Props = {
  projects: Pick<Project, "id" | "name" | "color" | "icon">[];
  initialTags: Tag[];
};

export function TaskModal({ projects, initialTags }: Props) {
  const isOpen = useUiStore((s) => s.isTaskModalOpen);
  const editingTask = useUiStore((s) => s.editingTask);
  const defaultDueDate = useUiStore((s) => s.defaultDueDate);
  const defaultProjectId = useUiStore((s) => s.defaultProjectId);
  const closeTaskModal = useUiStore((s) => s.closeTaskModal);

  const [tags, setTags] = useState<Tag[]>(initialTags);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeTaskModal()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <TaskModalForm
          key={isOpen ? (editingTask?.id ?? "new") : "closed"}
          editingTask={editingTask}
          defaultDueDate={defaultDueDate}
          defaultProjectId={defaultProjectId}
          projects={projects}
          tags={tags}
          onTagCreated={(tag) => setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]))}
          onTagDeleted={(tagId) => setTags((prev) => prev.filter((t) => t.id !== tagId))}
          onClose={closeTaskModal}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskModalForm({
  editingTask,
  defaultDueDate,
  defaultProjectId,
  projects,
  tags,
  onTagCreated,
  onTagDeleted,
  onClose,
}: {
  editingTask: TaskWithRelations | null;
  defaultDueDate: string | null;
  defaultProjectId: string | null;
  projects: Pick<Project, "id" | "name" | "color" | "icon">[];
  tags: Tag[];
  onTagCreated: (tag: Tag) => void;
  onTagDeleted: (tagId: string) => void;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [description, setDescription] = useState(editingTask?.description ?? "");
  const [projectId, setProjectId] = useState<string>(
    editingTask ? editingTask.projectId ?? "none" : defaultProjectId ?? "none"
  );
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate ? new Date(editingTask.dueDate).toISOString().slice(0, 10) : defaultDueDate ?? ""
  );
  const [dueTime, setDueTime] = useState(editingTask?.dueTime ?? "");
  const [recurrenceRule, setRecurrenceRule] = useState<string>(editingTask?.recurrenceRule ?? "none");
  const [tagIds, setTagIds] = useState<string[]>(editingTask?.tags.map((t) => t.tag.id) ?? []);
  const [subtasks, setSubtasks] = useState<SubtaskDraft[]>(
    editingTask?.subtasks.map((s) => ({ title: s.title, done: s.done })) ?? []
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  function addSubtask() {
    const value = newSubtaskTitle.trim();
    if (!value) return;
    setSubtasks((prev) => [...prev, { title: value, done: false }]);
    setNewSubtaskTitle("");
  }

  function removeSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleSubtaskDraft(index: number) {
    setSubtasks((prev) => prev.map((s, i) => (i === index ? { ...s, done: !s.done } : s)));
  }

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    setIsCreatingTag(true);
    try {
      const tag = await createTag(name);
      onTagCreated(tag);
      setTagIds((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
      setNewTagName("");
    } catch {
      toast.error("Não foi possível criar a tag.");
    } finally {
      setIsCreatingTag(false);
    }
  }

  async function handleDeleteTag(id: string) {
    // Otimista: some da lista na hora; a Server Action remove do banco.
    onTagDeleted(id);
    setTagIds((prev) => prev.filter((t) => t !== id));
    try {
      await deleteTag(id);
      toast.success("Tag excluída.");
    } catch {
      toast.error("Não foi possível excluir a tag.");
    }
  }

  const projectItems: Record<string, React.ReactNode> = {
    none: "Sem projeto",
    ...Object.fromEntries(projects.map((p) => [p.id, p.name])),
  };
  const recurrenceItems: Record<string, React.ReactNode> = {
    none: "Nenhuma",
    ...Object.fromEntries(RECURRENCES.map((r) => [r, RECURRENCE_LABEL[r]])),
  };

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("Dê um título para a tarefa.");
      return;
    }

    const input: TaskFormInput = {
      title: title.trim(),
      description: description.trim() || null,
      projectId: projectId === "none" ? null : projectId,
      status: editingTask?.status ?? "todo",
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      recurrenceRule: recurrenceRule === "none" ? null : (recurrenceRule as RecurrenceRule),
      tagIds,
      subtasks,
    };

    startTransition(async () => {
      try {
        if (editingTask) {
          await updateTask(editingTask.id, input);
          toast.success("Tarefa atualizada.");
        } else {
          await createTask(input);
          toast.success("Tarefa criada.");
        }
        onClose();
      } catch {
        toast.error("Algo deu errado ao salvar a tarefa.");
      }
    });
  }

  function handleDelete() {
    if (!editingTask) return;
    startTransition(async () => {
      await deleteTask(editingTask.id);
      toast.success("Tarefa removida.");
      onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-gradient-violet">
          {editingTask ? "Editar tarefa" : "Nova tarefa"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">Título</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-description">Descrição</Label>
          <Textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes opcionais..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Projeto</Label>
            <Select items={projectItems} value={projectId} onValueChange={(v) => setProjectId(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem projeto</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <ProjectDot color={project.color} />
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recorrência</Label>
            <Select items={recurrenceItems} value={recurrenceRule} onValueChange={(v) => setRecurrenceRule(v ?? "none")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {RECURRENCES.map((rule) => (
                  <SelectItem key={rule} value={rule}>
                    {RECURRENCE_LABEL[rule]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Prioridade</Label>
          <div className="flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                data-active={priority === p}
                onClick={() => setPriority(p)}
                className={cn(
                  "rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground transition-all duration-150",
                  PRIORITY_SELECT_STYLES[p]
                )}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-date">Data de vencimento</Label>
            <Input
              id="task-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-time">Horário</Label>
            <Input
              id="task-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const active = tagIds.includes(tag.id);
              return (
                <span
                  key={tag.id}
                  className="group/tag inline-flex items-center rounded-full border text-[11px] font-medium transition-all duration-150"
                  style={{
                    backgroundColor: active ? `${tag.color}26` : "transparent",
                    borderColor: active ? `${tag.color}55` : "var(--border)",
                    color: active ? tag.color : "var(--muted-foreground)",
                  }}
                >
                  <button type="button" onClick={() => toggleTag(tag.id)} className="py-1 pl-2.5 pr-1">
                    {tag.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir tag ${tag.name}`}
                    title="Excluir tag (remove de todas as tarefas)"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="mr-1.5 rounded-full p-0.5 opacity-0 transition-opacity hover:bg-priority-urgent/20 hover:text-priority-urgent group-hover/tag:opacity-60 group-hover/tag:hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              placeholder="Criar nova tag..."
              className="h-8 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isCreatingTag || !newTagName.trim()}
              onClick={handleCreateTag}
            >
              {isCreatingTag ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Subtarefas</Label>
          <div className="space-y-1.5">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
                <Checkbox checked={subtask.done} onCheckedChange={() => toggleSubtaskDraft(index)} />
                <span className={cn("flex-1 text-sm", subtask.done && "text-muted-foreground line-through")}>
                  {subtask.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubtask(index)}
                  className="text-muted-foreground transition-colors hover:text-priority-urgent"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubtask();
                }
              }}
              placeholder="Adicionar subtarefa..."
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="secondary" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {editingTask ? (
          <Button variant="ghost" className="text-priority-urgent hover:text-priority-urgent" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="size-4" />
            Excluir
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={handleSubmit} disabled={isPending} className="bg-gradient-violet glow-violet-sm text-white">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {editingTask ? "Salvar alterações" : "Criar tarefa"}
        </Button>
      </DialogFooter>
    </>
  );
}
