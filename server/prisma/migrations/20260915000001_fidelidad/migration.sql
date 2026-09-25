-- Tarjeta de fidelidad: sellos por bidón entregado y bidón gratis al completar
ALTER TABLE "Cliente"
  ADD COLUMN IF NOT EXISTS "sellos"             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "premiosDisponibles" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "premioAplicado" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "ConfigFidelidad" (
  "id"                INTEGER NOT NULL DEFAULT 1,
  "activo"            BOOLEAN NOT NULL DEFAULT false,
  "sellosParaPremio"  INTEGER NOT NULL DEFAULT 10,
  "productoPremioId"  INTEGER,
  "productosQueSuman" JSONB,
  "sumaApp"           BOOLEAN NOT NULL DEFAULT true,
  "sumaExpress"       BOOLEAN NOT NULL DEFAULT true,
  "sumaVisitaFija"    BOOLEAN NOT NULL DEFAULT true,
  "caducidadMeses"    INTEGER,
  "maxPremiosPorMes"  INTEGER,
  "actualizadoEn"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfigFidelidad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MovimientoFidelidad" (
  "id"        SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "tipo"      TEXT NOT NULL,
  "sellos"    INTEGER NOT NULL DEFAULT 0,
  "pedidoId"  INTEGER,
  "origen"    TEXT,
  "nota"      TEXT,
  "creadoEn"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimientoFidelidad_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MovimientoFidelidad_pedidoId_tipo_key" ON "MovimientoFidelidad"("pedidoId", "tipo");
CREATE INDEX IF NOT EXISTS "MovimientoFidelidad_clienteId_idx" ON "MovimientoFidelidad"("clienteId");
DO $$ BEGIN
  ALTER TABLE "MovimientoFidelidad" ADD CONSTRAINT "MovimientoFidelidad_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- El bidón gratis va en su propia línea a $0: se quita el único (pedidoId, productoId)
DROP INDEX IF EXISTS "PedidoItem_pedidoId_productoId_key";
CREATE INDEX IF NOT EXISTS "PedidoItem_pedidoId_idx" ON "PedidoItem"("pedidoId");

-- Premio configurable: un producto gratis (recarga o envase) o un % de descuento
ALTER TABLE "ConfigFidelidad"
  ADD COLUMN IF NOT EXISTS "tipoPremio"   TEXT NOT NULL DEFAULT 'producto',
  ADD COLUMN IF NOT EXISTS "descuentoPct" INTEGER;
ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "descuentoFidelidad" DOUBLE PRECISION;
