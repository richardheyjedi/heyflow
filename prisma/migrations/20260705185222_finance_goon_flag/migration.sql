-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_finance_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "isGoon" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceFrequency" TEXT,
    "recurrenceInterval" INTEGER,
    "recurrenceNextDate" DATETIME,
    "originTransactionId" TEXT,
    "clientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "finance_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "finance_clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_finance_transactions" ("amountCents", "category", "clientId", "createdAt", "description", "dueDate", "id", "kind", "originTransactionId", "paidAt", "recurrenceFrequency", "recurrenceInterval", "recurrenceNextDate", "scope", "status", "updatedAt") SELECT "amountCents", "category", "clientId", "createdAt", "description", "dueDate", "id", "kind", "originTransactionId", "paidAt", "recurrenceFrequency", "recurrenceInterval", "recurrenceNextDate", "scope", "status", "updatedAt" FROM "finance_transactions";
DROP TABLE "finance_transactions";
ALTER TABLE "new_finance_transactions" RENAME TO "finance_transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
