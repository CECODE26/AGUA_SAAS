// Política de privacidad (Ley Orgánica de Protección de Datos Personales del Ecuador).
// Texto base común; el responsable y sus datos de contacto son los de cada distribuidora.
// Cada distribuidora debería revisarlo con su asesor legal antes de publicarlo.
import { useDistribuidora } from '../context/DistribuidoraContext'
import SitioLayout, { CabeceraPagina } from '../sitio/SitioLayout'

export default function LOPDP() {
  const { distribuidora, nombre } = useDistribuidora()
  const lugar = [distribuidora?.ciudad, distribuidora?.provincia, 'Ecuador'].filter(Boolean).join(', ')
  const contacto = [distribuidora?.telefono && `teléfono ${distribuidora.telefono}`, distribuidora?.whatsapp && `WhatsApp ${distribuidora.whatsapp}`].filter(Boolean).join(' o ')

  return (
    <SitioLayout>
      <CabeceraPagina ceja="Protección de datos" titulo="Política de" destacado="privacidad">
        Cómo {nombre} usa y cuida los datos que nos das al hacer un pedido o escribirnos.
      </CabeceraPagina>
      <section className="e-papel">
        <div className="e-contenedor e-texto-largo">
          <h2>1. Responsable del tratamiento</h2>
          <p><b>{nombre}</b>, {lugar}.{contacto && <> Puedes comunicarte con nosotros por {contacto}, o desde el formulario de contacto de este sitio.</>}</p>

          <h2>2. Datos que recopilamos</h2>
          <ul>
            <li>Nombre, cédula o RUC y número de teléfono.</li>
            <li>Correo electrónico.</li>
            <li>Dirección de entrega y, si nos das permiso, la ubicación de tu celular.</li>
            <li>Los pedidos que haces y, si participas, los sellos de tu tarjeta de fidelidad.</li>
          </ul>

          <h2>3. Para qué los usamos</h2>
          <ul>
            <li>Recibir, planificar y entregar tus pedidos.</li>
            <li>Avisarte del estado de tu pedido por correo o notificaciones de la app.</li>
            <li>Llevar tu tarjeta de fidelidad, si el programa está activo.</li>
            <li>Responder tus mensajes y consultas.</li>
          </ul>

          <h2>4. Base legal</h2>
          <p>Tratamos tus datos para cumplir el servicio que nos pides (la entrega de tus pedidos) y con tu consentimiento, que das al hacer el pedido o al enviarnos un mensaje, según la Ley Orgánica de Protección de Datos Personales del Ecuador.</p>

          <h2>5. Con quién los compartimos</h2>
          <p>Solo con las personas de nuestro equipo que preparan y entregan tu pedido, y con los proveedores tecnológicos que usamos para operar el servicio (alojamiento del sistema, correo y notificaciones). No vendemos tus datos.</p>

          <h2>6. Cuánto tiempo los guardamos</h2>
          <p>Mientras seas cliente y durante el tiempo que exijan las obligaciones contables y tributarias. Después los eliminamos o anonimizamos.</p>

          <h2>7. Tus derechos</h2>
          <p>Puedes pedirnos acceder, rectificar, actualizar o eliminar tus datos, oponerte a su uso o pedir su portabilidad. Escríbenos por los medios de contacto de arriba y te responderemos en los plazos que fija la ley.</p>
        </div>
      </section>
    </SitioLayout>
  )
}
