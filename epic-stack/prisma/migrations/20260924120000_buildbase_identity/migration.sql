-- BuildBase example: sign-in moved to BuildBase. Users gain buildbaseId;
-- the password, verification, connection and passkey tables go.
-- AlterTable
ALTER TABLE "User" ADD COLUMN "buildbaseId" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Password";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Verification";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Connection";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Passkey";
PRAGMA foreign_keys=on;

-- CreateIndex
CREATE UNIQUE INDEX "User_buildbaseId_key" ON "User"("buildbaseId");
