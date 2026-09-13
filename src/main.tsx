import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LockGate from './components/LockGate'
import AuthGate from './features/auth/AuthGate'
import { initTheme } from './lib/theme'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <LockGate>
        <App />
      </LockGate>
    </AuthGate>
  </StrictMode>,
)
