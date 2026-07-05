"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  await prisma.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
  revalidatePath("/", "layout");
}
