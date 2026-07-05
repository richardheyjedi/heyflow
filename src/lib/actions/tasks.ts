"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { computeNextOccurrence } from "@/lib/recurrence";
import type { TaskPriority, TaskStatus, RecurrenceRule } from "@/generated/prisma/client";

export type TaskFormInput = {
  title: string;
  description?: string | null;
  projectId?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  dueTime?: string | null;
  recurrenceRule?: RecurrenceRule | null;
  tagIds: string[];
  subtasks: { title: string; done: boolean }[];
};

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/dia");
  revalidatePath("/semana");
  revalidatePath("/mes");
  revalidatePath("/projetos", "layout");
}

export async function createTask(input: TaskFormInput) {
  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description || null,
      projectId: input.projectId || null,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      dueTime: input.dueTime || null,
      recurrenceRule: input.recurrenceRule || null,
      tags: { create: input.tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) },
      subtasks: {
        create: input.subtasks.map((s, i) => ({ title: s.title, done: s.done, order: i })),
      },
    },
  });

  revalidateAll();
  return task;
}

export async function updateTask(id: string, input: TaskFormInput) {
  await prisma.$transaction([
    prisma.taskTag.deleteMany({ where: { taskId: id } }),
    prisma.subtask.deleteMany({ where: { taskId: id } }),
    prisma.task.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description || null,
        projectId: input.projectId || null,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        dueTime: input.dueTime || null,
        recurrenceRule: input.recurrenceRule || null,
        tags: { create: input.tagIds.map((tagId) => ({ tag: { connect: { id: tagId } } })) },
        subtasks: {
          create: input.subtasks.map((s, i) => ({ title: s.title, done: s.done, order: i })),
        },
      },
    }),
  ]);

  revalidateAll();
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidateAll();
}

export async function toggleTaskDone(id: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;

  const isNowDone = task.status !== "done";

  await prisma.task.update({
    where: { id },
    data: {
      status: isNowDone ? "done" : "todo",
      completedAt: isNowDone ? new Date() : null,
    },
  });

  if (isNowDone && task.recurrenceRule && task.dueDate) {
    const nextDueDate = computeNextOccurrence(task.dueDate, task.recurrenceRule);
    const subtasks = await prisma.subtask.findMany({ where: { taskId: id }, orderBy: { order: "asc" } });
    const tags = await prisma.taskTag.findMany({ where: { taskId: id } });

    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        status: "todo",
        priority: task.priority,
        dueDate: nextDueDate,
        dueTime: task.dueTime,
        recurrenceRule: task.recurrenceRule,
        subtasks: { create: subtasks.map((s, i) => ({ title: s.title, done: false, order: i })) },
        tags: { create: tags.map((t) => ({ tagId: t.tagId })) },
      },
    });
  }

  if (isNowDone) {
    await prisma.notification.create({
      data: { taskId: id, type: "completed", message: `"${task.title}" foi concluída.` },
    });
  }

  revalidateAll();
}

export async function toggleSubtask(subtaskId: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
  if (!subtask) return;

  await prisma.subtask.update({
    where: { id: subtaskId },
    data: { done: !subtask.done },
  });

  revalidateAll();
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  await prisma.task.update({
    where: { id },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
  });
  revalidateAll();
}

export async function moveTaskToDate(id: string, dueDate: string) {
  await prisma.task.update({
    where: { id },
    data: { dueDate: new Date(dueDate) },
  });
  revalidateAll();
}

export async function deleteAllTasksInProject(projectId: string) {
  await prisma.task.deleteMany({ where: { projectId } });
  revalidateAll();
}
