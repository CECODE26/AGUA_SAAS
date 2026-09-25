import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import AppMobile from './AppMobile'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import { instalarEncabezadoDistribuidora } from './lib/distribuidora'

// Apps y desarrollo local: cada llamada a /api dice de qué distribuidora es
instalarEncabezadoDistribuidora()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AppMobile />
    </HashRouter>
  </StrictMode>
)
