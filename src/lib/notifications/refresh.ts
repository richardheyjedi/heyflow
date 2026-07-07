import { after } from "next/server";
import { generateDueNotifications } from "@/lib/data/notifications";
import { generateFinanceNotifications } from "@/lib/finance/notifications";

// Os jobs de notificação são baseados em tempo (atrasos, cortes, orçamento do
// mês) — não precisam rodar em toda navegação, e cada execução faz várias
// round-trips ao banco remoto. Estado por instância warm do serverless: um
// cold start só significa rodar o job de novo, o que é inofensivo.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let lastRunAt = 0;
let isRunning = false;

/**
 * Agenda a geração de notificações para DEPOIS da resposta ser enviada
 * (via `after()`), no máximo uma vez a cada 5 minutos por instância — antes
 * disso os jobs bloqueavam a renderização de TODA página do app.
 */
export function scheduleNotificationRefresh() {
  if (isRunning || Date.now() - lastRunAt < REFRESH_INTERVAL_MS) return;
  isRunning = true;

  after(async () => {
    try {
      await Promise.all([generateDueNotifications(), generateFinanceNotifications()]);
      lastRunAt = Date.now();
    } catch (error) {
      console.error("Falha ao gerar notificações:", error);
    } finally {
      isRunning = false;
    }
  });
}
