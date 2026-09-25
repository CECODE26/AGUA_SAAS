-- Agregar valor no_entregado al enum EstadoPedido
ALTER TYPE "EstadoPedido" ADD VALUE 'no_entregado';

-- Agregar columna motivoNoEntrega a Pedido
ALTER TABLE "Pedido" ADD COLUMN "motivoNoEntrega" TEXT;
