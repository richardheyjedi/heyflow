import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { TaskFilters } from "@/lib/types";

export const taskInclude = {
  project: true,
  subtasks: { orderBy: { order: "asc" } },
  tags: { include: { tag: true } },
} satisfies Prisma.TaskInclude;

function buildTaskWhere(filters?: TaskFilters): Prisma.TaskWhereInput {
  if (!filters) return {};
  const where: Prisma.TaskWhereInput = {};

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };
  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query } },
      { description: { contains: filters.query } },
    ];
  }

  return where;
}

export async function getTasksInRange(start: Date, end: Date, filters?: TaskFilters) {
  return prisma.task.findMany({
    where: {
      ...buildTaskWhere(filters),
      dueDate: { gte: start, lte: end },
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
  });
}

export async function getOverdueTasks(limit?: number) {
  return prisma.task.findMany({
    where: {
      status: { not: "done" },
      dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
    include: taskInclude,
    orderBy: { dueDate: "asc" },
    take: limit,
  });
}

export async function getUpcomingTasks(limit = 6) {
  const tomorrowStart = new Date(new Date().setHours(24, 0, 0, 0));
  return prisma.task.findMany({
    where: {
      status: { not: "done" },
      dueDate: { gte: tomorrowStart },
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
    take: limit,
  });
}

export async function getTasksDueToday() {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const todayEnd = new Date(new Date().setHours(23, 59, 59, 999));
  const tasks = await prisma.task.findMany({
    where: { dueDate: { gte: todayStart, lte: todayEnd } },
    include: taskInclude,
    orderBy: [{ dueTime: "asc" }],
  });

  return tasks.sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
}

export async function searchTasks(query: string) {
  if (!query.trim()) return [];
  return prisma.task.findMany({
    where: buildTaskWhere({ query }),
    include: taskInclude,
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
}
