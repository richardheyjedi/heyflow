import { prisma } from "@/lib/prisma";

export async function getLeads() {
  return prisma.lead.findMany({
    orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
  });
}
