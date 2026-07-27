-- CreateTable
CREATE TABLE "finance_month_closures" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthKey" TEXT NOT NULL,
    "closedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReceivedCents" INTEGER NOT NULL,
    "totalPaidCents" INTEGER NOT NULL,
    "totalReceivableCents" INTEGER NOT NULL,
    "totalPayableCents" INTEGER NOT NULL,
    "saldoCents" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "type" TEXT NOT NULL DEFAULT 'pessoal',
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_projects" ("color", "createdAt", "deadline", "description", "icon", "id", "name", "updatedAt") SELECT "color", "createdAt", "deadline", "description", "icon", "id", "name", "updatedAt" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "finance_month_closures_monthKey_key" ON "finance_month_closures"("monthKey");
