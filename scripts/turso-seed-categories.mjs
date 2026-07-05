// Popula só a taxonomia-base de categorias do financeiro no Turso (produção).
// Não cria projetos/tarefas/lançamentos de demonstração — o banco de produção
// deve começar limpo, com o usuário criando seus próprios dados reais.
//
// Uso:
//   node --env-file=.env.turso.local scripts/turso-seed-categories.mjs

import "dotenv/config";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const categorySeed = [
  { name: "Contas de Casa", group: "casa" },
  { name: "Aluguel/Financiamento", group: "casa" },
  { name: "Mercado", group: "casa" },
  { name: "Transporte", group: "pessoal" },
  { name: "Saúde", group: "pessoal" },
  { name: "Lazer", group: "pessoal" },
  { name: "Educação", group: "pessoal" },
  { name: "Serviços Prestados", group: "negocio" },
  { name: "Fornecedores", group: "negocio" },
  { name: "Impostos", group: "negocio" },
  { name: "Salários", group: "negocio" },
  { name: "Assinaturas", group: "outro" },
  { name: "Outros", group: "outro" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Defina DATABASE_URL e TURSO_AUTH_TOKEN antes de rodar este script.");
  }

  const client = createClient({ url, authToken });

  const existing = await client.execute(`SELECT COUNT(*) as count FROM finance_categories`);
  if (Number(existing.rows[0].count) > 0) {
    console.log("finance_categories já tem dados — nada a fazer.");
    client.close();
    return;
  }

  for (const c of categorySeed) {
    await client.execute({
      sql: `INSERT INTO finance_categories (id, name, "group", "createdAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [randomUUID(), c.name, c.group],
    });
  }

  console.log(`${categorySeed.length} categorias criadas em produção.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
