-- CreateTable
CREATE TABLE "Technician" (
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

-- CreateTable
CREATE TABLE "OS" (
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

-- CreateTable
CREATE TABLE "CaixaAlare" (
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
    CONSTRAINT "CaixaAlare_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OS" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LancaAlare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT,
    "data" TEXT,
    "valor" REAL,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "power" TEXT,
    "obs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceExecution_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OS" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceExecution_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT,
    "checklistId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ServiceExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "power" TEXT,
    CONSTRAINT "Checklist_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ServiceExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "Notification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OS" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OSExtraInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "condominio" TEXT,
    "descricao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OSExtraInfo_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OS" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OSAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "extraInfoId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OSAttachment_extraInfoId_fkey" FOREIGN KEY ("extraInfoId") REFERENCES "OSExtraInfo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Technician_name_key" ON "Technician"("name");

-- CreateIndex
CREATE INDEX "OS_status_idx" ON "OS"("status");

-- CreateIndex
CREATE INDEX "CaixaAlare_osId_idx" ON "CaixaAlare"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceExecution_osId_key" ON "ServiceExecution"("osId");

-- CreateIndex
CREATE INDEX "ServiceExecution_osId_idx" ON "ServiceExecution"("osId");

-- CreateIndex
CREATE UNIQUE INDEX "Checklist_executionId_itemId_key" ON "Checklist"("executionId", "itemId");

-- CreateIndex
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OSExtraInfo_osId_key" ON "OSExtraInfo"("osId");
