import { Component } from 'react'

/**
 * Red de seguridad global: si cualquier página revienta al renderizar,
 * en vez de una pantalla blanca se muestra un mensaje amable con botón
 * de recarga. El error real queda en la consola para diagnóstico.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('💥 Error capturado por ErrorBoundary:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '2rem', fontFamily: 'inherit',
      }}>
        <div style={{ fontSize: '3rem' }}>😵</div>
        <h4 style={{ color: '#0f1d3e', marginTop: '1rem', fontWeight: 700 }}>
          Algo salió mal en esta pantalla
        </h4>
        <p style={{ color: '#6c757d', maxWidth: 420 }}>
          Ocurrió un error inesperado al mostrar esta página. Tus datos están a salvo.
          Recarga para continuar; si vuelve a pasar, avísale al administrador.
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload() }}
          style={{
            background: '#0066CC', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 22px', fontWeight: 700, cursor: 'pointer',
          }}>
          Recargar la página
        </button>
      </div>
    )
  }
}
