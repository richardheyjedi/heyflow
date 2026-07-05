-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_finance_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'outro',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_finance_categories" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "finance_categories";
DROP TABLE "finance_categories";
ALTER TABLE "new_finance_categories" RENAME TO "finance_categories";
CREATE UNIQUE INDEX "finance_categories_name_key" ON "finance_categories"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
