"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { LeadStage } from "@/generated/prisma/client";

export type LeadInput = {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  stage: LeadStage;
  valueCents: number;
  notes?: string | null;
  nextContact?: string | null;
};

function normalize(input: LeadInput) {
  return {
    ...input,
    name: input.name.trim(),
    company: input.company?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    source: input.source?.trim() || null,
    notes: input.notes?.trim() || null,
    valueCents: Math.max(0, Math.round(input.valueCents || 0)),
    nextContact: input.nextContact ? new Date(`${input.nextContact}T12:00:00`) : null,
  };
}

export async function createLead(input: LeadInput) {
  if (!input.name.trim()) throw new Error("O nome do lead é obrigatório.");
  const lead = await prisma.lead.create({ data: normalize(input) });
  revalidatePath("/crm");
  return lead;
}

export async function updateLead(id: string, input: LeadInput) {
  if (!input.name.trim()) throw new Error("O nome do lead é obrigatório.");
  await prisma.lead.update({ where: { id }, data: normalize(input) });
  revalidatePath("/crm");
}

export async function moveLead(id: string, stage: LeadStage) {
  await prisma.lead.update({ where: { id }, data: { stage } });
  revalidatePath("/crm");
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/crm");
}
