-- Limpeza de dados duplicados.
--
-- 1) Clientes/fornecedores duplicados por nome: criações repetidas não eram
--    deduplicadas (agora são, ver createFinanceClient). Reaponta os lançamentos
--    para o cliente mais antigo de cada nome (ignorando maiúsculas e espaços
--    nas bordas) e remove os demais.
UPDATE "finance_clients" SET "name" = trim("name") WHERE "name" <> trim("name");

UPDATE "finance_transactions"
SET "clientId" = (
  SELECT c2."id"
  FROM "finance_clients" c2, "finance_clients" c
  WHERE c."id" = "finance_transactions"."clientId"
    AND lower(c2."name") = lower(c."name")
  ORDER BY c2."createdAt" ASC, c2."id" ASC
  LIMIT 1
)
WHERE "clientId" IS NOT NULL;

DELETE FROM "finance_clients"
WHERE "id" <> (
  SELECT c2."id"
  FROM "finance_clients" c2
  WHERE lower(c2."name") = lower("finance_clients"."name")
  ORDER BY c2."createdAt" ASC, c2."id" ASC
  LIMIT 1
);

-- 2) Tarefas recorrentes duplicadas: concluir/desconcluir uma tarefa recorrente
--    gerava a próxima ocorrência de novo (agora tem guarda, ver toggleTaskDone).
--    Mantém a mais antiga de cada grupo idêntico ainda aberto e remove as cópias.
--    As FKs ficam desligadas durante a migração, então filhos são limpos
--    explicitamente (subtarefas, tags, notificações e vínculo de lembrete).
DELETE FROM "subtasks" WHERE "taskId" IN (
  SELECT t."id" FROM "tasks" t
  WHERE t."recurrenceRule" IS NOT NULL AND t."status" = 'todo'
    AND t."id" <> (
      SELECT t2."id" FROM "tasks" t2
      WHERE t2."status" = 'todo'
        AND t2."recurrenceRule" = t."recurrenceRule"
        AND t2."title" = t."title"
        AND t2."dueDate" IS t."dueDate"
        AND t2."dueTime" IS t."dueTime"
        AND t2."projectId" IS t."projectId"
      ORDER BY t2."createdAt" ASC, t2."id" ASC
      LIMIT 1
    )
);

DELETE FROM "task_tags" WHERE "taskId" IN (
  SELECT t."id" FROM "tasks" t
  WHERE t."recurrenceRule" IS NOT NULL AND t."status" = 'todo'
    AND t."id" <> (
      SELECT t2."id" FROM "tasks" t2
      WHERE t2."status" = 'todo'
        AND t2."recurrenceRule" = t."recurrenceRule"
        AND t2."title" = t."title"
        AND t2."dueDate" IS t."dueDate"
        AND t2."dueTime" IS t."dueTime"
        AND t2."projectId" IS t."projectId"
      ORDER BY t2."createdAt" ASC, t2."id" ASC
      LIMIT 1
    )
);

DELETE FROM "notifications" WHERE "taskId" IN (
  SELECT t."id" FROM "tasks" t
  WHERE t."recurrenceRule" IS NOT NULL AND t."status" = 'todo'
    AND t."id" <> (
      SELECT t2."id" FROM "tasks" t2
      WHERE t2."status" = 'todo'
        AND t2."recurrenceRule" = t."recurrenceRule"
        AND t2."title" = t."title"
        AND t2."dueDate" IS t."dueDate"
        AND t2."dueTime" IS t."dueTime"
        AND t2."projectId" IS t."projectId"
      ORDER BY t2."createdAt" ASC, t2."id" ASC
      LIMIT 1
    )
);

UPDATE "finance_reminders" SET "taskId" = NULL WHERE "taskId" IN (
  SELECT t."id" FROM "tasks" t
  WHERE t."recurrenceRule" IS NOT NULL AND t."status" = 'todo'
    AND t."id" <> (
      SELECT t2."id" FROM "tasks" t2
      WHERE t2."status" = 'todo'
        AND t2."recurrenceRule" = t."recurrenceRule"
        AND t2."title" = t."title"
        AND t2."dueDate" IS t."dueDate"
        AND t2."dueTime" IS t."dueTime"
        AND t2."projectId" IS t."projectId"
      ORDER BY t2."createdAt" ASC, t2."id" ASC
      LIMIT 1
    )
);

DELETE FROM "tasks"
WHERE "recurrenceRule" IS NOT NULL AND "status" = 'todo'
  AND "id" <> (
    SELECT t2."id" FROM "tasks" t2
    WHERE t2."status" = 'todo'
      AND t2."recurrenceRule" = "tasks"."recurrenceRule"
      AND t2."title" = "tasks"."title"
      AND t2."dueDate" IS "tasks"."dueDate"
      AND t2."dueTime" IS "tasks"."dueTime"
      AND t2."projectId" IS "tasks"."projectId"
    ORDER BY t2."createdAt" ASC, t2."id" ASC
    LIMIT 1
  );
