-- Extender enum TipoSolicitud con los nuevos tipos
ALTER TYPE "TipoSolicitud" ADD VALUE 'camion_nuevo';
ALTER TYPE "TipoSolicitud" ADD VALUE 'cambio_conductor';

-- Agregar campos de camión a SolicitudActivacion
ALTER TABLE "SolicitudActivacion" ADD COLUMN "camionPlaca"  TEXT;
ALTER TABLE "SolicitudActivacion" ADD COLUMN "camionMarca"  TEXT;
ALTER TABLE "SolicitudActivacion" ADD COLUMN "camionModelo" TEXT;
ALTER TABLE "SolicitudActivacion" ADD COLUMN "camionColor"  TEXT;
ALTER TABLE "SolicitudActivacion" ADD COLUMN "camionAnio"   INTEGER;

-- Crear tabla de historial de conductores por camión
CREATE TABLE "HistorialConductorCamion" (
    "id"               SERIAL NOT NULL,
    "camionId"         INTEGER NOT NULL,
    "conductorId"      INTEGER,
    "conductorNombre"  TEXT NOT NULL,
    "asignadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removidoEn"       TIMESTAMP(3),

    CONSTRAINT "HistorialConductorCamion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "HistorialConductorCamion"
    ADD CONSTRAINT "HistorialConductorCamion_camionId_fkey"
    FOREIGN KEY ("camionId") REFERENCES "Camion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HistorialConductorCamion"
    ADD CONSTRAINT "HistorialConductorCamion_conductorId_fkey"
    FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
