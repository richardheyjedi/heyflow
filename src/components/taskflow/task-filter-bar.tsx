"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProjectDot } from "@/components/taskflow/project-badge";
import { PRIORITY_LABEL, type TaskPriority } from "@/lib/types";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function TaskFilterBar({
  projects,
  tags,
}: {
  projects: { id: string; name: string; color: string }[];
  tags: { id: string; name: string; color: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const projectId = searchParams.get("projectId") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const tagId = searchParams.get("tagId") ?? "all";
  const hasActiveFilters = projectId !== "all" || priority !== "all" || tagId !== "all";

  const projectItems: Record<string, React.ReactNode> = {
    all: "Todos os projetos",
    ...Object.fromEntries(projects.map((p) => [p.id, p.name])),
  };
  const priorityItems: Record<string, React.ReactNode> = {
    all: "Toda prioridade",
    ...Object.fromEntries(PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])),
  };
  const tagItems: Record<string, React.ReactNode> = {
    all: "Todas as tags",
    ...Object.fromEntries(tags.map((t) => [t.id, t.name])),
  };

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("projectId");
    params.delete("priority");
    params.delete("tagId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select items={projectItems} value={projectId} onValueChange={(v) => updateParam("projectId", v)}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Projeto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os projetos</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <ProjectDot color={project.color} />
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={priorityItems} value={priority} onValueChange={(v) => updateParam("priority", v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toda prioridade</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tags.length > 0 && (
        <Select items={tagItems} value={tagId} onValueChange={(v) => updateParam("tagId", v)}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <X className="size-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
