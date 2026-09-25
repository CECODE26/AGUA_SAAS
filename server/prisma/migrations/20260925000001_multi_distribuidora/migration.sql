-- SaaS multi-distribuidora.
-- Todo lo que ya existía queda en la distribuidora 1 ("principal"). Cámbiale el
-- slug, el nombre y el dominio desde el panel de plataforma después de migrar.


-- CreateTable
CREATE TABLE "Distribuidora" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominio" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "plan" TEXT NOT NULL DEFAULT 'basico',
    "colorPrimario" TEXT NOT NULL DEFAULT '#0066CC',
    "logo" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "emailAvisos" TEXT,
    "ciudad" TEXT NOT NULL DEFAULT 'Puyo',
    "provincia" TEXT NOT NULL DEFAULT 'Pastaza',
    "depositoLat" DOUBLE PRECISION,
    "depositoLng" DOUBLE PRECISION,
    "contenido" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distribuidora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlataformaAdmin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlataformaAdmin_pkey" PRIMARY KEY ("id")
);

-- Distribuidora 1 para los datos existentes (solo si la base ya tenía datos)
INSERT INTO "Distribuidora" ("id", "slug", "nombre", "actualizadoEn")
SELECT 1, 'principal', 'Distribuidora principal', CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Admin") OR EXISTS (SELECT 1 FROM "Producto") OR EXISTS (SELECT 1 FROM "Cliente") OR EXISTS (SELECT 1 FROM "Pedido") OR EXISTS (SELECT 1 FROM "Conductor") OR EXISTS (SELECT 1 FROM "Camion") OR EXISTS (SELECT 1 FROM "ConfigFidelidad");
SELECT setval(pg_get_serial_sequence('"Distribuidora"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "Distribuidora"), 1), (SELECT COUNT(*) > 0 FROM "Distribuidora"));

-- DropIndex
DROP INDEX "Admin_username_key";

-- DropIndex
DROP INDEX "Camion_placa_key";

-- DropIndex
DROP INDEX "Cliente_email_key";

-- DropIndex
DROP INDEX "Conductor_username_key";

-- DropIndex
DROP INDEX "MaestroClientes_username_key";

-- DropIndex
DROP INDEX "Producto_nombre_key";

-- Admin
ALTER TABLE "Admin" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Admin" SET "distribuidoraId" = 1;
ALTER TABLE "Admin" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- MaestroClientes
ALTER TABLE "MaestroClientes" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "MaestroClientes" SET "distribuidoraId" = 1;
ALTER TABLE "MaestroClientes" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- SolicitudActivacion
ALTER TABLE "SolicitudActivacion" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "SolicitudActivacion" SET "distribuidoraId" = 1;
ALTER TABLE "SolicitudActivacion" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Producto
ALTER TABLE "Producto" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Producto" SET "distribuidoraId" = 1;
ALTER TABLE "Producto" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Cliente
ALTER TABLE "Cliente" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Cliente" SET "distribuidoraId" = 1;
ALTER TABLE "Cliente" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Pedido
ALTER TABLE "Pedido" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Pedido" SET "distribuidoraId" = 1;
ALTER TABLE "Pedido" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Camion
ALTER TABLE "Camion" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Camion" SET "distribuidoraId" = 1;
ALTER TABLE "Camion" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Localidad
ALTER TABLE "Localidad" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Localidad" SET "distribuidoraId" = 1;
ALTER TABLE "Localidad" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Conductor
ALTER TABLE "Conductor" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Conductor" SET "distribuidoraId" = 1;
ALTER TABLE "Conductor" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- PlanRuta
ALTER TABLE "PlanRuta" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "PlanRuta" SET "distribuidoraId" = 1;
ALTER TABLE "PlanRuta" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- VisitaClienteFijo
ALTER TABLE "VisitaClienteFijo" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "VisitaClienteFijo" SET "distribuidoraId" = 1;
ALTER TABLE "VisitaClienteFijo" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Contacto
ALTER TABLE "Contacto" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "Contacto" SET "distribuidoraId" = 1;
ALTER TABLE "Contacto" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- MovimientoFidelidad
ALTER TABLE "MovimientoFidelidad" ADD COLUMN "distribuidoraId" INTEGER;
UPDATE "MovimientoFidelidad" SET "distribuidoraId" = 1;
ALTER TABLE "MovimientoFidelidad" ALTER COLUMN "distribuidoraId" SET NOT NULL;

-- Correos internos de clientes sin correo real: dejan de llevar la marca de una empresa
UPDATE "Cliente" SET "email" = replace("email", '@clientes.aguamanu.local', '@clientes.sin-correo.local') WHERE "email" LIKE '%@clientes.aguamanu.local';
UPDATE "Cliente" SET "email" = replace("email", '@aguamanu.local', '@sin-correo.local') WHERE "email" LIKE '%@aguamanu.local';

-- ConfigFidelidad: una fila por distribuidora (antes era una sola fila con id = 1)
ALTER TABLE "ConfigFidelidad" ADD COLUMN "distribuidoraId" INTEGER;
DELETE FROM "ConfigFidelidad" WHERE "id" <> 1;
UPDATE "ConfigFidelidad" SET "distribuidoraId" = 1;
ALTER TABLE "ConfigFidelidad" ALTER COLUMN "distribuidoraId" SET NOT NULL;
ALTER TABLE "ConfigFidelidad" DROP CONSTRAINT "ConfigFidelidad_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ConfigFidelidad_pkey" PRIMARY KEY ("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Distribuidora_slug_key" ON "Distribuidora"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Distribuidora_dominio_key" ON "Distribuidora"("dominio");

-- CreateIndex
CREATE UNIQUE INDEX "PlataformaAdmin_username_key" ON "PlataformaAdmin"("username");

-- CreateIndex
CREATE INDEX "Admin_distribuidoraId_idx" ON "Admin"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_distribuidoraId_username_key" ON "Admin"("distribuidoraId", "username");

-- CreateIndex
CREATE INDEX "Camion_distribuidoraId_idx" ON "Camion"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Camion_distribuidoraId_placa_key" ON "Camion"("distribuidoraId", "placa");

-- CreateIndex
CREATE INDEX "Cliente_distribuidoraId_idx" ON "Cliente"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_distribuidoraId_email_key" ON "Cliente"("distribuidoraId", "email");

-- CreateIndex
CREATE INDEX "Conductor_distribuidoraId_idx" ON "Conductor"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Conductor_distribuidoraId_username_key" ON "Conductor"("distribuidoraId", "username");

-- CreateIndex
CREATE INDEX "Contacto_distribuidoraId_idx" ON "Contacto"("distribuidoraId");

-- CreateIndex
CREATE INDEX "Localidad_distribuidoraId_idx" ON "Localidad"("distribuidoraId");

-- CreateIndex
CREATE INDEX "MaestroClientes_distribuidoraId_idx" ON "MaestroClientes"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "MaestroClientes_distribuidoraId_username_key" ON "MaestroClientes"("distribuidoraId", "username");

-- CreateIndex
CREATE INDEX "MovimientoFidelidad_distribuidoraId_idx" ON "MovimientoFidelidad"("distribuidoraId");

-- CreateIndex
CREATE INDEX "Pedido_distribuidoraId_idx" ON "Pedido"("distribuidoraId");

-- CreateIndex
CREATE INDEX "PlanRuta_distribuidoraId_idx" ON "PlanRuta"("distribuidoraId");

-- CreateIndex
CREATE INDEX "Producto_distribuidoraId_idx" ON "Producto"("distribuidoraId");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_distribuidoraId_nombre_key" ON "Producto"("distribuidoraId", "nombre");

-- CreateIndex
CREATE INDEX "SolicitudActivacion_distribuidoraId_idx" ON "SolicitudActivacion"("distribuidoraId");

-- CreateIndex
CREATE INDEX "VisitaClienteFijo_distribuidoraId_idx" ON "VisitaClienteFijo"("distribuidoraId");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaestroClientes" ADD CONSTRAINT "MaestroClientes_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudActivacion" ADD CONSTRAINT "SolicitudActivacion_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camion" ADD CONSTRAINT "Camion_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localidad" ADD CONSTRAINT "Localidad_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conductor" ADD CONSTRAINT "Conductor_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanRuta" ADD CONSTRAINT "PlanRuta_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitaClienteFijo" ADD CONSTRAINT "VisitaClienteFijo_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigFidelidad" ADD CONSTRAINT "ConfigFidelidad_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoFidelidad" ADD CONSTRAINT "MovimientoFidelidad_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;
