import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './store/authStore'
import TripsProvider from './store/tripsStore'
import ChatsProvider from './store/chatsStore'
import SettingsProvider from './store/settingsStore'

// Mode offline: service worker hanya aktif di build production
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <TripsProvider>
          <ChatsProvider>
            <App />
          </ChatsProvider>
        </TripsProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
