import { prisma } from "@/lib/prisma";
import { taskInclude } from "@/lib/data/tasks";

export async function getProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
  });

  const pendingCounts = await prisma.task.groupBy({
    by: ["projectId"],
    where: { status: { not: "done" } },
    _count: { _all: true },
  });
  const countMap = new Map(pendingCounts.map((p) => [p.projectId, p._count._all]));

  return projects.map((project) => ({
    ...project,
    pendingCount: countMap.get(project.id) ?? 0,
  }));
}

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      tasks: {
        include: taskInclude,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      },
    },
  });
}

export async function getProjectsForSelect() {
  return prisma.project.findMany({
    select: { id: true, name: true, color: true, icon: true },
    orderBy: { name: "asc" },
  });
}

export async function getProjectDeadlines() {
  return prisma.project.findMany({
    where: { deadline: { not: null } },
    orderBy: { deadline: "asc" },
  });
}
