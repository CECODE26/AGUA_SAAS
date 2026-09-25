const nodemailer = require('nodemailer')
const { distribuidoraActual } = require('./tenant')
const { nombreMarca } = require('./marca')
const { urlSitio } = require('./distribuidoras')

// Un solo buzón de envío (el de la plataforma); cada correo sale con el nombre de la
// distribuidora y los avisos internos van a su correo de avisos.
// Las demos de la landing nunca mandan correos (los clientes de ejemplo no existen y un
// visitante podría escribir el correo de otra persona)
const esDemo = () => !!distribuidoraActual()?.esDemo
const sinCorreo = () => !process.env.MAIL_USER || esDemo()

const remitente = () => `"${nombreMarca().replace(/"/g, '')}" <${process.env.MAIL_USER}>`
const destinoAvisos = () => distribuidoraActual()?.emailAvisos || process.env.MAIL_ADMIN
function pieDePagina() {
  const d = distribuidoraActual()
  return [nombreMarca(), d?.telefono, [d?.ciudad, d?.provincia].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
})

// ── Email al ADMIN: nuevo pedido ──────────────────────────────────────────
async function emailNuevoPedido(pedido, cliente) {
  if (sinCorreo() || !destinoAvisos()) return

  const itemsHtml = pedido.items.map(i =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.producto?.nombre ?? ''}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.cantidad}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">$${(i.precioUnitario * i.cantidad).toFixed(2)}</td>
    </tr>`
  ).join('')

  await transporter.sendMail({
    from:    remitente(),
    to:      destinoAvisos(),
    subject: `🚰 Nuevo pedido #${pedido.id} — ${cliente.nombre} ($${parseFloat(pedido.total).toFixed(2)})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0066CC;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">💧 Nuevo Pedido Recibido</h2>
        </div>
        <div style="background:#f8fafb;padding:24px;border:1px solid #e0e0e0">

          <h3 style="color:#0f1d3e;margin-top:0">Pedido #${pedido.id}</h3>

          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:20px">
            <thead>
              <tr style="background:#e8f0fd">
                <th style="padding:8px 12px;text-align:left;color:#0066CC">Producto</th>
                <th style="padding:8px 12px;text-align:center;color:#0066CC">Cant.</th>
                <th style="padding:8px 12px;text-align:right;color:#0066CC">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="background:#e8f0fd">
                <td colspan="2" style="padding:8px 12px;font-weight:bold">TOTAL</td>
                <td style="padding:8px 12px;font-weight:bold;text-align:right;color:#0066CC">$${parseFloat(pedido.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <h4 style="color:#0f1d3e">Cliente</h4>
          <p style="margin:4px 0">👤 <b>${cliente.nombre}</b></p>
          <p style="margin:4px 0">📞 ${cliente.telefono}</p>
          <p style="margin:4px 0">✉️ ${cliente.email}</p>
          <p style="margin:4px 0">📍 ${[cliente.callePrincipal, cliente.calleSecundaria && `y ${cliente.calleSecundaria}`, cliente.ciudad].filter(Boolean).join(', ')}</p>
          ${cliente.referencia ? `<p style="margin:4px 0">🚩 ${cliente.referencia}</p>` : ''}

        </div>
        <div style="background:#0f1d3e;padding:12px;text-align:center;border-radius:0 0 8px 8px">
          <p style="color:#fff;margin:0;font-size:12px">${pieDePagina()}</p>
        </div>
      </div>
    `,
  })
}

// ── Email al CLIENTE: confirmación de pedido ─────────────────────────────
async function emailConfirmacionCliente(pedido, cliente) {
  if (sinCorreo()) return

  const itemsHtml = pedido.items.map(i =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.producto?.nombre ?? ''} × ${i.cantidad}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">$${(i.precioUnitario * i.cantidad).toFixed(2)}</td>
    </tr>`
  ).join('')

  await transporter.sendMail({
    from:    remitente(),
    to:      cliente.email,
    subject: `✅ Pedido #${pedido.id} confirmado — ${nombreMarca()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0066CC;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">✅ ¡Pedido Confirmado!</h2>
        </div>
        <div style="background:#f8fafb;padding:24px;border:1px solid #e0e0e0">

          <p style="font-size:16px;color:#0f1d3e">Hola <b>${cliente.nombre}</b>,</p>
          <p style="color:#555">Hemos recibido tu pedido correctamente. Nos pondremos en contacto contigo a la brevedad para coordinar la entrega.</p>

          <h3 style="color:#0f1d3e">Resumen del pedido #${pedido.id}</h3>
          <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;margin-bottom:20px">
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr style="background:#e8f0fd">
                <td style="padding:8px 12px;font-weight:bold">TOTAL</td>
                <td style="padding:8px 12px;font-weight:bold;text-align:right;color:#0066CC">$${parseFloat(pedido.total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background:#e8f0fd;border-radius:8px;padding:16px;margin-bottom:20px">
            <p style="margin:0;color:#0a1845;font-size:14px">
              📍 Dirección de entrega: <b>${[cliente.callePrincipal, cliente.ciudad].filter(Boolean).join(', ') || 'Por confirmar'}</b>
            </p>
          </div>

          <p style="color:#555;font-size:13px">
            Puedes consultar el estado de tu pedido en cualquier momento en:<br>
            <a href="${urlSitio(distribuidoraActual())}/mis-pedidos" style="color:#0066CC;font-weight:bold">
              Ver mis pedidos →
            </a>
          </p>

        </div>
        <div style="background:#0f1d3e;padding:12px;text-align:center;border-radius:0 0 8px 8px">
          <p style="color:#fff;margin:0;font-size:12px">${pieDePagina()}</p>
        </div>
      </div>
    `,
  })
}

// ── Email al CLIENTE: código de recuperación de contraseña ───────────────
async function emailRecuperarPassword(email, nombre, codigo) {
  if (sinCorreo()) return
  await transporter.sendMail({
    from:    remitente(),
    to:      email,
    subject: `🔐 Código de recuperación — ${nombreMarca()}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#0066CC;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">🔐 Recuperar contraseña</h2>
        </div>
        <div style="background:#f8fafb;padding:32px;border:1px solid #e0e0e0;text-align:center">
          <p style="font-size:16px;color:#0f1d3e;margin-top:0">Hola <b>${nombre}</b>,</p>
          <p style="color:#555;margin-bottom:28px">Usa este código para restablecer tu contraseña. Expira en <b>15 minutos</b>.</p>
          <div style="background:#0066CC;color:#fff;font-size:36px;font-weight:900;letter-spacing:10px;padding:20px 32px;border-radius:12px;display:inline-block">
            ${codigo}
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Si no solicitaste este código, ignora este correo.</p>
        </div>
        <div style="background:#0f1d3e;padding:12px;text-align:center;border-radius:0 0 8px 8px">
          <p style="color:#fff;margin:0;font-size:12px">${pieDePagina()}</p>
        </div>
      </div>
    `,
  })
}

// ── Email al ADMIN: cliente nuevo eligió sus días de visita fija ──────────
const DIAS_LABEL = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' }

async function emailNuevoClienteFijo(cliente) {
  if (sinCorreo() || !destinoAvisos()) return

  const visitas = Array.isArray(cliente.visitasHorario) ? cliente.visitasHorario : []
  const visitasHtml = visitas.length
    ? visitas.map(v => `<li>${DIAS_LABEL[v.dia] ?? v.dia}${v.hora ? ` a las ${v.hora}` : ''}</li>`).join('')
    : '<li>—</li>'
  const direccion = [cliente.callePrincipal, cliente.calleSecundaria && `y ${cliente.calleSecundaria}`, cliente.sector].filter(Boolean).join(', ')
  const gps = cliente.latitud && cliente.longitud
    ? `<a href="https://maps.google.com/?q=${cliente.latitud},${cliente.longitud}">Ver en el mapa</a>`
    : '<b style="color:#dc2626">Sin GPS — no aparecerá en la ruta hasta que lo tenga</b>'

  await transporter.sendMail({
    from:    remitente(),
    to:      destinoAvisos(),
    subject: `🗓️ Nuevo cliente fijo desde la app — ${cliente.nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#7c3aed;padding:24px;text-align:center;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">🗓️ Nuevo cliente fijo</h2>
          <p style="color:#ede9fe;margin:6px 0 0;font-size:13px">Se registró en la app y eligió sus días de visita</p>
        </div>
        <div style="background:#f8fafb;padding:24px;border:1px solid #e0e0e0">
          <p style="margin:4px 0">👤 <b>${cliente.nombre}</b></p>
          <p style="margin:4px 0">📞 ${cliente.telefono ?? '—'}</p>
          <p style="margin:4px 0">✉️ ${cliente.email ?? '—'}</p>
          <p style="margin:4px 0">📍 ${direccion || '—'}</p>
          ${cliente.referencia ? `<p style="margin:4px 0">🚩 ${cliente.referencia}</p>` : ''}
          <p style="margin:4px 0">🗺️ ${gps}</p>
          <h4 style="color:#0f1d3e;margin:16px 0 6px">Días de visita</h4>
          <ul style="margin:0;padding-left:20px">${visitasHtml}</ul>
          <p style="margin:18px 0 0;font-size:13px;color:#475569">Revísalo en el Maestro de Clientes (filtro "Nuevos esta semana").</p>
        </div>
        <div style="background:#0f1d3e;padding:12px;text-align:center;border-radius:0 0 8px 8px">
          <p style="color:#fff;margin:0;font-size:12px">${pieDePagina()}</p>
        </div>
      </div>
    `,
  })
}

module.exports = { emailNuevoPedido, emailConfirmacionCliente, emailRecuperarPassword, emailNuevoClienteFijo }
