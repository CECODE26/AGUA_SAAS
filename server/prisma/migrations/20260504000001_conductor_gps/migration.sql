-- AlterTable: agregar campos GPS al conductor
ALTER TABLE "Conductor" ADD COLUMN "ubicacionLat" DOUBLE PRECISION;
ALTER TABLE "Conductor" ADD COLUMN "ubicacionLng" DOUBLE PRECISION;
ALTER TABLE "Conductor" ADD COLUMN "ubicacionAt"  TIMESTAMP(3);
