-- CreateEnum
CREATE TYPE "RolAdmin" AS ENUM ('superadmin', 'admin');

-- CreateEnum
CREATE TYPE "TipoSolicitud" AS ENUM ('conductor', 'admin');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- AlterTable Admin: agregar rol y activo
ALTER TABLE "Admin" ADD COLUMN "rol" "RolAdmin" NOT NULL DEFAULT 'admin';
ALTER TABLE "Admin" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SolicitudActivacion" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoSolicitud" NOT NULL,
    "targetId" INTEGER,
    "targetNombre" TEXT NOT NULL,
    "targetUsername" TEXT,
    "targetPasswordHash" TEXT,
    "solicitadoPor" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaEn" TIMESTAMP(3),

    CONSTRAINT "SolicitudActivacion_pkey" PRIMARY KEY ("id")
);
