import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AppStateProvider } from './state/AppState';
import { VenueStoreProvider } from './state/VenueStore';
import { bootstrapStorage } from './storage/bootstrap';
// Imported early so the Android install prompt is captured before React mounts.
import './pwa/install';
import './styles.css';

bootstrapStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <VenueStoreProvider>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </VenueStoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
