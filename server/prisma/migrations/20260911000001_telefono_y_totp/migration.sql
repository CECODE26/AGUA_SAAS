-- Celular de contacto y verificación en dos pasos (TOTP) para admins; celular para choferes y solicitudes
ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "telefono"   TEXT,
  ADD COLUMN IF NOT EXISTS "totpSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "totpActivo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "totpLogin"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conductor"           ADD COLUMN IF NOT EXISTS "telefono"       TEXT;
ALTER TABLE "SolicitudActivacion" ADD COLUMN IF NOT EXISTS "targetTelefono" TEXT;
