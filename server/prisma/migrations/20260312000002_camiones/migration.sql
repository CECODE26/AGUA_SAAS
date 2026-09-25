-- CreateTable Conductor (antes de Camion para poder referenciarla)
CREATE TABLE "Conductor" (
    "id"           SERIAL NOT NULL,
    "nombre"       TEXT NOT NULL,
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo"       BOOLEAN NOT NULL DEFAULT false,
    "creadoEn"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "camionId"     INTEGER,

    CONSTRAINT "Conductor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: username único
CREATE UNIQUE INDEX "Conductor_username_key" ON "Conductor"("username");

-- CreateIndex: camionId único (relación 1-a-1)
CREATE UNIQUE INDEX "Conductor_camionId_key" ON "Conductor"("camionId");

-- CreateTable Camion
CREATE TABLE "Camion" (
    "id"       SERIAL NOT NULL,
    "placa"    TEXT NOT NULL,
    "marca"    TEXT NOT NULL,
    "modelo"   TEXT,
    "color"    TEXT,
    "anio"     INTEGER,
    "activo"   BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: placa única
CREATE UNIQUE INDEX "Camion_placa_key" ON "Camion"("placa");

-- AddForeignKey Conductor → Camion
ALTER TABLE "Conductor" ADD CONSTRAINT "Conductor_camionId_fkey"
    FOREIGN KEY ("camionId") REFERENCES "Camion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable PlanRuta
CREATE TABLE "PlanRuta" (
    "id"          SERIAL NOT NULL,
    "nombre"      TEXT NOT NULL,
    "fecha"       DATE NOT NULL,
    "color"       TEXT NOT NULL DEFAULT '#0d6efd',
    "creadoEn"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conductorId" INTEGER,

    CONSTRAINT "PlanRuta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey PlanRuta → Conductor
ALTER TABLE "PlanRuta" ADD CONSTRAINT "PlanRuta_conductorId_fkey"
    FOREIGN KEY ("conductorId") REFERENCES "Conductor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable PlanRutaItem
CREATE TABLE "PlanRutaItem" (
    "id"       SERIAL NOT NULL,
    "orden"    INTEGER NOT NULL DEFAULT 0,
    "rutaId"   INTEGER NOT NULL,
    "pedidoId" INTEGER NOT NULL,

    CONSTRAINT "PlanRutaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ruta+pedido únicos
CREATE UNIQUE INDEX "PlanRutaItem_rutaId_pedidoId_key" ON "PlanRutaItem"("rutaId", "pedidoId");

-- AddForeignKey PlanRutaItem → PlanRuta
ALTER TABLE "PlanRutaItem" ADD CONSTRAINT "PlanRutaItem_rutaId_fkey"
    FOREIGN KEY ("rutaId") REFERENCES "PlanRuta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey PlanRutaItem → Pedido
ALTER TABLE "PlanRutaItem" ADD CONSTRAINT "PlanRutaItem_pedidoId_fkey"
    FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
