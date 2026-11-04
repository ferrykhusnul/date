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
    setStatus(r === 'accepted' ? 'Lagi dipasang ♡' : r === 'dismissed' ? 'Nggak jadi dipasang.' : 'Browser-nya belum nawarin pasang sekarang.');
  };

  return (
    <section className="section storage-card" id="aplikasi">
      <h2 className="section-title"><Icon name="download" size={20} /> Aplikasi &amp; offline</h2>
      <dl className="detail-list compact">
        <div><dt>Aplikasi</dt><dd>{installed ? 'Udah terpasang ♡' : 'Dibuka di browser'}</dd></div>
        <div>
          <dt>Mode offline</dt>
          <dd>
            {{ active: 'Siap offline', installing: 'Lagi disiapin…', none: 'Belum aktif (buka sekali pas online)', unsupported: 'Nggak didukung browser ini' }[sw]}
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
        <p className="eyebrow">Tetap jalan tanpa internet</p>
        <ul>
          <li>Buka aplikasi & semua halamannya</li>
          <li>Date tersimpan & setelan</li>
          <li>Daftar tempat</li>
          <li>Bikin date baru & hitung budget</li>
          <li>Simpan & pulihkan cadangan</li>
        </ul>
        <p>
          Google Maps tetap butuh internet.
        </p>
      </div>
    </section>
  );
}
