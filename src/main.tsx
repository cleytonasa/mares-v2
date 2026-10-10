import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA and Push Notifications (only on production/custom domain or localhost, avoiding dev proxy mime type errors)
if ('serviceWorker' in navigator) {
  const isAiStudioPreview = window.location.hostname.includes('.run.app') || window.location.hostname.includes('aistudio');
  if (!isAiStudioPreview) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('SW registration note:', err);
        });
    });
  } else {
    // Unregister any active worker on the preview domain to clean up stale registrations
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

