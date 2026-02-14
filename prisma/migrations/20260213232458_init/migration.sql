/*
  Warnings:

  - You are about to drop the `Checklist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OSExtraInfo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Technician` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `technicianId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `extraInfoId` on the `OSAttachment` table. All the data in the column will be lost.
  - You are about to drop the column `rawConclusao` on the `OrderOfService` table. All the data in the column will be lost.
  - You are about to drop the column `rawPrevExec` on the `OrderOfService` table. All the data in the column will be lost.
  - You are about to drop the column `checklistId` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `technicianId` on the `ServiceExecution` table. All the data in the column will be lost.
  - Added the required column `osId` to the `OSAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Checklist_executionId_itemId_key";

-- DropIndex
DROP INDEX "OSExtraInfo_osId_key";

-- DropIndex
DROP INDEX "Technician_name_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Checklist";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OSExtraInfo";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Technician";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Equipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "excelId" TEXT,
    "codEquipe" TEXT NOT NULL DEFAULT '',
    "nomeEquipe" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "fullName" TEXT,
    "password" TEXT NOT NULL DEFAULT '',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "lastUf" TEXT NOT NULL DEFAULT 'Todos',
    "lastSearch" TEXT NOT NULL DEFAULT '',
    "lastStatus" TEXT NOT NULL DEFAULT 'Abertas',
    "phone" TEXT,
    "prestadora" TEXT NOT NULL DEFAULT '',
    "classificacao" TEXT NOT NULL DEFAULT '',
    "unidade" TEXT NOT NULL DEFAULT '',
    "descEquipe" TEXT NOT NULL DEFAULT '',
    "centro" TEXT NOT NULL DEFAULT '',
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
    "pop" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL DEFAULT '',
    "uf" TEXT NOT NULL DEFAULT '',
    "chassi" TEXT,
    "placa" TEXT,
    "olt" TEXT,
    "cenario" TEXT NOT NULL DEFAULT '',
    "bairro" TEXT NOT NULL DEFAULT '',
    "endereco" TEXT,
    "lat" REAL,
    "long" REAL,
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "valor" REAL NOT NULL DEFAULT 0,
    "equipe" TEXT NOT NULL DEFAULT '',
    "obs" TEXT NOT NULL DEFAULT '',
    "data" TEXT NOT NULL DEFAULT '',
    "nomeEquipe" TEXT NOT NULL DEFAULT '',
    "potencia" TEXT NOT NULL DEFAULT '',
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaixaAlare_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CaixaAlare" ("chassi", "createdAt", "cto", "endereco", "excelId", "id", "lat", "long", "olt", "osId", "placa", "status", "updatedAt") SELECT "chassi", "createdAt", "cto", "endereco", "excelId", "id", "lat", "long", "olt", "osId", "placa", "status", "updatedAt" FROM "CaixaAlare";
DROP TABLE "CaixaAlare";
ALTER TABLE "new_CaixaAlare" RENAME TO "CaixaAlare";
CREATE INDEX "CaixaAlare_osId_idx" ON "CaixaAlare"("osId");
CREATE TABLE "new_LancaAlare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "excelId" TEXT,
    "osId" TEXT,
    "de" TEXT NOT NULL DEFAULT '',
    "para" TEXT NOT NULL DEFAULT '',
    "previsao" TEXT NOT NULL DEFAULT '',
    "cenario" TEXT NOT NULL DEFAULT '',
    "valor" REAL,
    "cabo" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "lancado" TEXT NOT NULL DEFAULT '',
    "cenarioReal" TEXT NOT NULL DEFAULT '',
    "valorReal" REAL NOT NULL DEFAULT 0,
    "difLanc" REAL NOT NULL DEFAULT 0,
    "orcadoAtual" REAL NOT NULL DEFAULT 0,
    "data" TEXT,
    "equipe" TEXT NOT NULL DEFAULT '',
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LancaAlare" ("createdAt", "data", "descricao", "excelId", "id", "osId", "updatedAt", "valor") SELECT "createdAt", "data", "descricao", "excelId", "id", "osId", "updatedAt", "valor" FROM "LancaAlare";
DROP TABLE "LancaAlare";
ALTER TABLE "new_LancaAlare" RENAME TO "LancaAlare";
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "equipeId" TEXT,
    "technicianName" TEXT,
    "osId" TEXT,
    CONSTRAINT "Notification_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "id", "message", "osId", "read", "technicianName", "title", "type") SELECT "createdAt", "id", "message", "osId", "read", "technicianName", "title", "type" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");
CREATE TABLE "new_OSAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OSAttachment_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OSAttachment" ("createdAt", "id", "name", "path", "size", "type") SELECT "createdAt", "id", "name", "path", "size", "type" FROM "OSAttachment";
DROP TABLE "OSAttachment";
ALTER TABLE "new_OSAttachment" RENAME TO "OSAttachment";
CREATE TABLE "new_OrderOfService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pop" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT '',
    "dataEntrante" TEXT NOT NULL DEFAULT '',
    "dataPrevExec" TEXT NOT NULL DEFAULT '',
    "dataConclusao" TEXT NOT NULL DEFAULT '',
    "cenario" TEXT NOT NULL DEFAULT '',
    "protocolo" TEXT NOT NULL DEFAULT '',
    "mes" TEXT NOT NULL DEFAULT '',
    "valorServico" REAL NOT NULL DEFAULT 0,
    "statusMedicao" TEXT NOT NULL DEFAULT '',
    "statusFinal" TEXT NOT NULL DEFAULT '',
    "tempo" TEXT NOT NULL DEFAULT '',
    "facilidadesPlanejadas" INTEGER NOT NULL DEFAULT 0,
    "caixasPlanejadas" INTEGER NOT NULL DEFAULT 0,
    "tipoOs" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "condominio" TEXT,
    "descricao" TEXT
);
INSERT INTO "new_OrderOfService" ("cenario", "createdAt", "dataConclusao", "dataEntrante", "dataPrevExec", "id", "pop", "protocolo", "status", "uf", "updatedAt") SELECT "cenario", "createdAt", "dataConclusao", "dataEntrante", "dataPrevExec", "id", "pop", "protocolo", "status", "uf", "updatedAt" FROM "OrderOfService";
DROP TABLE "OrderOfService";
ALTER TABLE "new_OrderOfService" RENAME TO "OrderOfService";
CREATE INDEX "OrderOfService_status_idx" ON "OrderOfService"("status");
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT,
    "caixaId" TEXT,
    "equipeId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ServiceExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "CaixaAlare" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("createdAt", "executionId", "id", "path") SELECT "createdAt", "executionId", "id", "path" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE TABLE "new_ServiceExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "equipeId" TEXT,
    "technicianName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "power" TEXT,
    "obs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceExecution_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "Equipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ServiceExecution_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceExecution" ("createdAt", "id", "obs", "osId", "power", "status", "technicianName", "updatedAt") SELECT "createdAt", "id", "obs", "osId", "power", "status", "technicianName", "updatedAt" FROM "ServiceExecution";
DROP TABLE "ServiceExecution";
ALTER TABLE "new_ServiceExecution" RENAME TO "ServiceExecution";
CREATE UNIQUE INDEX "ServiceExecution_osId_key" ON "ServiceExecution"("osId");
CREATE INDEX "ServiceExecution_osId_idx" ON "ServiceExecution"("osId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_excelId_key" ON "Equipe"("excelId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipe_name_key" ON "Equipe"("name");
