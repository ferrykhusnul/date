import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { MapsLinks } from '../components/MapsLinks';
import { VenueArt } from '../components/VenueArt';
import { TransitAccessList } from '../components/TransitInfo';
import { PageHeader } from '../components/PageHeader';
import { PriceEstimate } from '../components/PriceEstimate';
import { SampleBadge, SampleNotice } from '../components/SampleBadge';
import { formatDateLong, formatDuration } from '../lib/format';
import { categoryLabel } from '../lib/options';
import { activityLabel, environmentLabel, moodLabel } from '../lib/uiLabels';
import { useVenues } from '../state/VenueStore';

const SOURCE_LABEL = {
  curated: 'Bawaan',
  local: 'Tambahan kamu',
  sample: 'Contoh',
} as const;

export function VenueDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { getVenue, sourceOf, isOverridden, setStatus, removeLocal } = useVenues();
  const venue = getVenue(id);

  if (!venue) {
    return (
      <div className="page page-narrow">
        <PageHeader title="Tempat nggak ketemu" back />
        <EmptyState
          title="Tempat ini udah nggak ada"
          body="Tautan mungkin salah, atau venue sudah dihapus dari dataset."
          actions={<Link to="/venue" className="button button-primary">Lihat semua tempat</Link>}
        />
      </div>
    );
  }

  const source = sourceOf(venue.id);
  const overridden = isOverridden(venue.id);

  const onRemove = () => {
    const msg = overridden
      ? `Balikin "${venue.name}" ke versi awal?`
      : `Hapus "${venue.name}"?`;
    if (!window.confirm(msg)) return;
    removeLocal(venue.id);
    if (!overridden) navigate('/venue', { replace: true });
  };

  return (
    <div className="page page-narrow">
      <PageHeader back eyebrow={categoryLabel(venue.category)} title={venue.name} />

      <VenueArt category={venue.category} size="lg" />

      <div className="badge-row">
        {venue.isSample && <SampleBadge />}
        <span className={venue.status === 'active' ? 'verified-badge' : 'status-badge'}>
          {venue.status === 'active' ? 'Aktif' : 'Nonaktif'}
        </span>
        {source && <span className="tag">{SOURCE_LABEL[source]}{overridden ? ' · diubah' : ''}</span>}
      </div>

      {venue.isSample && (
        <SampleNotice>
          Ini tempat contoh, bukan tempat asli.
        </SampleNotice>
      )}

      {venue.description && <p className="page-lead">{venue.description}</p>}

      <section className="section">
        <h2 className="section-title">Google Maps</h2>
        <MapsLinks venue={venue} />
      </section>

      <section className="section">
        <h2 className="section-title">Akses transum</h2>
        <TransitAccessList venue={venue} />
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
        {venue.transitNote && (
          <div>
            <dt>Catatan transit</dt>
            <dd>{venue.transitNote}</dd>
          </div>
        )}
        <div>
          <dt>Jenis tempat</dt>
          <dd>{categoryLabel(venue.category)} · {environmentLabel(venue.environment)}</dd>
        </div>
        <div>
          <dt>Harga kira-kira</dt>
          <dd><PriceEstimate min={venue.priceMin} max={venue.priceMax} unknown={venue.priceUnknown} /></dd>
        </div>
        <div>
          <dt>Biasanya berapa lama</dt>
          <dd>{formatDuration(venue.visitDurationMinutes)}</dd>
        </div>
        <div>
          <dt>Aktivitas</dt>
          <dd className="chips-static">
            {venue.activities.map((a) => <span key={a} className="tag">{activityLabel(a)}</span>)}
          </dd>
        </div>
        <div>
          <dt>Vibes</dt>
          <dd className="chips-static">
            {venue.vibes.map((v) => <span key={v} className="tag">{moodLabel(v)}</span>)}
          </dd>
        </div>
        {venue.latitude !== undefined && venue.longitude !== undefined && (
          <div>
            <dt>Koordinat</dt>
            <dd className="mono">{venue.latitude}, {venue.longitude}</dd>
          </div>
        )}
        <div>
          <dt>Dicek</dt>
          <dd>{venue.verifiedAt ? formatDateLong(venue.verifiedAt) : 'Belum dicek'}</dd>
        </div>
      </dl>

      {!venue.isSample && (
        <section className="section">
          <h2 className="section-title">Atur tempat</h2>
          <div className="manage-actions">
            <Link to={`/venue/${encodeURIComponent(venue.id)}/ubah`} className="button button-primary">
              <Icon name="edit" size={18} /> Ubah
            </Link>
            <button type="button" className="button button-ghost"
              onClick={() => setStatus(venue.id, venue.status === 'active' ? 'inactive' : 'active')}>
              {venue.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
            {(source === 'local' || overridden) && (
              <button type="button" className="button button-danger-ghost" onClick={onRemove}>
                <Icon name="trash" size={18} /> {overridden ? 'Balikin versi awal' : 'Hapus'}
              </button>
            )}
          </div>
          <p className="field-hint">
            Tempat nonaktif tetap disimpan, tapi nggak dipakai buat ide date.
          </p>
        </section>
      )}
    </div>
  );
}
