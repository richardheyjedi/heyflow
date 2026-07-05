import type { Notification } from "@/generated/prisma/client";

/**
 * Ponto de extensão isolado para notificações push reais (Web Push API).
 * Hoje o app só usa notificações in-app; quando for plugar push de verdade,
 * implemente o envio aqui (subscriptions, VAPID keys, etc.) e chame esta
 * função a partir de `generateDueNotifications` / ao marcar tarefas.
 */
export async function sendWebPush(notification: Notification): Promise<void> {
  void notification;
  // Não implementado: nenhuma dependência de push está configurada ainda.
}
