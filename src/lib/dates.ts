import { parseISO } from "date-fns";

/**
 * Converte uma data "pura" (gravada como meia-noite UTC, ex.: dueDate criada
 * de um input "yyyy-MM-dd") para meia-noite LOCAL do MESMO dia de calendário.
 *
 * Sem isso, formatar o Date direto usa o fuso de quem renderiza: um servidor
 * UTC e um usuário em UTC-3 exibem dias diferentes para a mesma tarefa, e o
 * texto do SSR não bate com o da hidratação (React #418).
 */
export function dateOnlyToLocal(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return parseISO(d.toISOString().slice(0, 10));
}

/** A parte "yyyy-MM-dd" (em UTC) de uma data pura — para usar como chave estável. */
export function dateOnlyKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}
