// Almacén central en memoria — singleton de Node.js
// Los módulos se cachean: todas las rutas comparten el mismo objeto
const store = {
  pedidos: [],
  pedidoId: 1,
  usuarios: [],

  // Inventario de productos
  productoId: 7,
  productos: [
    { id: 1, nombre: 'Agua Manú 500ml',   descripcion: 'Perfecta para llevar a todas partes. Ideal para el deporte y la vida cotidiana.', precio: 0.50, stock: 500, tag: 'Más popular' },
    { id: 2, nombre: 'Agua Manú 1L',      descripcion: 'El tamaño familiar para el hogar. Agua mineral natural del Piatúa.',              precio: 0.80, stock: 300, tag: null },
    { id: 3, nombre: 'Agua Manú 2L',      descripcion: 'Para toda la familia. La mejor hidratación al mejor precio.',                     precio: 1.20, stock: 200, tag: null },
    { id: 4, nombre: 'Agua Manú 5L',      descripcion: 'Bidón para el hogar u oficina. Entrega a domicilio disponible.',                  precio: 2.50, stock: 150, tag: null },
    { id: 5, nombre: 'Agua Manú 20L',     descripcion: 'Dispensador familiar o empresarial. Renovación semanal con recogida del envase.', precio: 8.00, stock: 80,  tag: 'Mejor valor' },
    { id: 6, nombre: 'Pack x12 · 500ml',   descripcion: 'Pack familiar de 12 botellas de 500ml. Ahorra más comprando en pack.',            precio: 5.00, stock: 100, tag: null },
  ],
}

module.exports = store
