import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller)
    if (hadController) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        try { sessionStorage.setItem('baize_app_update_ready', 'true') } catch { /* In-memory notice remains available. */ }
        window.dispatchEvent(new Event('baize:app-update-ready'))
      }, { once: true })
    }
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then((registration) => {
        const notify = () => {
          if (!registration.waiting) return
          try { sessionStorage.setItem('baize_app_update_ready', 'true') } catch { /* In-memory notice remains available. */ }
          window.dispatchEvent(new Event('baize:app-update-ready'))
        }
        notify()
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) notify() })
        })
      })
      .catch((error) => {
        console.warn('Service worker registration failed:', error)
      })
  })
}
