// Aplica as migrações do Prisma (prisma/migrations/**/migration.sql) direto no
// Turso via @libsql/client.
//
// Por quê: a engine de schema do Prisma (usada por `prisma migrate deploy`/`dev`)
// só entende URLs `file:` para o provider "sqlite" — ela rejeita `libsql://`
// com o erro P1013. O driver adapter (@prisma/adapter-libsql) resolve isso em
// runtime (consultas do app), mas não para os comandos de migração. Então,
// para bancos remotos (Turso), aplicamos o SQL das migrações manualmente,
// mantendo a mesma tabela `_prisma_migrations` que o Prisma usaria, para
// bookkeeping consistente.
//
// Uso:
//   DOTENV_CONFIG_PATH=.env.turso.local node --env-file=.env.turso.local scripts/turso-migrate.mjs
//   (ou defina DATABASE_URL e TURSO_AUTH_TOKEN no ambiente antes de rodar)

import "dotenv/config";
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "..", "prisma", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !url.startsWith("libsql://")) {
    throw new Error("Defina DATABASE_URL apontando para o banco Turso (libsql://...) antes de rodar este script.");
  }
  if (!authToken) {
    throw new Error("Defina TURSO_AUTH_TOKEN antes de rodar este script.");
  }

  const client = createClient({ url, authToken });

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    TEXT PRIMARY KEY NOT NULL,
      "checksum"              TEXT NOT NULL,
      "finished_at"           DATETIME,
      "migration_name"        TEXT NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        DATETIME,
      "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
      "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
    );
  `);

  const applied = await client.execute(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`
  );
  const appliedNames = new Set(applied.rows.map((r) => r.migration_name));

  const migrationFolders = readdirSync(MIGRATIONS_DIR)
    .filter((name) => statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();

  for (const folder of migrationFolders) {
    if (appliedNames.has(folder)) {
      console.log(`- ${folder} (já aplicada, pulando)`);
      continue;
    }

    const sqlPath = path.join(MIGRATIONS_DIR, folder, "migration.sql");
    const sql = readFileSync(sqlPath, "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const id = createHash("sha256").update(`${folder}-${Date.now()}`).digest("hex").slice(0, 32);

    console.log(`→ Aplicando ${folder}...`);
    await client.executeMultiple(sql);

    await client.execute({
      sql: `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1)`,
      args: [id, checksum, folder],
    });
    console.log(`  ✓ ${folder} aplicada.`);
  }

  console.log("\nMigrações do Turso em dia.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
