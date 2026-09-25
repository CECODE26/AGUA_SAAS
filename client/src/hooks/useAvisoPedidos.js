// Aviso de PEDIDO NUEVO en el panel admin: sonido + cartel + notificación del navegador.
// Se apoya en `ultimoPedido` que devuelve /api/notificaciones (consultado cada 10 s).
import { useEffect, useRef, useState } from 'react'

const KEY_VISTO = 'admin_ultimo_pedido_visto'   // id del último pedido del que ya avisamos
const KEY_PREF  = 'admin_avisos_pedidos'        // 'on' | 'off'

// ── Sonido generado con WebAudio (sin archivos) ──────────────────────────────
let audioCtx = null
function desbloquearAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
  } catch {}
}
function sonar() {
  try {
    desbloquearAudio()
    if (!audioCtx) return
    const t = audioCtx.currentTime
    // tres notas ascendentes, cortas
    ;[[880, 0], [1174.66, 0.18], [1567.98, 0.36]].forEach(([freq, d]) => {
      const osc  = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t + d)
      gain.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.35)
      osc.connect(gain).connect(audioCtx.destination)
      osc.start(t + d)
      osc.stop(t + d + 0.4)
    })
  } catch {}
}

const soportaNotif = () => typeof window !== 'undefined' && 'Notification' in window

export function useAvisoPedidos(ultimoPedido, navigate) {
  const [aviso,   setAviso]   = useState(null)   // pedido a mostrar en el cartel
  const [activo,  setActivo]  = useState(() => localStorage.getItem(KEY_PREF) !== 'off')
  const [permiso, setPermiso] = useState(() => (soportaNotif() ? Notification.permission : 'unsupported'))
  const primeraCarga = useRef(true)

  // El navegador solo deja sonar audio después de una interacción del usuario
  useEffect(() => {
    const h = () => desbloquearAudio()
    window.addEventListener('pointerdown', h, { once: true })
    window.addEventListener('keydown',     h, { once: true })
    return () => { window.removeEventListener('pointerdown', h); window.removeEventListener('keydown', h) }
  }, [])

  useEffect(() => {
    if (!ultimoPedido?.id) return
    const visto = parseInt(localStorage.getItem(KEY_VISTO) || '0', 10)

    // Primera carga sin referencia previa: tomar el actual como base, sin avisar
    if (primeraCarga.current) {
      primeraCarga.current = false
      if (!visto) { localStorage.setItem(KEY_VISTO, String(ultimoPedido.id)); return }
    }
    if (ultimoPedido.id <= visto) return

    localStorage.setItem(KEY_VISTO, String(ultimoPedido.id))
    if (!activo) return

    setAviso(ultimoPedido)
    sonar()

    // Si la pestaña no está visible, notificación del sistema (aparece aunque estés en otra app)
    if (permiso === 'granted' && document.visibilityState !== 'visible') {
      try {
        const n = new Notification(`🧾 Nuevo pedido #${ultimoPedido.id}`, {
          body: `${ultimoPedido.cliente || 'Cliente'} · $${Number(ultimoPedido.total || 0).toFixed(2)}`,
          tag:  'agua-manu-nuevo-pedido',
        })
        n.onclick = () => { try { window.focus() } catch {}; navigate?.('/admin/pedidos'); n.close() }
      } catch {}
    }
  }, [ultimoPedido?.id])   // eslint-disable-line react-hooks/exhaustive-deps

  // El cartel se cierra solo a los 30 s
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 30_000)
    return () => clearTimeout(t)
  }, [aviso])

  async function activar() {
    desbloquearAudio()
    localStorage.setItem(KEY_PREF, 'on')
    setActivo(true)
    if (soportaNotif() && Notification.permission === 'default') {
      try { setPermiso(await Notification.requestPermission()) } catch {}
    }
    sonar()   // confirmación audible
  }

  function desactivar() {
    localStorage.setItem(KEY_PREF, 'off')
    setActivo(false)
    setAviso(null)
  }

  return { aviso, cerrar: () => setAviso(null), activo, permiso, activar, desactivar }
}
