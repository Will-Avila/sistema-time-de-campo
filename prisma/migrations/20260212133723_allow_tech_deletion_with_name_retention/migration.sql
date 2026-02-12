-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "osId" TEXT,
    CONSTRAINT "Notification_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notification_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Notification" ("createdAt", "id", "message", "osId", "read", "technicianId", "title", "type") SELECT "createdAt", "id", "message", "osId", "read", "technicianId", "title", "type" FROM "Notification";
DROP TABLE "Notification";
ALTER TABLE "new_Notification" RENAME TO "Notification";
CREATE INDEX "Notification_read_createdAt_idx" ON "Notification"("read", "createdAt");
CREATE TABLE "new_ServiceExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osId" TEXT NOT NULL,
    "technicianId" TEXT,
    "technicianName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "power" TEXT,
    "obs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceExecution_osId_fkey" FOREIGN KEY ("osId") REFERENCES "OrderOfService" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceExecution_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ServiceExecution" ("createdAt", "id", "obs", "osId", "power", "status", "technicianId", "updatedAt") SELECT "createdAt", "id", "obs", "osId", "power", "status", "technicianId", "updatedAt" FROM "ServiceExecution";
DROP TABLE "ServiceExecution";
ALTER TABLE "new_ServiceExecution" RENAME TO "ServiceExecution";
CREATE UNIQUE INDEX "ServiceExecution_osId_key" ON "ServiceExecution"("osId");
CREATE INDEX "ServiceExecution_osId_idx" ON "ServiceExecution"("osId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
