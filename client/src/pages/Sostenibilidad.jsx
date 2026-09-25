export default function Sostenibilidad() {
  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>COMPROMISO AMBIENTAL</p>
          <h1 className="section-heading text-white mb-2">SOSTENIBILIDAD</h1>
          <p className="mb-0 opacity-75">Proteger el origen es proteger el producto</p>
        </div>
      </div>

      <div className="container py-5">

        {/* Intro */}
        <div className="row mb-5">
          <div className="col-md-8 mx-auto text-center">
            <p className="lead">
              El agua que embotellamos nace en uno de los ecosistemas más protegidos del planeta.
              Nuestra responsabilidad es asegurarnos de que así siga siendo — para esta generación y las que vienen.
            </p>
          </div>
        </div>

        {/* Zona ECO 1 */}
        <div className="p-5 rounded-4 mb-5" style={{ background: 'linear-gradient(135deg, #004fa3 0%, #0066CC 100%)', color: '#fff' }}>
          <div className="row align-items-center g-4">
            <div className="col-md-7">
              <p style={{ letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>DONDE NACE EL AGUA MANÚ</p>
              <h3 className="fw-bold mb-3">Zona ECO 1 de Puyo, Pastaza</h3>
              <p style={{ opacity: 0.9 }}>
                Nuestros manantiales están localizados en la <b>zona ECO 1 de la ciudad de Puyo</b>,
                área ecológica y protegida, situada en el costado norte del paso lateral vía a Tena.
                Una garantía natural que mantiene las cualidades únicas del agua.
              </p>
              <p style={{ opacity: 0.9 }}>
                Antes de surgir a la superficie, el agua ha viajado por <b>cientos de metros de rocas,
                sedimentos y suelos</b> que sirven como filtros naturales, removiendo contaminantes y
                dotando al agua de minerales esenciales de forma completamente natural.
              </p>
            </div>
            <div className="col-md-5">
              <div className="row g-3">
                {[
                  { valor: 'ECO 1', label: 'Zona protegida' },
                  { valor: '6.85', label: 'pH natural' },
                  { valor: '+3.000mm', label: 'Lluvia anual' },
                  { valor: '80–90%', label: 'Sin intervención humana' },
                  { valor: 'SAE', label: 'Análisis acreditados' },
                  { valor: 'INEN', label: 'Norma 2200:2008' },
                ].map(({ valor, label }) => (
                  <div key={label} className="col-6 text-center p-2 rounded-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <div className="fw-bold" style={{ fontSize: '1.3rem' }}>{valor}</div>
                    <small style={{ opacity: 0.8, fontSize: '0.75rem' }}>{label}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nuestros compromisos */}
        <div className="mb-5">
          <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>NUESTRAS ACCIONES</p>
          <h3 className="fw-bold mb-4">Lo que hacemos para preservar el origen</h3>
          <div className="row g-4">
            {[
              {
                icono: '🌿',
                titulo: 'Gestión Responsable del Agua',
                descripcion: 'Extraemos el agua respetando los límites naturales de los acuíferos de la zona ECO 1. Trabajamos junto a la comunidad local de Puyo para monitorear el estado de los manantiales y su entorno.'
              },
              {
                icono: '♻️',
                titulo: 'Envases Reciclables',
                descripcion: 'El 100% de nuestros envases son fabricados con materiales reciclables. Promovemos activamente su correcta disposición y participamos en programas de economía circular en Puyo.'
              },
              {
                icono: '🌍',
                titulo: 'Huella de Carbono Reducida',
                descripcion: 'Optimizamos nuestras rutas de distribución y avanzamos hacia energías limpias en nuestra planta de producción, reduciendo nuestra huella ambiental en cada botella entregada.'
              },
              {
                icono: '🤝',
                titulo: 'Compromiso con la Comunidad',
                descripcion: 'Operamos con profundo respeto por el entorno amazónico de Puyo. Apoyamos el desarrollo local, generamos empleo digno y contribuimos al bienestar social y económico de la comunidad.'
              },
              {
                icono: '🔬',
                titulo: 'Monitoreo de Calidad',
                descripcion: 'Realizamos análisis periódicos en laboratorios acreditados por el SAE para garantizar que el agua cumple con los más altos estándares internacionales, sin alterar su composición original.'
              },
              {
                icono: '📚',
                titulo: 'Educación Ambiental',
                descripcion: 'Colaboramos con el GAD Municipal de Puyo y escuelas locales para promover la cultura del agua, el cuidado ambiental y el valor de la Amazonía ecuatoriana como fuente de vida.'
              },
            ].map((item) => (
              <div key={item.titulo} className="col-md-6">
                <div className="card border-0 card-hover h-100 p-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)', borderRadius: '16px' }}>
                  <div className="d-flex align-items-start">
                    <span style={{ fontSize: '2.2rem' }} className="me-3">{item.icono}</span>
                    <div>
                      <h5 className="fw-bold text-verde mb-1">{item.titulo}</h5>
                      <p className="mb-0 text-muted small">{item.descripcion}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por qué el agua de Manú es pura */}
        <div className="p-5 rounded-4 mb-5" style={{ background: '#e8f0fd' }}>
          <div className="text-center mb-4">
            <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>LA CIENCIA DETRÁS DE LA PUREZA</p>
            <h3 className="fw-bold">Por qué Agua Manú es especialmente pura</h3>
          </div>
          <div className="row g-4">
            {[
              { num: '01', titulo: 'Origen en zona protegida', texto: 'La zona ECO 1 de Puyo es un área ecológica protegida, sin actividad industrial ni agrícola intensiva. El agua llega virgen directamente desde los manantiales.' },
              { num: '02', titulo: 'Filtración geológica milenaria', texto: 'El agua se filtra durante miles de años por capas de roca volcánica y sedimento, adquiriendo calcio, magnesio, potasio y bicarbonatos de forma totalmente natural.' },
              { num: '03', titulo: 'Ciclo hídrico de renovación permanente', texto: 'Con más de 3.000 mm de lluvia al año, el ciclo hidrológico garantiza renovación constante y los niveles de contaminación más bajos del Ecuador.' },
              { num: '04', titulo: 'Temperatura fría natural', texto: 'Al brotar de los manantiales protegidos, el agua mantiene temperatura baja que limita el crecimiento bacteriano sin necesidad de ningún tratamiento adicional.' },
            ].map(({ num, titulo, texto }) => (
              <div key={num} className="col-md-6">
                <div className="d-flex align-items-start">
                  <span className="fw-bold me-3" style={{ fontSize: '2rem', color: '#0066CC', opacity: 0.3, lineHeight: 1 }}>{num}</span>
                  <div>
                    <h6 className="fw-bold text-verde">{titulo}</h6>
                    <p className="text-muted small mb-0">{texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de tratamiento */}
        <div className="p-5 rounded-4 mb-5" style={{ background: 'linear-gradient(135deg, #004fa3 0%, #0066CC 100%)', color: '#fff' }}>
          <div className="text-center mb-4">
            <p style={{ letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>PROCESO DE PURIFICACIÓN</p>
            <h3 className="fw-bold">Tipo de tratamiento</h3>
            <p style={{ opacity: 0.85 }}>
              Para mantener sus bondades naturales, Agua Manú es captada directamente de los manantiales
              y transportada hacia la planta donde recibe los siguientes procesos:
            </p>
          </div>
          <div className="row g-3 justify-content-center">
            {[
              { num: '01', titulo: 'Filtración',       texto: 'Primera barrera de purificación que elimina partículas en suspensión.' },
              { num: '02', titulo: 'Micro-filtración',  texto: 'Eliminación de microorganismos y partículas ultrafinas.' },
              { num: '03', titulo: 'Rayos Ultravioleta', texto: 'Esterilización sin químicos — destruye bacterias y virus.' },
              { num: '04', titulo: 'Ozonización',       texto: 'Desinfección con ozono que garantiza pureza sin alterar el sabor natural.' },
            ].map(({ num, titulo, texto }) => (
              <div key={num} className="col-md-6">
                <div className="d-flex align-items-start p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <span className="fw-bold me-3" style={{ fontSize: '1.8rem', opacity: 0.5, lineHeight: 1 }}>{num}</span>
                  <div>
                    <h6 className="fw-bold mb-1">{titulo}</h6>
                    <p className="mb-0 small" style={{ opacity: 0.85 }}>{texto}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planta de producción */}
        <div className="mb-5">
          <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>PLANTA DE PRODUCCIÓN</p>
          <h3 className="fw-bold mb-4">Los más altos estándares de calidad</h3>
          <div className="row g-4">
            {[
              { icono: '🏭', titulo: 'Acero inoxidable 304', descripcion: 'Todos los filtros, tanques, tuberías y equipos de lavado y envasado son de acero inoxidable 304 grado alimenticio.' },
              { icono: '🧱', titulo: 'Recubrimiento epóxico', descripcion: 'Pisos y paredes con recubrimiento epóxico, garantizando superficies higiénicas y de fácil limpieza.' },
              { icono: '🦺', titulo: 'Normas de bioseguridad', descripcion: 'Estrictos protocolos de bioseguridad en todas las etapas del proceso garantizan la inocuidad alimentaria.' },
              { icono: '📋', titulo: 'INEN 2200:2008', descripcion: 'Cumplimos con todos los requisitos Físico-Químicos y Microbiológicos de la norma ecuatoriana NTE INEN 2200:2008.' },
            ].map((item) => (
              <div key={item.titulo} className="col-md-6">
                <div className="card border-0 card-hover h-100 p-4" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.07)', borderRadius: '16px' }}>
                  <div className="d-flex align-items-start">
                    <span style={{ fontSize: '2.2rem' }} className="me-3">{item.icono}</span>
                    <div>
                      <h5 className="fw-bold text-verde mb-1">{item.titulo}</h5>
                      <p className="mb-0 text-muted small">{item.descripcion}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* El equilibrio del pH */}
        <div className="p-5 rounded-4 mb-5" style={{ background: '#e8f0fd' }}>
          <div className="row align-items-center g-4">
            <div className="col-md-8">
              <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>EL EQUILIBRIO ES LA CLAVE</p>
              <h3 className="fw-bold mb-3">El pH ideal del agua</h3>
              <p className="text-muted">
                Tiene lógica pensar que el cuerpo humano fue diseñado para beber agua natural. El agua
                demasiado ácida o demasiado alcalina puede ser perjudicial para la salud — debe mantener
                índices de acidez y alcalinidad normales, en el rango de <b>6.5 a 8.5</b> en aguas
                purificadas no carbonatadas, como lo indica la norma.
              </p>
              <p className="text-muted">
                El agua pura, limpia, equilibrada y saludable no es ni demasiado alcalina ni ácida.
                El pH ideal debe estar cerca de los 7 — la medida neutral.
              </p>
              <div className="p-3 rounded-3 d-inline-block" style={{ background: '#0066CC', color: '#fff' }}>
                <span className="fw-bold" style={{ fontSize: '1.1rem' }}>El pH de Agua Manú es <span style={{ fontSize: '1.6rem' }}>6.85</span> ✓</span>
              </div>
              <p className="text-muted mt-3 small fst-italic">¿Sabes el pH del agua que tú consumes?</p>
            </div>
            <div className="col-md-4 text-center">
              <div className="p-4 rounded-4" style={{ background: '#fff', boxShadow: '0 4px 20px rgba(0,102,204,0.12)' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#0066CC', lineHeight: 1 }}>6.85</div>
                <div className="text-muted fw-bold mt-1">pH Agua Manú</div>
                <hr />
                <div className="small text-muted">Rango ideal: 6.5 – 7.0</div>
                <div className="small text-muted">Norma INEN: 6.5 – 8.5</div>
              </div>
            </div>
          </div>
        </div>

        {/* Objetivos 2030 */}
        <div className="text-center">
          <p style={{ color: '#0066CC', letterSpacing: '3px', fontSize: '0.8rem', fontWeight: 700 }}>VISIÓN DE FUTURO</p>
          <h3 className="fw-bold mb-4">Objetivos para 2030</h3>
          <div className="row g-4 justify-content-center">
            {[
              { valor: '50%', label: 'Reducción de emisiones CO₂' },
              { valor: '100%', label: 'Envases reciclables' },
              { valor: '0', label: 'Residuos a vertederos' },
              { valor: '3.000+', label: 'Ha de bosque apoyadas' },
            ].map(({ valor, label }) => (
              <div key={label} className="col-6 col-md-3">
                <div className="p-4 rounded-3" style={{ background: '#e8f0fd' }}>
                  <div className="stat-number">{valor}</div>
                  <p className="text-muted small mt-1 mb-0">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
