"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Calendar,
  Plus,
  FolderPlus,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { DynamicIcon } from "@/components/taskflow/dynamic-icon";
import { toggleProjectPinned } from "@/lib/actions/projects";
import type { Project } from "@/generated/prisma/client";

function PinButton({ project }: { project: Project }) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => toggleProjectPinned(project.id, !project.pinned));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={project.pinned}
      aria-label={project.pinned ? `Desafixar projeto ${project.name}` : `Fixar projeto ${project.name}`}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity hover:text-amber-500 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100",
        project.pinned && "text-amber-500 opacity-100"
      )}
    >
      <Star className="size-3" fill={project.pinned ? "currentColor" : "none"} />
    </button>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dia", label: "Hoje", icon: CalendarDays },
  { href: "/semana", label: "Semana", icon: CalendarRange },
  { href: "/mes", label: "Mês", icon: Calendar },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
];

export function Sidebar({ projects }: { projects: (Project & { pendingCount: number })[] }) {
  const pathname = usePathname();
  const collapsedPref = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobileSidebar = useUiStore((s) => s.closeMobileSidebar);
  const openCreateTaskModal = useUiStore((s) => s.openCreateTaskModal);
  const openCreateProjectModal = useUiStore((s) => s.openCreateProjectModal);
  const openEditProjectModal = useUiStore((s) => s.openEditProjectModal);

  // Navegou? Fecha o drawer mobile — senão ele fica aberto por cima da página nova.
  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  // No drawer mobile a sidebar sempre aparece completa — o modo "recolhido"
  // (só ícones) é uma preferência de desktop.
  const collapsed = collapsedPref && !mobileOpen;

  const clientProjects = projects.filter((p) => p.type === "cliente");
  const personalProjects = projects.filter((p) => p.type === "pessoal");

  function renderProjectLink(project: Project & { pendingCount: number }) {
    const isActive = pathname === `/projetos/${project.id}`;
    return (
      <Link
        key={project.id}
        href={`/projetos/${project.id}`}
        onDoubleClick={(e) => {
          e.preventDefault();
          openEditProjectModal(project);
        }}
        aria-label={collapsed ? project.name : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
          collapsed && "size-9 justify-center px-0"
        )}
        title={project.name}
      >
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${project.color}22`, color: project.color }}
        >
          <DynamicIcon name={project.icon} className="size-3" />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{project.name}</span>
            {project.pendingCount > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {project.pendingCount}
              </span>
            )}
            <PinButton project={project} />
          </>
        )}
      </Link>
    );
  }

  function renderProjectGroup(label: string, group: (Project & { pendingCount: number })[]) {
    if (group.length === 0) return null;
    return (
      <div className="mb-4 last:mb-0">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </p>
        <div className="flex flex-col gap-0.5">{group.map((project) => renderProjectLink(project))}</div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop do drawer mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    <aside
      className={cn(
        // Mobile: drawer off-canvas fixo, largura cheia da sidebar, escondido
        // por padrão. Desktop (md+): sticky como antes.
        "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-all duration-200",
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-72 max-md:transition-transform",
        mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        "md:sticky md:top-0",
        collapsed ? "md:w-[76px]" : "md:w-64"
      )}
    >
      <div className={cn("flex items-center gap-2 px-4 py-5", collapsed && "justify-center px-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-violet glow-violet-sm">
          <Sparkles className="size-4 text-white" />
        </div>
        {!collapsed && <span className="text-base font-semibold tracking-tight text-foreground">Heyflow</span>}
      </div>

      <div className={cn("flex flex-col gap-1.5 px-3", collapsed && "items-center px-2")}>
        <button
          onClick={() => openCreateTaskModal()}
          aria-label={collapsed ? "Nova Tarefa" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg bg-gradient-violet px-3 py-2 text-sm font-medium text-white shadow-sm transition-transform duration-150 glow-violet-sm hover:scale-[1.02] active:scale-[0.98]",
            collapsed && "size-9 justify-center px-0"
          )}
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed && "Nova Tarefa"}
        </button>
        <button
          onClick={openCreateProjectModal}
          aria-label={collapsed ? "Novo Projeto" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:text-foreground",
            collapsed && "size-9 justify-center px-0"
          )}
        >
          <FolderPlus className="size-4 shrink-0" />
          {!collapsed && "Novo Projeto"}
        </button>
      </div>

      <nav className={cn("mt-6 flex flex-col gap-0.5 px-3", collapsed && "items-center px-2")}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                collapsed && "size-9 justify-center px-0"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-0.5">
            {projects.map((project) => renderProjectLink(project))}
          </div>
        ) : (
          <>
            {renderProjectGroup("Clientes", clientProjects)}
            {renderProjectGroup("Pessoais", personalProjects)}
            <Link
              href="/projetos"
              className={cn(
                "mt-1 block rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/80 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                pathname === "/projetos" && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
            >
              Ver todos os projetos →
            </Link>
          </>
        )}
      </div>

      {/* "Recolher" só faz sentido no desktop — no mobile o drawer fecha pelo backdrop. */}
      <div className={cn("border-t border-sidebar-border p-3 max-md:hidden", collapsed && "flex justify-center")}>
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && "Recolher"}
        </button>
      </div>
    </aside>
    </>
  );
}
