export default function Historia() {
  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>PUYO · PASTAZA · ECUADOR</p>
          <h1 className="section-heading text-white mb-2">QUIÉNES SOMOS</h1>
          <p className="mb-0 opacity-75">El equilibrio de la naturaleza</p>
        </div>
      </div>

      <div className="container py-5">

        {/* Intro */}
        <div className="row mb-5">
          <div className="col-md-8 mx-auto text-center">
            <p className="lead">
              Somos una empresa comprometida con la sociedad, que realiza todas sus actividades de manera
              <b> responsable y respetuosa con el entorno</b>, contribuyendo al desarrollo social y
              económico de la comunidad.
            </p>
            <p className="text-muted">
              <b>Agua de Manantial Purificada Manú</b> nace con el objetivo principal de brindar a la
              comunidad un producto de excelente calidad, directo desde los manantiales de la zona ecológica
              protegida de Puyo.
            </p>
          </div>
        </div>

        {/* Quiénes somos + datos */}
        <div className="row g-5 mb-5">
          <div className="col-md-7">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>NUESTRO ORIGEN</p>
            <h3 className="fw-bold mb-4">Agua Manú: nacida de los manantiales</h3>
            <p>
              El nombre <b>Agua Manú</b> nace del corazón de la Amazonía ecuatoriana. Nuestros manantiales
              están localizados en la <b>zona ECO 1 de la ciudad de Puyo</b>, área ecológica y protegida,
              situada en el costado norte del paso lateral vía a Tena — una garantía natural para mantener
              las cualidades únicas del agua.
            </p>
            <p>
              Antes de surgir a la superficie, el agua ha viajado por <b>cientos de metros de rocas,
              sedimentos y suelos</b> que sirven como filtros naturales, removiendo contaminantes y
              dotando al agua de minerales esenciales de forma completamente natural.
            </p>
            <p>
              Operamos desde <b>Puyo, Pastaza</b>, distribuyendo a hogares y empresas en Puyo y Ambato,
              con entrega directa a domicilio.
            </p>
            <blockquote className="p-3 rounded-3 my-4" style={{ borderLeft: '4px solid #0066CC', background: '#e8f0fd' }}>
              <p className="mb-0 fst-italic fw-semibold" style={{ color: '#004fa3' }}>
                "¡El equilibrio de la naturaleza!"
              </p>
            </blockquote>
          </div>
          <div className="col-md-5">
            <div className="card border-0 p-4 h-100" style={{ backgroundColor: '#e8f0fd', borderRadius: '16px' }}>
              <h5 className="fw-bold text-verde mb-4">Nuestra empresa</h5>
              {[
                { icon: '📍', label: 'Planta de producción', valor: 'Paso Lateral, Río Pindo Chico, Puyo' },
                { icon: '🌿', label: 'Origen del agua', valor: 'Zona ECO 1 — área protegida de Puyo' },
                { icon: '🏔️', label: 'Tipo de agua', valor: 'Manantial purificada (NTE INEN 2200:2008)' },
                { icon: '⚗️', label: 'pH del agua', valor: '6,85 — neutro y equilibrado' },
                { icon: '🔬', label: 'Certificación', valor: 'Análisis acreditados por el SAE' },
                { icon: '🚚', label: 'Cobertura', valor: 'Puyo · Ambato — entrega a domicilio' },
                { icon: '📧', label: 'Contacto', valor: 'aguamanu@hotmail.com' },
              ].map(({ icon, label, valor }) => (
                <div key={label} className="d-flex align-items-start mb-3">
                  <span className="me-2">{icon}</span>
                  <div>
                    <small className="text-muted d-block" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>{label.toUpperCase()}</small>
                    <span className="fw-bold small">{valor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Por qué manantial */}
        <div className="p-5 rounded-4 mb-5" style={{ background: 'linear-gradient(135deg, #004fa3 0%, #0066CC 100%)', color: '#fff' }}>
          <div className="row align-items-center g-4">
            <div className="col-md-8">
              <p style={{ letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>¿POR QUÉ AGUA DE MANANTIAL?</p>
              <h3 className="fw-bold mb-3">Las fuentes naturales de mejor calidad</h3>
              <p style={{ opacity: 0.9 }}>
                Los manantiales son las fuentes de agua natural de mejor calidad. Esto se debe a que el
                recurso, antes de surgir a la superficie terrestre, ha viajado por <b>cientos de metros
                de rocas, sedimentos y suelos</b> que sirven como filtros naturales para remover todo
                tipo de contaminantes.
              </p>
              <p style={{ opacity: 0.9 }}>
                Las aguas más saludables que manan de manantiales de montaña tienen un <b>pH entre 6.5
                y 7</b>, el rango ideal para la salud humana. El pH de Agua Manú es de <b>6.85</b> —
                prácticamente neutro y perfectamente equilibrado.
              </p>
              <div className="row g-3 mt-2">
                {[
                  { valor: '6.85', label: 'pH Agua Manú' },
                  { valor: 'ECO 1', label: 'Zona protegida' },
                  { valor: 'INEN', label: 'Norma 2200:2008' },
                  { valor: 'SAE', label: 'Acreditación' },
                ].map(({ valor, label }) => (
                  <div key={label} className="col-6 col-sm-3 text-center">
                    <div className="fw-bold" style={{ fontSize: '1.5rem' }}>{valor}</div>
                    <small style={{ opacity: 0.8 }}>{label}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-md-4 text-center">
              <div style={{ fontSize: '7rem', lineHeight: 1 }}>💧</div>
              <p className="mt-3 fst-italic" style={{ opacity: 0.85, fontSize: '0.95rem' }}>
                "El agua que es demasiado ácida o demasiado alcalina puede ser perjudicial para la salud."
              </p>
            </div>
          </div>
        </div>

        {/* Donde estamos + Comunidad */}
        <div className="row g-5 mb-5">
          <div className="col-md-6">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>DÓNDE ESTAMOS</p>
            <h3 className="fw-bold mb-3">Puyo, corazón de la Amazonía</h3>
            <p>
              Puyo se ubica en la provincia de Pastaza — la más biodiversa del Ecuador. Su territorio
              es parte de la transición entre los Andes tropicales y la llanura amazónica, lo que le
              otorga una riqueza natural y cultural única.
            </p>
            <p>
              Nuestra planta de producción y punto de venta está ubicada en el
              <b> Paso Lateral junto al Río Pindo Chico</b> (Referencia: entrada a Miraflores,
              Conjunto Habitacional Victoria de León), de fácil acceso para todos nuestros clientes.
            </p>
            <div className="d-flex gap-3 mt-4 flex-wrap">
              {[
                { valor: '18–24°C', label: 'Temperatura estable' },
                { valor: '3.000mm', label: 'Lluvia anual' },
                { valor: '+80%', label: 'Cobertura forestal' },
              ].map(({ valor, label }) => (
                <div key={label} className="text-center px-3 py-2 rounded-3" style={{ background: '#e8f0fd', flex: '1 1 100px' }}>
                  <div className="fw-bold text-verde" style={{ fontSize: '1.2rem' }}>{valor}</div>
                  <small className="text-muted">{label}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>NUESTRO COMPROMISO</p>
            <h3 className="fw-bold mb-3">Con la comunidad y el medio ambiente</h3>
            <p>
              Agua Manú opera con un profundo respeto por el entorno amazónico que hace posible nuestro
              producto. Todas nuestras actividades se realizan de forma responsable, cumpliendo con
              estrictas normas de bioseguridad y calidad.
            </p>
            <blockquote className="p-3 rounded-3 my-4" style={{ borderLeft: '4px solid #0066CC', background: '#e8f0fd' }}>
              <p className="mb-1 fst-italic">
                "Cumplimos con todos los requisitos Físico-Químicos y Microbiológicos que exige la
                norma ecuatoriana NTE INEN 2200:2008."
              </p>
            </blockquote>
            <p>
              La honestidad es nuestro principal valor. Por eso publicamos los resultados de nuestros
              análisis físico-químicos realizados en <b>laboratorios acreditados por el SAE</b>
              (Servicio de Acreditación Ecuatoriano).
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
