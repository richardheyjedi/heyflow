"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ProjectFormInput = {
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  deadline?: string | null;
};

export async function createProject(input: ProjectFormInput) {
  const project = await prisma.project.create({
    data: { ...input, deadline: input.deadline ? new Date(input.deadline) : null },
  });
  revalidatePath("/", "layout");
  return project;
}

export async function updateProject(id: string, input: ProjectFormInput) {
  await prisma.project.update({
    where: { id },
    data: { ...input, deadline: input.deadline ? new Date(input.deadline) : null },
  });
  revalidatePath("/", "layout");
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/", "layout");
}
