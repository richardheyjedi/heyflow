import { create } from "zustand";
import type { Project } from "@/generated/prisma/client";
import type { TaskWithRelations } from "@/lib/types";

type UiState = {
  isTaskModalOpen: boolean;
  editingTask: TaskWithRelations | null;
  defaultDueDate: string | null;
  defaultProjectId: string | null;
  openCreateTaskModal: (defaultDueDate?: string, defaultProjectId?: string) => void;
  openEditTaskModal: (task: TaskWithRelations) => void;
  closeTaskModal: () => void;

  isProjectModalOpen: boolean;
  editingProject: Project | null;
  openCreateProjectModal: () => void;
  openEditProjectModal: (project: Project) => void;
  closeProjectModal: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Drawer da sidebar no mobile (off-canvas) — independente do "recolher" do desktop. */
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isTaskModalOpen: false,
  editingTask: null,
  defaultDueDate: null,
  defaultProjectId: null,
  openCreateTaskModal: (defaultDueDate, defaultProjectId) =>
    set({
      isTaskModalOpen: true,
      editingTask: null,
      defaultDueDate: defaultDueDate ?? null,
      defaultProjectId: defaultProjectId ?? null,
    }),
  openEditTaskModal: (task) =>
    set({ isTaskModalOpen: true, editingTask: task, defaultDueDate: null, defaultProjectId: null }),
  closeTaskModal: () =>
    set({ isTaskModalOpen: false, editingTask: null, defaultDueDate: null, defaultProjectId: null }),

  isProjectModalOpen: false,
  editingProject: null,
  openCreateProjectModal: () => set({ isProjectModalOpen: true, editingProject: null }),
  openEditProjectModal: (project) => set({ isProjectModalOpen: true, editingProject: project }),
  closeProjectModal: () => set({ isProjectModalOpen: false, editingProject: null }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  mobileSidebarOpen: false,
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
}));
