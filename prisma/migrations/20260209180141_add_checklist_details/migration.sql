-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN "power" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT,
    "checklistId" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ServiceExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Photo_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("createdAt", "executionId", "id", "path") SELECT "createdAt", "executionId", "id", "path" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
