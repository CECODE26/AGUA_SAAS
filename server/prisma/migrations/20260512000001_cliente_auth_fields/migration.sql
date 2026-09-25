-- Add cliente auth fields and missing columns
ALTER TABLE "Cliente"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "resetCodigo"  TEXT,
  ADD COLUMN IF NOT EXISTS "resetExpiry"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cedula"       TEXT,
  ADD COLUMN IF NOT EXISTS "diaSemana"    TEXT;
