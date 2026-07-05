"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const TAG_COLORS = ["#A855F7", "#818CF8", "#C084FC", "#FB7185", "#60A5FA", "#F59E0B"];

export async function createTag(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da tag não pode ser vazio.");

  const existing = await prisma.tag.findUnique({ where: { name: trimmed } });
  if (existing) return existing;

  const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
  const tag = await prisma.tag.create({ data: { name: trimmed, color } });
  revalidatePath("/", "layout");
  return tag;
}
