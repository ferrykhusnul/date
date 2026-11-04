import { useOnlineStatus } from '../pwa/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <strong>Lagi offline.</strong> Semua tetap jalan, kecuali Google Maps.
    </div>
  );
}
