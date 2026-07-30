"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { toggleProjectPinned } from "@/lib/actions/projects";
import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import { ProjectTypeBadge } from "@/components/taskflow/project-type-badge";
import { DeadlineBadge } from "@/components/taskflow/deadline-badge";
import type { Project, ProjectType } from "@/generated/prisma/client";

type ProjectWithCount = Project & { pendingCount: number };

const FILTERS: { value: ProjectType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "cliente", label: "Clientes" },
  { value: "pessoal", label: "Pessoais" },
];

export function ProjectsGrid({ projects }: { projects: ProjectWithCount[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProjectType | "all">("all");
  const openCreateProjectModal = useUiStore((s) => s.openCreateProjectModal);
  const openEditProjectModal = useUiStore((s) => s.openEditProjectModal);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (filter !== "all" && project.type !== filter) return false;
      if (term && !project.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [projects, search, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar projeto..."
              aria-label="Buscar projeto"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  filter === f.value
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => openCreateProjectModal()} className="bg-gradient-violet glow-violet-sm text-white">
          <Plus className="size-4" />
          Novo projeto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          {projects.length === 0 ? "Nenhum projeto ainda — crie o primeiro." : "Nenhum projeto encontrado."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onEdit={() => openEditProjectModal(project)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onEdit }: { project: ProjectWithCount; onEdit: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleTogglePin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => toggleProjectPinned(project.id, !project.pinned));
  }

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  }

  return (
    <Link
      href={`/projetos/${project.id}`}
      className="group relative flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/60 p-5 transition-colors duration-150 hover:border-primary/40"
    >
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={handleEdit}
          aria-label={`Editar projeto ${project.name}`}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none group-hover:opacity-100"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleTogglePin}
          disabled={isPending}
          aria-pressed={project.pinned}
          aria-label={project.pinned ? `Desafixar projeto ${project.name}` : `Fixar projeto ${project.name}`}
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-muted-foreground/40 opacity-0 transition-opacity hover:text-amber-500 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none group-hover:opacity-100",
            project.pinned && "text-amber-500 opacity-100"
          )}
        >
          <Star className="size-3.5" fill={project.pinned ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex items-center gap-3 pr-14">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${project.color}22`, color: project.color }}
        >
          <DynamicIcon name={project.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{project.name}</p>
          <ProjectTypeBadge type={project.type} className="mt-1" />
        </div>
      </div>

      {project.description && <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <DeadlineBadge deadline={project.deadline} />
        {project.pendingCount > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {project.pendingCount} pendente{project.pendingCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </Link>
  );
}
