-- Durable staff sessions for multi-instance API deployments.
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffSession_sessionToken_key" ON "StaffSession"("sessionToken");

CREATE INDEX "StaffSession_staffUserId_idx" ON "StaffSession"("staffUserId");

CREATE INDEX "StaffSession_expires_idx" ON "StaffSession"("expires");

ALTER TABLE "StaffSession" ADD CONSTRAINT "StaffSession_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
