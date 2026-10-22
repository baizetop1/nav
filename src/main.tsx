import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/appearance.css'
import { AppearanceProvider } from './components/appearance/AppearanceProvider'
import { AppearanceBackdrop } from './components/appearance/AppearanceBackdrop'
import { watchAppUpdates } from './services/pwaUpdateNotice'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppearanceProvider><AppearanceBackdrop /><App /></AppearanceProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then((registration) => {
        watchAppUpdates(registration)
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error)
      })
  })
}
