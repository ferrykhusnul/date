import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { MapsLinks } from '../components/MapsLinks';
import { PageHeader } from '../components/PageHeader';
import { PriceEstimate } from '../components/PriceEstimate';
import { SampleBadge, SampleNotice } from '../components/SampleBadge';
import { formatDateLong, formatDuration } from '../lib/format';
import { ACTIVITY_OPTIONS, ENVIRONMENT_OPTIONS, VIBE_OPTIONS, categoryLabel, labelOf } from '../lib/options';
import { useVenues } from '../state/VenueStore';
import type { Activity, Vibe } from '../types';

const SOURCE_LABEL = {
  curated: 'Dataset terkurasi',
  local: 'Ditambahkan di perangkat ini',
  sample: 'Data sampel',
} as const;

export function VenueDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { getVenue, sourceOf, isOverridden, setStatus, removeLocal } = useVenues();
  const venue = getVenue(id);

  if (!venue) {
    return (
      <div className="page page-narrow">
        <PageHeader title="Venue tidak ditemukan" back />
        <EmptyState
          title="Venue ini tidak tersedia"
          body="Tautan mungkin salah, atau venue sudah dihapus dari dataset."
          actions={<Link to="/venue" className="button button-primary">Lihat semua venue</Link>}
        />
      </div>
    );
  }

  const source = sourceOf(venue.id);
  const overridden = isOverridden(venue.id);

  const onRemove = () => {
    const msg = overridden
      ? `Kembalikan "${venue.name}" ke versi dataset terkurasi?`
      : `Hapus "${venue.name}" dari perangkat ini?`;
    if (!window.confirm(msg)) return;
    removeLocal(venue.id);
    if (!overridden) navigate('/venue', { replace: true });
  };

  return (
    <div className="page page-narrow">
      <PageHeader back eyebrow={categoryLabel(venue.category)} title={venue.name} />

      <div className="badge-row">
        {venue.isSample && <SampleBadge />}
        <span className={venue.status === 'active' ? 'verified-badge' : 'status-badge'}>
          {venue.status === 'active' ? 'Aktif' : 'Nonaktif'}
        </span>
        {source && <span className="tag">{SOURCE_LABEL[source]}{overridden ? ' · diubah lokal' : ''}</span>}
      </div>

      {venue.isSample && (
        <SampleNotice>
          Venue ini adalah data sampel. Nama, alamat, deskripsi, dan harga bukan informasi tempat nyata.
        </SampleNotice>
      )}

      {venue.description && <p className="page-lead">{venue.description}</p>}

      <section className="section">
        <h2 className="section-title">Buka di Google Maps</h2>
        <MapsLinks venue={venue} />
      </section>

      <dl className="detail-list">
        <div>
          <dt>Alamat</dt>
          <dd>
            <Icon name="pin" size={16} />
            <span>
              {venue.address}
              <br />
              {[venue.district, venue.city].filter(Boolean).join(', ')}
            </span>
          </dd>
        </div>
        {venue.transitAccess && (
          <div>
            <dt>Akses transportasi umum</dt>
            <dd>{venue.transitAccess}</dd>
          </div>
        )}
        <div>
          <dt>Kategori &amp; lingkungan</dt>
          <dd>{categoryLabel(venue.category)} · {labelOf(ENVIRONMENT_OPTIONS, venue.environment)}</dd>
        </div>
        <div>
          <dt>Harga (perkiraan)</dt>
          <dd><PriceEstimate min={venue.priceMin} max={venue.priceMax} /></dd>
        </div>
        <div>
          <dt>Lama kunjungan biasa</dt>
          <dd>{formatDuration(venue.visitDurationMinutes)}</dd>
        </div>
        <div>
          <dt>Aktivitas</dt>
          <dd className="chips-static">
            {venue.activities.map((a) => <span key={a} className="tag">{labelOf(ACTIVITY_OPTIONS, a as Activity)}</span>)}
          </dd>
        </div>
        <div>
          <dt>Vibe</dt>
          <dd className="chips-static">
            {venue.vibes.map((v) => <span key={v} className="tag">{labelOf(VIBE_OPTIONS, v as Vibe)}</span>)}
          </dd>
        </div>
        {venue.latitude !== undefined && venue.longitude !== undefined && (
          <div>
            <dt>Koordinat</dt>
            <dd className="mono">{venue.latitude}, {venue.longitude}</dd>
          </div>
        )}
        <div>
          <dt>Verifikasi</dt>
          <dd>{venue.verifiedAt ? `Dicek ${formatDateLong(venue.verifiedAt)}` : 'Belum diverifikasi'}</dd>
        </div>
      </dl>

      {!venue.isSample && (
        <section className="section">
          <h2 className="section-title">Kelola</h2>
          <div className="manage-actions">
            <Link to={`/venue/${encodeURIComponent(venue.id)}/ubah`} className="button button-primary">
              <Icon name="edit" size={18} /> Ubah venue
            </Link>
            <button type="button" className="button button-ghost"
              onClick={() => setStatus(venue.id, venue.status === 'active' ? 'inactive' : 'active')}>
              {venue.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            {(source === 'local' || overridden) && (
              <button type="button" className="button button-danger-ghost" onClick={onRemove}>
                <Icon name="trash" size={18} /> {overridden ? 'Kembalikan versi terkurasi' : 'Hapus venue'}
              </button>
            )}
          </div>
          <p className="field-hint">
            Venue nonaktif tetap tersimpan, tetapi tidak dipakai saat menyusun rencana baru.
          </p>
        </section>
      )}
    </div>
  );
}
