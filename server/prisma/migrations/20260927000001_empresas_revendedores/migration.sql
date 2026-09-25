-- AlterTable
ALTER TABLE "Distribuidora" ADD COLUMN     "activadaPorId" INTEGER,
ADD COLUMN     "precioMensual" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PlataformaAdmin" ADD COLUMN     "email" TEXT,
ADD COLUMN     "rol" TEXT NOT NULL DEFAULT 'superadmin',
ADD COLUMN     "telefono" TEXT;

-- CreateTable
CREATE TABLE "RegistroSoporte" (
    "id" SERIAL NOT NULL,
    "distribuidoraId" INTEGER NOT NULL,
    "plataformaAdminId" INTEGER NOT NULL,
    "metodo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "estado" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroSoporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroSoporte_distribuidoraId_creadoEn_idx" ON "RegistroSoporte"("distribuidoraId", "creadoEn");

-- AddForeignKey
ALTER TABLE "Distribuidora" ADD CONSTRAINT "Distribuidora_activadaPorId_fkey" FOREIGN KEY ("activadaPorId") REFERENCES "PlataformaAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSoporte" ADD CONSTRAINT "RegistroSoporte_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroSoporte" ADD CONSTRAINT "RegistroSoporte_plataformaAdminId_fkey" FOREIGN KEY ("plataformaAdminId") REFERENCES "PlataformaAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

