import type {
  Task,
  Project,
  Subtask,
  Tag,
  Notification,
  TaskStatus,
  TaskPriority,
  RecurrenceRule,
  NotificationType,
} from "@/generated/prisma/client";

export type { TaskStatus, TaskPriority, RecurrenceRule, NotificationType };

export type TaskWithRelations = Task & {
  project: Project | null;
  subtasks: Subtask[];
  tags: { tag: Tag }[];
};

export type ProjectWithCount = Project & {
  _count: { tasks: number };
};

export type ProjectWithTasks = Project & {
  tasks: TaskWithRelations[];
};

export type NotificationWithTask = Notification & {
  task: Task | null;
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  done: "Concluído",
};

export const RECURRENCE_LABEL: Record<RecurrenceRule, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  weekdays: "Dias úteis",
};

export type TaskFilters = {
  projectId?: string;
  priority?: TaskPriority;
  tagId?: string;
  query?: string;
};
