import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Registrar o Service Worker para suporte a PWA (Progressive Web App)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso no escopo:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Erro ao registrar o Service Worker:', error);
      });
  });

  // Forçar recarregamento da página para limpar cache estático assim que o novo service worker tomar controle
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

import { ErrorBoundary } from './components/Shared/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
