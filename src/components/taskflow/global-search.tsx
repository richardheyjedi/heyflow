"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchTasksAction } from "@/lib/actions/search";
import { useUiStore } from "@/store/ui-store";
import { PriorityBadge } from "@/components/taskflow/priority-badge";
import { ProjectDot } from "@/components/taskflow/project-badge";
import type { TaskWithRelations } from "@/lib/types";

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskWithRelations[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openEditTaskModal = useUiStore((s) => s.openEditTaskModal);

  useEffect(() => {
    // `cancelled` descarta respostas atrasadas — sem isso, uma busca antiga e
    // lenta podia sobrescrever os resultados de uma busca mais recente.
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const tasks = await searchTasksAction(query);
      if (!cancelled) setResults(tasks);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar tarefas..."
          className="h-9 w-full rounded-lg border border-border/70 bg-muted/30 pr-8 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div className="glass-surface animate-fade-slide-in absolute top-11 z-40 max-h-80 w-full overflow-y-auto rounded-xl border border-border/70 py-1.5 shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma tarefa encontrada.</p>
          ) : (
            results.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  openEditTaskModal(task);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col gap-1 px-4 py-2 text-left transition-colors hover:bg-accent/60"
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">{task.title}</span>
                <span className="flex items-center gap-1.5">
                  <PriorityBadge priority={task.priority} />
                  {task.project && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ProjectDot color={task.project.color} />
                      {task.project.name}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
