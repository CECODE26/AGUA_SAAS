export default function LOPDP() {
  const secciones = [
    {
      titulo: '1. Responsable del tratamiento',
      contenido: (
        <p>
          <b>Agua Manú S.A.</b><br />
          Puyo, Pastaza, Ecuador<br />
          Teléfono: (03) 2936000 · Correo: ralt4565@hotmail.es
        </p>
      )
    },
    {
      titulo: '2. Datos que recopilamos',
      contenido: (
        <ul>
          <li>Nombre y apellidos</li>
          <li>Número de teléfono</li>
          <li>Dirección de correo electrónico</li>
          <li>Dirección postal (para el servicio a domicilio)</li>
          <li>Datos de preferencias de producto</li>
        </ul>
      )
    },
    {
      titulo: '3. Finalidad del tratamiento',
      contenido: (
        <ul>
          <li>Gestionar y entregar pedidos del servicio a domicilio</li>
          <li>Responder a consultas y solicitudes de contacto</li>
          <li>Enviar información comercial y promociones (solo con su consentimiento)</li>
          <li>Cumplir con obligaciones legales y fiscales</li>
        </ul>
      )
    },
    {
      titulo: '4. Base legal del tratamiento',
      contenido: (
        <ul>
          <li>Su consentimiento expreso (Art. 8, LOPDP)</li>
          <li>La ejecución de un contrato del cual usted es parte</li>
          <li>El cumplimiento de obligaciones legales aplicables</li>
        </ul>
      )
    },
    {
      titulo: '5. Conservación de datos',
      contenido: <p>Sus datos personales serán conservados durante el tiempo necesario para cumplir con la finalidad para la que fueron recopilados, y en todo caso, durante los plazos legalmente establecidos en la legislación ecuatoriana.</p>
    },
    {
      titulo: '6. Sus derechos',
      contenido: (
        <>
          <p>Conforme a la LOPDP, usted tiene derecho a:</p>
          <ul>
            <li><b>Acceso:</b> conocer qué datos personales tenemos sobre usted</li>
            <li><b>Rectificación:</b> corregir datos inexactos o incompletos</li>
            <li><b>Cancelación/Supresión:</b> solicitar la eliminación de sus datos</li>
            <li><b>Oposición:</b> oponerse al tratamiento de sus datos</li>
            <li><b>Portabilidad:</b> recibir sus datos en formato estructurado</li>
            <li><b>Revocación del consentimiento:</b> retirar su consentimiento en cualquier momento</li>
          </ul>
          <p>Para ejercer cualquiera de estos derechos: <b>ralt4565@hotmail.es</b></p>
        </>
      )
    },
    {
      titulo: '7. Seguridad',
      contenido: <p>Implementamos medidas técnicas y organizativas adecuadas para proteger sus datos personales contra acceso no autorizado, pérdida, alteración o divulgación.</p>
    },
    {
      titulo: '8. Cookies',
      contenido: <p>Este sitio web puede utilizar cookies técnicas necesarias para su funcionamiento. No utilizamos cookies de seguimiento o publicidad sin su consentimiento explícito.</p>
    },
    {
      titulo: '9. Actualizaciones',
      contenido: (
        <>
          <p>Esta política puede ser actualizada periódicamente. La versión vigente siempre estará disponible en esta página.</p>
          <p className="text-muted"><small>Última actualización: marzo 2026</small></p>
        </>
      )
    },
  ]

  return (
    <div style={{ paddingTop: '90px' }}>
      {/* Banner */}
      <div className="py-5" style={{ background: 'linear-gradient(135deg, #0066CC 0%, #004fa3 100%)' }}>
        <div className="container text-white text-center py-3">
          <p style={{ letterSpacing: '4px', fontSize: '0.8rem', fontWeight: 700, opacity: 0.8 }}>ECUADOR · LOPDP</p>
          <h1 className="section-heading text-white mb-2">POLÍTICA DE PRIVACIDAD</h1>
          <p className="mb-0 opacity-75">Ley Orgánica de Protección de Datos Personales</p>
        </div>
      </div>

      <div className="container py-5" style={{ maxWidth: '860px' }}>
        {secciones.map(({ titulo, contenido }) => (
          <section key={titulo} className="mb-5">
            <h4 className="fw-bold text-verde mb-3">{titulo}</h4>
            {contenido}
            <hr style={{ borderColor: '#e8f0fd' }} />
          </section>
        ))}
      </div>
    </div>
  )
}
