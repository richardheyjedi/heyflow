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

  // Uma única leva paralela — cada query é uma round-trip ao banco remoto,
  // então duas levas sequenciais dobravam a latência sem necessidade.
  const [completedToday, pending, overdue, completedThisWeek, dueThisWeek, lastWeekCompleted, lastWeekDue] =
    await Promise.all([
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
      prisma.task.count({
        where: { completedAt: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
      prisma.task.count({
        where: { dueDate: { gte: lastWeekStart, lte: lastWeekEnd } },
      }),
    ]);

  const completionRate = dueThisWeek > 0 ? Math.round((completedThisWeek / dueThisWeek) * 100) : 0;
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

  // 2 queries + agregação em JS, em vez de 2 counts POR DIA (14 round-trips
  // ao banco remoto só para montar o gráfico da semana).
  const [completedRows, dueRows] = await Promise.all([
    prisma.task.findMany({
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
      select: { completedAt: true },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: weekStart, lte: weekEnd } },
      select: { dueDate: true },
    }),
  ]);

  const completedByDay = new Map<string, number>();
  for (const row of completedRows) {
    if (!row.completedAt) continue;
    const key = format(row.completedAt, "yyyy-MM-dd");
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  }
  const dueByDay = new Map<string, number>();
  for (const row of dueRows) {
    if (!row.dueDate) continue;
    const key = format(row.dueDate, "yyyy-MM-dd");
    dueByDay.set(key, (dueByDay.get(key) ?? 0) + 1);
  }

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return {
      date: key,
      label: format(day, "EEEEEE", { locale: ptBR }),
      completed: completedByDay.get(key) ?? 0,
      total: dueByDay.get(key) ?? 0,
    };
  });
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
