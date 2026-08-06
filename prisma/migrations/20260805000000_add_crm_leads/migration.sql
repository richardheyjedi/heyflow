-- CRM pipeline
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'novo',
    "valueCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "nextContact" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "leads_stage_idx" ON "leads"("stage");
CREATE INDEX "leads_nextContact_idx" ON "leads"("nextContact");
