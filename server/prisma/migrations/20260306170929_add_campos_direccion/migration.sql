-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION,
ADD COLUMN     "numeracion" TEXT,
ADD COLUMN     "provincia" TEXT NOT NULL DEFAULT 'Pastaza',
ADD COLUMN     "sector" TEXT,
ALTER COLUMN "ciudad" SET DEFAULT 'Santa Clara';
