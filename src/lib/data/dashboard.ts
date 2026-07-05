import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getDashboardMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(weekStart, 1);
  const lastWeekEnd = subWeeks(weekEnd, 1);

  const [completedToday, pending, overdue, completedThisWeek, dueThisWeek] = await Promise.all([
    prisma.task.count({
      where: { completedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.task.count({ where: { status: { not: "done" } } }),
    prisma.task.count({
      where: { status: { not: "done" }, dueDate: { lt: todayStart } },
    }),
    prisma.task.count({
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.task.count({
      where: { dueDate: { gte: weekStart, lte: weekEnd } },
    }),
  ]);

  const completionRate = dueThisWeek > 0 ? Math.round((completedThisWeek / dueThisWeek) * 100) : 0;

  const [lastWeekCompleted, lastWeekDue] = await Promise.all([
    prisma.task.count({
      where: { completedAt: { gte: lastWeekStart, lte: lastWeekEnd } },
    }),
    prisma.task.count({
      where: { dueDate: { gte: lastWeekStart, lte: lastWeekEnd } },
    }),
  ]);
  const lastWeekRate = lastWeekDue > 0 ? Math.round((lastWeekCompleted / lastWeekDue) * 100) : 0;

  return {
    completedToday,
    pending,
    overdue,
    completionRate,
    completionRateDelta: completionRate - lastWeekRate,
  };
}

export async function getWeeklyProgress() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const results = await Promise.all(
    days.map(async (day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const [completed, total] = await Promise.all([
        prisma.task.count({ where: { completedAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.task.count({ where: { dueDate: { gte: dayStart, lte: dayEnd } } }),
      ]);
      return {
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "EEEEEE", { locale: ptBR }),
        completed,
        total,
      };
    })
  );

  return results;
}

export async function getProjectDistribution() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return projects
    .filter((p) => p._count.tasks > 0)
    .map((p) => ({ name: p.name, value: p._count.tasks, color: p.color }));
}
