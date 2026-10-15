-- Client feedback (2026-10-15). Run in Supabase (SQL editor) BEFORE deploying the code that uses it.
-- Adds two new tables only; no existing table changes. Safe to run twice.

CREATE TABLE IF NOT EXISTS "study_feedback" (
  "id"            TEXT         NOT NULL,
  "projectId"     TEXT         NOT NULL,
  "clientId"      TEXT         NOT NULL,
  "rating"        INTEGER      NOT NULL,
  "wentWell"      TEXT,
  "couldImprove"  TEXT,
  "showOnWebsite" BOOLEAN      NOT NULL DEFAULT false,
  "nameStyle"     TEXT         NOT NULL DEFAULT 'HIDDEN',
  "displayNames"  TEXT,
  "approvedAt"    TIMESTAMP(3),
  "approvedBy"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "study_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "study_feedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "study_feedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "study_feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "study_feedback_projectId_key" ON "study_feedback"("projectId");
CREATE INDEX IF NOT EXISTS "study_feedback_createdAt_idx" ON "study_feedback"("createdAt");
CREATE INDEX IF NOT EXISTS "study_feedback_approvedAt_idx" ON "study_feedback"("approvedAt");

CREATE TABLE IF NOT EXISTS "feedback_requests" (
  "id"         TEXT         NOT NULL,
  "projectId"  TEXT         NOT NULL,
  "askedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remindedAt" TIMESTAMP(3),
  CONSTRAINT "feedback_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedback_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_requests_projectId_key" ON "feedback_requests"("projectId");

-- Only the app's server (which connects as the table owner) can read or write these; nothing through Supabase's
-- public API.
ALTER TABLE "study_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback_requests" ENABLE ROW LEVEL SECURITY;
