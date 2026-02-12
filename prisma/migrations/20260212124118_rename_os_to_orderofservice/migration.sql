/*
  Warnings:

  - You are about to drop the `OS` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "OS_status_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OS";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "OrderOfService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pop" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT '',
    "dataEntrante" TEXT NOT NULL DEFAULT '',
    "dataPrevExec" TEXT NOT NULL DEFAULT '',
    "rawPrevExec" REAL NOT NULL DEFAULT 0,
    "dataConclusao" TEXT NOT NULL DEFAULT '',
    "rawConclusao" REAL NOT NULL DEFAULT 0,
    "cenario" TEXT NOT NULL DEFAULT '',
    "protocolo" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CaixaAlare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "excelId" TEXT,
    "osId" TEXT NOT NULL,
    "cto" TEXT NOT NULL,
    "chassi" TEXT,
    "placa" TEXT,
    "olt" TEXT,
    "endereco" TEXT,
    "lat" REAL,
    "long" REAL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaixaAlare_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CaixaAlare" ("chassi", "createdAt", "cto", "endereco", "excelId", "id", "lat", "long", "olt", "osId", "placa", "status", "updatedAt") SELECT "chassi", "createdAt", "cto", "endereco", "excelId", "id", "lat", "long", "olt", "osId", "placa", "status", "updatedAt" FROM "CaixaAlare";
DROP TABLE "CaixaAlare";
ALTER TABLE "new_CaixaAlare" RENAME TO "CaixaAlare";
CREATE INDEX "CaixaAlare_osId_idx" ON "CaixaAlare"("osId");
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technicianId" TEXT,
    "osId" TEXT,
    CONSTRAINT "Notification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "id", "message", "osId", "read", "technicianId", "title", "type") SELECT "createdAt", "id", "message", "osId", "read", "technicianId", "title", "type" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");
CREATE TABLE "new_OSExtraInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "condominio" TEXT,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OSExtraInfo_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OSExtraInfo" ("condominio", "createdAt", "descricao", "id", "osId", "updatedAt") SELECT "condominio", "createdAt", "descricao", "id", "osId", "updatedAt" FROM "OSExtraInfo";
DROP TABLE "OSExtraInfo";
ALTER TABLE "new_OSExtraInfo" RENAME TO "OSExtraInfo";
CREATE UNIQUE INDEX "OSExtraInfo_osId_key" ON "OSExtraInfo"("osId");
CREATE TABLE "new_ServiceExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "power" TEXT,
    "obs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceExecution_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceExecution_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServiceExecution" ("createdAt", "id", "obs", "osId", "power", "status", "technicianId", "updatedAt") SELECT "createdAt", "id", "obs", "osId", "power", "status", "technicianId", "updatedAt" FROM "ServiceExecution";
DROP TABLE "ServiceExecution";
ALTER TABLE "new_ServiceExecution" RENAME TO "ServiceExecution";
CREATE UNIQUE INDEX "ServiceExecution_osId_key" ON "ServiceExecution"("osId");
CREATE INDEX "ServiceExecution_osId_idx" ON "ServiceExecution"("osId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "OrderOfService_status_idx" ON "OrderOfService"("status");
