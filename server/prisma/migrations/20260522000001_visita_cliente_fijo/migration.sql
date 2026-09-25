ALTER TABLE "Cliente"
  ADD COLUMN IF NOT EXISTS "productosDefault" JSONB;

CREATE TABLE IF NOT EXISTS "VisitaClienteFijo" (
  "id"          SERIAL PRIMARY KEY,
  "clienteId"   INTEGER NOT NULL,
  "conductorId" INTEGER NOT NULL,
  "fecha"       DATE NOT NULL,
  "resultado"   TEXT NOT NULL,
  "pedidoId"    INTEGER,
  "notas"       TEXT,
  "creadoEn"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitaClienteFijo_clienteId_fkey"   FOREIGN KEY ("clienteId")   REFERENCES "Cliente"("id")   ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VisitaClienteFijo_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "VisitaClienteFijo_clienteId_conductorId_fecha_key" UNIQUE ("clienteId", "conductorId", "fecha")
);
