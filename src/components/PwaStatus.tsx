import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker and shows two small notices:
 * "ready to work offline" (first install) and "new version available".
 * Updates are applied only when the user chooses to reload.
 */
export function PwaStatus() {
  const [error, setError] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Look for a new version now and then while the app stays open.
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => undefined);
      }, UPDATE_CHECK_MS);
    },
    onRegisterError() {
      setError(true);
    },
  });

  // The offline-ready notice only needs to be seen once.
  useEffect(() => {
    if (!offlineReady) return;
    const t = setTimeout(() => setOfflineReady(false), 8000);
    return () => clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh && !error) return null;

  return (
    <div className="pwa-toast" role="status" aria-live="polite">
      {needRefresh ? (
        <>
          <span>Versi baru Date Planner tersedia.</span>
          <span className="pwa-toast-actions">
            <button type="button" className="button button-primary button-sm" onClick={() => updateServiceWorker(true)}>
              Muat ulang
            </button>
            <button type="button" className="button button-ghost button-sm" onClick={() => setNeedRefresh(false)}>
              Nanti
            </button>
          </span>
        </>
      ) : offlineReady ? (
        <>
          <span>Siap dipakai offline. Rencana dan venue tersimpan di perangkat ini.</span>
          <button type="button" className="button button-ghost button-sm" onClick={() => setOfflineReady(false)}>Oke</button>
        </>
      ) : (
        <>
          <span>Mode offline tidak dapat diaktifkan di peramban ini. Aplikasi tetap berjalan selama online.</span>
          <button type="button" className="button button-ghost button-sm" onClick={() => setError(false)}>Tutup</button>
        </>
      )}
    </div>
  );
}
