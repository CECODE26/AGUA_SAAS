export default function Contacto() {
  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>ESTAMOS PARA SERVIRTE</p>
          <h1 className="section-heading text-white mb-2">CONTÁCTANOS</h1>
          <p className="mb-0 opacity-75">Pedidos, sugerencias o simplemente salúdanos</p>
        </div>
      </div>

      <div className="container py-5">

        {/* Tarjetas de contacto rápido */}
        <div className="row g-4 mb-5">
          {/* PUYO */}
          <div className="col-md-4">
            <div className="card border-0 h-100 text-center p-4" style={{ borderRadius: 18, boxShadow: '0 6px 24px rgba(0,102,204,0.10)' }}>
              <div className="mb-3" style={{ fontSize: '2.4rem' }}>📍</div>
              <h5 className="fw-bold mb-1" style={{ color: '#0066CC' }}>Pedidos Puyo</h5>
              <p className="text-muted small mb-3">Llamadas y WhatsApp</p>
              <a href="tel:0987665550" className="btn btn-verde fw-bold mb-2 w-100">
                <i className="bi bi-telephone-fill me-2"></i>0987665550
              </a>
              <a href="tel:0995490254" className="btn btn-outline-secondary fw-bold w-100" style={{ borderRadius: 10 }}>
                <i className="bi bi-telephone me-2"></i>0995490254
              </a>
            </div>
          </div>

          {/* AMBATO */}
          <div className="col-md-4">
            <div className="card border-0 h-100 text-center p-4" style={{ borderRadius: 18, boxShadow: '0 6px 24px rgba(0,102,204,0.10)' }}>
              <div className="mb-3" style={{ fontSize: '2.4rem' }}>🏙️</div>
              <h5 className="fw-bold mb-1" style={{ color: '#0066CC' }}>Pedidos Ambato</h5>
              <p className="text-muted small mb-3">Llamadas y WhatsApp</p>
              <a href="tel:0987808782" className="btn btn-verde fw-bold w-100">
                <i className="bi bi-telephone-fill me-2"></i>0987808782
              </a>
            </div>
          </div>

          {/* EMAIL */}
          <div className="col-md-4">
            <div className="card border-0 h-100 text-center p-4" style={{ borderRadius: 18, boxShadow: '0 6px 24px rgba(0,102,204,0.10)' }}>
              <div className="mb-3" style={{ fontSize: '2.4rem' }}>✉️</div>
              <h5 className="fw-bold mb-1" style={{ color: '#0066CC' }}>Correo electrónico</h5>
              <p className="text-muted small mb-3">Sugerencias y comentarios</p>
              <a href="mailto:aguamanu@hotmail.com" className="btn btn-verde fw-bold w-100">
                <i className="bi bi-envelope-fill me-2"></i>aguamanu@hotmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Dirección + Formulario */}
        <div className="row g-5 mb-5">
          <div className="col-md-5">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>DÓNDE ENCONTRARNOS</p>
            <h4 className="fw-bold mb-4">Planta de producción y punto de venta</h4>

            <div className="d-flex align-items-start mb-4">
              <i className="bi bi-geo-alt-fill me-3 fs-4 text-verde"></i>
              <div>
                <b>Dirección</b>
                <p className="mb-0 text-muted small">Provincia de Pastaza, Cantón Pastaza, Parroquia Puyo</p>
                <p className="mb-0 text-muted small"><b>Paso Lateral junto al Río Pindo Chico</b></p>
                <p className="mb-0 text-muted small fst-italic">Entrada a Miraflores · Conjunto Habitacional Victoria de León</p>
              </div>
            </div>

            <div className="d-flex align-items-start mb-4">
              <i className="bi bi-clock-fill me-3 fs-4 text-verde"></i>
              <div>
                <b>Horario de atención</b>
                <p className="mb-0 text-muted small">Lunes a Viernes: 8:00 AM – 5:00 PM</p>
                <p className="mb-0 text-muted small">Sábado: 8:00 AM – 12:00 PM</p>
              </div>
            </div>

            <div className="d-flex align-items-start mb-4">
              <i className="bi bi-envelope-fill me-3 fs-4 text-verde"></i>
              <div>
                <b>Correo electrónico</b>
                <p className="mb-0 text-muted small">aguamanu@hotmail.com</p>
              </div>
            </div>

            {/* Trabaja con nosotros */}
            <div className="p-4 rounded-4 mt-2" style={{ background: '#e8f0fd' }}>
              <h6 className="fw-bold mb-2" style={{ color: '#0066CC' }}>
                <i className="bi bi-briefcase-fill me-2"></i>¿Deseas trabajar con nosotros?
              </h6>
              <p className="text-muted small mb-2">Comunícate a:</p>
              <p className="mb-1 fw-bold small">0995827758 &nbsp;·&nbsp; 0995490254</p>
              <p className="mb-0 text-muted small">o escríbenos a <a href="mailto:aguamanu@hotmail.com" className="text-verde">aguamanu@hotmail.com</a></p>
            </div>

            <div className="d-flex align-items-center mt-4 gap-3">
              <a href="#" className="text-verde" style={{ fontSize: '1.8rem' }}><i className="bi bi-facebook"></i></a>
              <a href="#" className="text-verde" style={{ fontSize: '1.8rem' }}><i className="bi bi-instagram"></i></a>
              <a href="#" className="text-verde" style={{ fontSize: '1.8rem' }}><i className="bi bi-whatsapp"></i></a>
            </div>
          </div>

          <div className="col-md-7">
            <div className="card border-0 p-4" style={{ boxShadow: '0 10px 40px rgba(0,102,204,0.1)', borderRadius: '16px' }}>
              <h5 className="fw-bold mb-4">Envíanos un mensaje</h5>
              <form>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <input type="text" className="form-control" placeholder="Nombre" />
                  </div>
                  <div className="col-sm-6">
                    <input type="text" className="form-control" placeholder="Apellido" />
                  </div>
                  <div className="col-12">
                    <input type="email" className="form-control" placeholder="Correo Electrónico" />
                  </div>
                  <div className="col-12">
                    <input type="text" className="form-control" placeholder="Número de teléfono" />
                  </div>
                  <div className="col-12">
                    <input type="text" className="form-control" placeholder="Asunto" />
                  </div>
                  <div className="col-12">
                    <textarea className="form-control" rows="4" placeholder="Tu mensaje..."></textarea>
                  </div>
                  <div className="col-12">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="privacyCheck" />
                      <label className="form-check-label small" htmlFor="privacyCheck">
                        Acepto la <a href="/lopdp" className="text-verde">política de privacidad</a>
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-verde w-100 py-2 fw-bold">
                      <i className="bi bi-send-fill me-2"></i>Enviar mensaje
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="rounded-4 overflow-hidden mb-5" style={{ height: 380, boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}>
          <iframe
            title="Ubicación Agua Manú"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src="https://maps.google.com/maps?q=Paso+Lateral+Rio+Pindo+Chico+Puyo+Pastaza+Ecuador&hl=es&z=15&output=embed"
          />
        </div>

        {/* Info distribución */}
        <div className="p-5 rounded-4 text-center" style={{ background: 'linear-gradient(135deg, #004fa3 0%, #0066CC 100%)', color: '#fff' }}>
          <h4 className="fw-bold mb-2">Venta al por mayor y menor</h4>
          <p className="mb-0 opacity-85">
            Nuestra planta es punto de venta directo. También hacemos entregas a domicilio en <b>Puyo</b> y <b>Ambato</b>.
            Contáctanos para coordinar tu pedido.
          </p>
        </div>

      </div>
    </div>
  )
}
