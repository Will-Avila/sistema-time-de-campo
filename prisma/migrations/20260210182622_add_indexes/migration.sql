/*
  Warnings:

  - A unique constraint covering the columns `[executionId,itemId]` on the table `Checklist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technicianId" TEXT,
    "osId" TEXT,
    CONSTRAINT "Notification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Technician" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "lastUf" TEXT NOT NULL DEFAULT 'Todos',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Technician" ("createdAt", "id", "isAdmin", "name", "password", "updatedAt") SELECT "createdAt", "id", "isAdmin", "name", "password", "updatedAt" FROM "Technician";
DROP TABLE "Technician";
ALTER TABLE "new_Technician" RENAME TO "Technician";
CREATE UNIQUE INDEX "Technician_name_key" ON "Technician"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_executionId_itemId_key" ON "Checklist"("executionId", "itemId");

-- CreateIndex
CREATE INDEX "ServiceExecution_osId_idx" ON "ServiceExecution"("osId");
