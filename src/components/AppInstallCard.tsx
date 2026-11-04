import { useEffect, useState } from 'react';
import { promptInstall, useInstallState } from '../pwa/install';
import { useOnlineStatus } from '../pwa/useOnlineStatus';
import { Icon } from './Icon';

type SwState = 'unsupported' | 'active' | 'installing' | 'none';

function useServiceWorkerState(): SwState {
  const [s, setS] = useState<SwState>(() => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    return navigator.serviceWorker.controller ? 'active' : 'none';
  });
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    const refresh = () => setS(sw.controller ? 'active' : 'installing');
    sw.addEventListener('controllerchange', refresh);
    sw.getRegistration().then((r) => {
      if (!sw.controller) setS(r ? 'installing' : 'none');
    });
    return () => sw.removeEventListener('controllerchange', refresh);
  }, []);
  return s;
}

export function AppInstallCard() {
  const { canPrompt, installed } = useInstallState();
  const sw = useServiceWorkerState();
  const online = useOnlineStatus();
  const [status, setStatus] = useState('');

  const onInstall = async () => {
    const r = await promptInstall();
    setStatus(r === 'accepted' ? 'Date Planner sedang dipasang.' : r === 'dismissed' ? 'Pemasangan dibatalkan.' : 'Peramban tidak menawarkan pemasangan saat ini.');
  };

  return (
    <section className="section storage-card" id="aplikasi">
      <h2 className="section-title"><Icon name="download" size={20} /> Aplikasi &amp; offline</h2>
      <dl className="detail-list compact">
        <div><dt>Status pemasangan</dt><dd>{installed ? 'Terpasang sebagai aplikasi' : 'Dibuka di peramban'}</dd></div>
        <div>
          <dt>Mode offline</dt>
          <dd>
            {{ active: 'Aktif — siap dipakai offline', installing: 'Sedang disiapkan…', none: 'Belum aktif (muat ulang sekali saat online)', unsupported: 'Tidak didukung peramban ini' }[sw]}
          </dd>
        </div>
        <div><dt>Koneksi</dt><dd>{online ? 'Online' : 'Offline'}</dd></div>
      </dl>

      {!installed && (
        canPrompt ? (
          <button type="button" className="button button-primary" onClick={onInstall}>
            <Icon name="download" size={18} /> Pasang aplikasi
          </button>
        ) : (
          <p className="field-hint">
            Di Chrome Android: buka menu <strong>⋮</strong> lalu pilih <strong>Instal aplikasi</strong> atau{' '}
            <strong>Tambahkan ke layar utama</strong>. Di Safari iOS: tombol Bagikan → <strong>Tambahkan ke Layar Utama</strong>.
          </p>
        )
      )}
      <p className="status" role="status" aria-live="polite">{status}</p>

      <div className="privacy-note">
        <p className="eyebrow">Yang tetap berfungsi tanpa internet</p>
        <ul>
          <li>Membuka aplikasi dan semua halamannya</li>
          <li>Rencana tersimpan, draf, dan pengaturan</li>
          <li>Venue lokal dan dataset venue bawaan</li>
          <li>Menyusun rencana baru dan menghitung anggaran</li>
          <li>Ekspor dan impor cadangan</li>
        </ul>
        <p>
          Tautan Google Maps (pencarian, rute, listing) butuh internet dan tidak disimpan untuk offline. Aplikasi ini juga tidak
          menyimpan gambar atau konten dari situs lain.
        </p>
      </div>
    </section>
  );
}
