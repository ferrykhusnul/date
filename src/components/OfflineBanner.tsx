import { useOnlineStatus } from '../pwa/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <strong>Kamu sedang offline.</strong> Rencana tersimpan, venue, perencana, dan perhitungan biaya tetap berfungsi.
      Tautan Google Maps butuh koneksi internet.
    </div>
  );
}
