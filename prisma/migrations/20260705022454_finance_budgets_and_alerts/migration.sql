-- CreateTable
CREATE TABLE "finance_budgets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "group" TEXT NOT NULL,
    "limitCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "finance_budgets_group_key" ON "finance_budgets"("group");
