import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthProvider from './store/authStore'
import TripsProvider from './store/tripsStore'
import ChatsProvider from './store/chatsStore'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TripsProvider>
        <ChatsProvider>
          <App />
        </ChatsProvider>
      </TripsProvider>
    </AuthProvider>
  </StrictMode>,
)
