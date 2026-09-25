import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import html2canvas from 'html2canvas'
import { useDistribuidora } from '../../context/DistribuidoraContext'

const hoy = () => new Date().toISOString().split('T')[0]
const primerDiaMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function formatMoney(n) {
  return `$${Number(n).toFixed(2)}`
}

const BADGE = {
  entregado:  'success',
  pendiente:  'warning',
  suspendido: 'danger',
}

export default function AdminReportes() {
  const { nombre: nombreMarca } = useDistribuidora()
  const [desde,    setDesde]    = useState(primerDiaMes())
  const [hasta,    setHasta]    = useState(hoy())
  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')

  const cargarReporte = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const token = localStorage.getItem('admin_token')
      const res   = await fetch(`/api/reportes?desde=${desde}&hasta=${hasta}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Error al obtener el reporte')
      setDatos(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  async function exportarPDF() {
    if (!datos) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Reporte de Ventas — ${nombreMarca}`, 14, 18)
    doc.setFontSize(10)
    doc.text(`Período: ${formatFecha(datos.periodo.desde)} — ${formatFecha(datos.periodo.hasta)}`, 14, 26)

    // Resumen
    doc.setFontSize(12)
    doc.text('Resumen', 14, 36)
    autoTable(doc, {
      startY: 40,
      head: [['Total pedidos', 'Ingresos', 'Entregados', 'Pendientes', 'Suspendidos']],
      body: [[
        datos.resumen.totalPedidos,
        formatMoney(datos.resumen.totalIngresos),
        datos.resumen.pedidosEntregados,
        datos.resumen.pedidosPendientes,
        datos.resumen.pedidosSuspendidos,
      ]],
      theme: 'grid',
    })

    // Productos más vendidos
    doc.text('Productos más vendidos', 14, doc.lastAutoTable.finalY + 10)
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 14,
      head: [['Producto', 'Unidades', 'Ingresos']],
      body: datos.productosMasVendidos.map(p => [p.nombre, p.cantidad, formatMoney(p.ingresos)]),
      theme: 'striped',
    })

    // Mapa de entregas
    const mapaEl = document.getElementById('mapa-entregas')
    if (mapaEl) {
      try {
        const canvas  = await html2canvas(mapaEl, { useCORS: true, logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.85)
        const y       = doc.lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.text('Mapa de entregas', 14, y)
        // Ancho disponible = 182mm, proporción 16:9 → alto ≈ 85mm
        doc.addImage(imgData, 'JPEG', 14, y + 4, 182, 85)
        doc.setFontSize(12)
        // Leyenda debajo del mapa
        const leyendaY = y + 4 + 85 + 6
        doc.setFontSize(8)
        doc.setTextColor(34, 139, 34)
        doc.text('● Entregado', 14, leyendaY)
        doc.setTextColor(200, 160, 0)
        doc.text('● Pendiente', 50, leyendaY)
        doc.setTextColor(200, 50, 50)
        doc.text('● Suspendido', 86, leyendaY)
        doc.setTextColor(0, 0, 0)
        // Pedidos en nueva página
        doc.addPage()
      } catch {
        // Si falla la captura del mapa, continuar sin él
      }
    }

    // Pedidos
    doc.setFontSize(12)
    doc.text('Detalle de pedidos', 14, 18)
    autoTable(doc, {
      startY: 22,
      head: [['#', 'Fecha', 'Cliente', 'Dirección', 'Estado', 'Total']],
      body: datos.pedidos.map(p => [
        p.id,
        formatFecha(p.creadoEn),
        p.cliente.nombre,
        p.cliente.direccion ?? '—',
        p.estado,
        formatMoney(p.total),
      ]),
      theme: 'striped',
      columnStyles: { 3: { cellWidth: 50 } },
    })

    doc.save(`reporte-${desde}-${hasta}.pdf`)
  }

  function exportarExcel() {
    if (!datos) return

    const pedidosSheet = datos.pedidos.map(p => ({
      'ID':       p.id,
      'Fecha':    formatFecha(p.creadoEn),
      'Cliente':  p.cliente.nombre,
      'Email':    p.cliente.email,
      'Teléfono': p.cliente.telefono,
      'Estado':   p.estado,
      'Total':    p.total,
    }))

    const productosSheet = datos.productosMasVendidos.map(p => ({
      'Producto':  p.nombre,
      'Unidades':  p.cantidad,
      'Ingresos':  p.ingresos,
    }))

    const wb  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pedidosSheet),    'Pedidos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productosSheet),  'Productos')
    XLSX.writeFile(wb, `reporte-${desde}-${hasta}.xlsx`)
  }

  function exportarCSV() {
    const token = localStorage.getItem('admin_token')
    window.location.href = `/api/reportes/csv?desde=${desde}&hasta=${hasta}&token=${token}`
  }

  const { resumen, productosMasVendidos, pedidos } = datos ?? {}

  return (
    <div>
      <h4 className="fw-bold mb-4" style={{ color: '#0f1d3e' }}>
        <i className="bi bi-bar-chart-fill me-2" style={{ color: '#0066CC' }}></i>
        Reportes de Ventas
      </h4>

      {/* ── Filtros ─────────────────────────────────────── */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-sm-4">
              <label className="form-label small fw-semibold">Desde</label>
              <input type="date" className="form-control" value={desde}
                onChange={e => setDesde(e.target.value)} max={hasta} />
            </div>
            <div className="col-sm-4">
              <label className="form-label small fw-semibold">Hasta</label>
              <input type="date" className="form-control" value={hasta}
                onChange={e => setHasta(e.target.value)} min={desde} max={hoy()} />
            </div>
            <div className="col-sm-4 d-flex gap-2">
              <button className="btn btn-success flex-grow-1 fw-semibold"
                style={{ background: '#0066CC', borderColor: '#0066CC' }}
                onClick={cargarReporte} disabled={cargando}>
                {cargando
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Cargando…</>
                  : <><i className="bi bi-search me-2"></i>Generar</>}
              </button>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="d-flex gap-2 mt-3 flex-wrap">
            {[
              { label: 'Hoy',         fn: () => { setDesde(hoy()); setHasta(hoy()) } },
              { label: 'Esta semana', fn: () => {
                  const d = new Date()
                  const lunes = new Date(d)
                  lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7))
                  setDesde(lunes.toISOString().split('T')[0])
                  setHasta(hoy())
                }},
              { label: 'Este mes',    fn: () => { setDesde(primerDiaMes()); setHasta(hoy()) } },
              { label: 'Mes anterior', fn: () => {
                  const d = new Date()
                  const primero = new Date(d.getFullYear(), d.getMonth() - 1, 1)
                  const ultimo  = new Date(d.getFullYear(), d.getMonth(), 0)
                  setDesde(primero.toISOString().split('T')[0])
                  setHasta(ultimo.toISOString().split('T')[0])
                }},
            ].map(({ label, fn }) => (
              <button key={label} className="btn btn-outline-secondary btn-sm" onClick={fn}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {datos && (
        <>
          {/* ── Tarjetas resumen ────────────────────────── */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Total pedidos',  value: resumen.totalPedidos,      icon: 'bi-box-seam',    color: '#0f1d3e' },
              { label: 'Ingresos',       value: formatMoney(resumen.totalIngresos), icon: 'bi-cash-stack', color: '#0066CC' },
              { label: 'Entregados',     value: resumen.pedidosEntregados,  icon: 'bi-check-circle', color: '#198754' },
              { label: 'Pendientes',     value: resumen.pedidosPendientes,  icon: 'bi-hourglass',   color: '#ffc107' },
              { label: 'Suspendidos',    value: resumen.pedidosSuspendidos, icon: 'bi-x-circle',    color: '#dc3545' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="col-6 col-md-4 col-lg">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body text-center py-3">
                    <i className={`bi ${icon} fs-4 mb-1`} style={{ color }}></i>
                    <div className="fw-bold fs-5">{value}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(resumen.regaladosFidelidad > 0 || resumen.descuentosFidelidad > 0) && (
            <div className="rounded-3 px-3 py-2 mb-4 d-flex align-items-center gap-2" style={{ background: '#fff8e6', border: '1px solid #f3dca4', color: '#7a5a12', fontSize: '0.85rem' }}>
              <i className="bi bi-gift-fill"></i>
              <span>
                Fidelidad en este periodo: <b>{resumen.regaladosFidelidad}</b> producto(s) regalado(s) y <b>{formatMoney(resumen.descuentosFidelidad)}</b> en descuentos.
                Los ingresos ya muestran solo lo cobrado.
              </span>
            </div>
          )}

          {/* ── Botones exportar ────────────────────────── */}
          <div className="d-flex gap-2 mb-4 flex-wrap">
            <button className="btn btn-danger btn-sm fw-semibold" onClick={exportarPDF}>
              <i className="bi bi-filetype-pdf me-1"></i>PDF
            </button>
            <button className="btn btn-success btn-sm fw-semibold" onClick={exportarExcel}>
              <i className="bi bi-file-earmark-excel me-1"></i>Excel
            </button>
            <button className="btn btn-secondary btn-sm fw-semibold" onClick={exportarCSV}>
              <i className="bi bi-filetype-csv me-1"></i>CSV
            </button>
          </div>

          {/* ── Productos más vendidos ───────────────────── */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white fw-semibold border-0 pt-3">
              <i className="bi bi-trophy me-2" style={{ color: '#0066CC' }}></i>
              Productos más vendidos
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Producto</th>
                      <th className="text-center">Unidades</th>
                      <th className="text-end">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosMasVendidos.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted py-3">Sin datos</td></tr>
                    ) : productosMasVendidos.map((p, i) => (
                      <tr key={p.nombre}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="fw-semibold">{p.nombre}</td>
                        <td className="text-center">
                          {p.cantidad}
                          {p.regalados > 0 && <div style={{ fontSize: '0.72rem', color: '#b27a14' }}>+{p.regalados} regalado{p.regalados > 1 ? 's' : ''}</div>}
                        </td>
                        <td className="text-end">{formatMoney(p.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Mapa de entregas ────────────────────────── */}
          <MapaEntregas pedidos={pedidos} />

          {/* ── Detalle pedidos ─────────────────────────── */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white fw-semibold border-0 pt-3">
              <i className="bi bi-list-ul me-2" style={{ color: '#0066CC' }}></i>
              Detalle de pedidos ({pedidos.length})
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Productos</th>
                      <th>Estado</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-muted py-4">Sin pedidos en este período</td></tr>
                    ) : pedidos.map(p => (
                      <tr key={p.id}>
                        <td className="text-muted">#{p.id}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatFecha(p.creadoEn)}</td>
                        <td>
                          <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>{p.cliente.nombre}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{p.cliente.telefono}</div>
                        </td>
                        <td>
                          {p.items.map(i => (
                            <div key={i.nombre} style={{ fontSize: '0.8rem' }}>
                              {i.nombre} × {i.cantidad}
                            </div>
                          ))}
                        </td>
                        <td>
                          <span className={`badge bg-${BADGE[p.estado]}`}>{p.estado}</span>
                        </td>
                        <td className="text-end fw-semibold">{formatMoney(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!datos && !cargando && (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bar-chart fs-1 d-block mb-2"></i>
          Selecciona un período y pulsa <strong>Generar</strong>
        </div>
      )}
    </div>
  )
}

const COLOR_ESTADO = {
  entregado:  '#198754',
  pendiente:  '#ffc107',
  suspendido: '#dc3545',
}

function MapaEntregas({ pedidos }) {
  const puntos = pedidos.filter(p => p.cliente.latitud && p.cliente.longitud)

  // Centro: promedio de coordenadas con GPS, o Puyo por defecto
  const centro = puntos.length > 0
    ? [
        puntos.reduce((s, p) => s + p.cliente.latitud,  0) / puntos.length,
        puntos.reduce((s, p) => s + p.cliente.longitud, 0) / puntos.length,
      ]
    : [-1.0403, -77.8167] // Puyo, Pastaza

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white fw-semibold border-0 pt-3 d-flex align-items-center justify-content-between">
        <span>
          <i className="bi bi-geo-alt-fill me-2" style={{ color: '#0066CC' }}></i>
          Mapa de entregas
        </span>
        <div className="d-flex gap-3" style={{ fontSize: '0.75rem' }}>
          {Object.entries(COLOR_ESTADO).map(([estado, color]) => (
            <span key={estado} className="d-flex align-items-center gap-1">
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
              {estado}
            </span>
          ))}
        </div>
      </div>
      <div id="mapa-entregas" className="card-body p-0" style={{ borderRadius: '0 0 .5rem .5rem', overflow: 'hidden' }}>
        {puntos.length === 0 ? (
          <div className="text-center text-muted py-4">
            <i className="bi bi-geo-alt fs-3 d-block mb-1"></i>
            Ningún pedido de este período tiene coordenadas GPS registradas
          </div>
        ) : (
          <MapContainer center={centro} zoom={14} style={{ height: '420px', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {puntos.map(p => (
              <CircleMarker
                key={p.id}
                center={[p.cliente.latitud, p.cliente.longitud]}
                radius={9}
                pathOptions={{
                  fillColor: COLOR_ESTADO[p.estado] ?? '#6c757d',
                  color: '#fff',
                  weight: 2,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div className="fw-bold">#{p.id} — {p.cliente.nombre}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{p.cliente.telefono}</div>
                    {p.cliente.direccion && (
                      <div style={{ fontSize: '0.8rem' }}>{p.cliente.direccion}</div>
                    )}
                    <hr className="my-1" />
                    <div style={{ fontSize: '0.8rem' }}>
                      {p.items.map(i => <div key={i.nombre}>{i.nombre} × {i.cantidad}</div>)}
                    </div>
                    <div className="fw-semibold mt-1">{formatMoney(p.total)}</div>
                    <span
                      className={`badge bg-${BADGE[p.estado]} mt-1`}
                      style={{ fontSize: '0.7rem' }}>
                      {p.estado}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  )
}
