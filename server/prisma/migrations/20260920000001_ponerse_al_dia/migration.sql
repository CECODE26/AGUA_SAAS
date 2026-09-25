-- AlterTable
ALTER TABLE "Camion" ADD COLUMN     "rutaLibre" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "conductorId" INTEGER,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'web';

-- CreateTable
CREATE TABLE "MaestroClientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaestroClientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "poligono" JSONB NOT NULL,
    "color" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "camionId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaestroClientes_username_key" ON "MaestroClientes"("username");

-- CreateIndex
CREATE INDEX "Localidad_camionId_idx" ON "Localidad"("camionId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localidad" ADD CONSTRAINT "Localidad_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "Camion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

