import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function getNotifications(limit = 30) {
  return prisma.notification.findMany({
    include: { task: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationCount() {
  return prisma.notification.count({ where: { read: false } });
}

/**
 * Job simples executado a cada carregamento de página: verifica tarefas
 * atrasadas ou que vencem nas próximas 24h e garante que exista uma
 * notificação para cada uma (sem duplicar). Não depende de cron real.
 */
export async function generateDueNotifications() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [overdueTasks, dueSoonTasks] = await Promise.all([
    prisma.task.findMany({
      where: { status: { not: "done" }, dueDate: { lt: todayStart } },
      select: { id: true, title: true },
    }),
    prisma.task.findMany({
      where: { status: { not: "done" }, dueDate: { gte: todayStart, lte: in24h } },
      select: { id: true, title: true },
    }),
  ]);

  const candidateIds = [...overdueTasks, ...dueSoonTasks].map((t) => t.id);
  if (candidateIds.length === 0) return;

  const existing = await prisma.notification.findMany({
    where: {
      taskId: { in: candidateIds },
      type: { in: ["overdue", "due_soon"] },
    },
    select: { taskId: true, type: true },
  });
  const existingKeys = new Set(existing.map((n) => `${n.taskId}:${n.type}`));

  const toCreate = [
    ...overdueTasks
      .filter((t) => !existingKeys.has(`${t.id}:overdue`))
      .map((t) => ({
        taskId: t.id,
        type: "overdue" as const,
        message: `"${t.title}" está atrasada.`,
      })),
    ...dueSoonTasks
      .filter((t) => !existingKeys.has(`${t.id}:due_soon`))
      .map((t) => ({
        taskId: t.id,
        type: "due_soon" as const,
        message: `"${t.title}" vence em breve.`,
      })),
  ];

  if (toCreate.length > 0) {
    await prisma.notification.createMany({ data: toCreate });
  }
}
