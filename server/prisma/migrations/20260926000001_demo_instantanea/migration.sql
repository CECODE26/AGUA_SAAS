-- AlterTable
ALTER TABLE "Distribuidora" ADD COLUMN     "demoAccesos" JSONB,
ADD COLUMN     "demoVenceEn" TIMESTAMP(3),
ADD COLUMN     "esDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Distribuidora_esDemo_demoVenceEn_idx" ON "Distribuidora"("esDemo", "demoVenceEn");

