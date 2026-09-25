import { useNavigate, useLocation } from 'react-router-dom'

export default function TabBarMobile() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const tabs = [
    {
      id: '/',
      label: 'Inicio',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" style={{ width: '22px', height: '22px', pointerEvents: 'none' }}>
          <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V10.5Z"
            fill="currentColor" />
        </svg>
      ),
    },
    {
      id: '/productos',
      label: 'Productos',
      icon: (
        <svg viewBox="0 0 24 30" fill="none" style={{ width: '18px', height: '22px', pointerEvents: 'none' }}>
          <path d="M12 2C12 2 3 12 3 18C3 23 7.03 27 12 27C16.97 27 21 23 21 18C21 12 12 2 12 2Z"
            fill="currentColor" />
        </svg>
      ),
    },
    {
      id: '/pedidos',
      label: 'Mis pedidos',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" style={{ width: '22px', height: '22px', pointerEvents: 'none' }}>
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M8 8H16M8 12H16M8 16H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ),
    },
  ]

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 200,
      background: '#fff',
      borderTop: '1px solid #e8e8e8',
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {tabs.map(tab => {
        const isActive = pathname === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '10px 0 8px',
              border: 'none',
              background: 'transparent',
              color: isActive ? '#0066CC' : '#aab',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.2s',
            }}
          >
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '32px',
                height: '3px',
                borderRadius: '0 0 3px 3px',
                background: '#0066CC',
              }} />
            )}
            {tab.icon}
            <span style={{
              fontSize: '0.65rem',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.2px',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
