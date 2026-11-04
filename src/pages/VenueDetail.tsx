import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SampleBadge, SampleNotice } from '../components/SampleBadge';
import { getVenue } from '../data/sampleVenues';
import { formatIDR } from '../lib/format';
import { CATEGORY_LABELS, ENVIRONMENT_OPTIONS, labelOf } from '../lib/options';

export function VenueDetail() {
  const { id = '' } = useParams();
  const venue = getVenue(id);

  if (!venue) {
    return (
      <div className="page page-narrow">
        <PageHeader title="Venue tidak ditemukan" back />
        <EmptyState
          title="Venue ini tidak tersedia"
          body="Tautan mungkin salah atau venue sudah tidak ada di data sampel."
          actions={
            <Link to="/" className="button button-primary">
              Ke beranda
            </Link>
          }
        />
      </div>
    );
  }

  const price =
    venue.priceMin === 0 && venue.priceMax <= 10_000
      ? `Gratis – ${formatIDR(venue.priceMax)}`
      : `${formatIDR(venue.priceMin)} – ${formatIDR(venue.priceMax)}`;

  return (
    <div className="page page-narrow">
      <PageHeader back eyebrow={CATEGORY_LABELS[venue.category]} title={venue.name} />

      <div className="venue-hero" aria-hidden="true">
        <span>{venue.name.charAt(0)}</span>
        <SampleBadge />
      </div>

      <SampleNotice>
        Venue ini adalah data sampel. Nama, alamat, deskripsi, dan harga bukan informasi tempat
        nyata.
      </SampleNotice>

      <dl className="detail-list">
        <div>
          <dt>Alamat</dt>
          <dd>
            <Icon name="pin" size={16} /> {venue.address}
          </dd>
        </div>
        <div>
          <dt>Kategori</dt>
          <dd>
            {CATEGORY_LABELS[venue.category]} · {labelOf(ENVIRONMENT_OPTIONS, venue.environment)}
          </dd>
        </div>
        <div>
          <dt>Perkiraan harga per orang</dt>
          <dd>{price}</dd>
        </div>
        <div>
          <dt>Deskripsi</dt>
          <dd>{venue.description}</dd>
        </div>
      </dl>

      <section className="section">
        <h2 className="section-title">Buka di peta</h2>
        <div className="map-buttons">
          <button type="button" className="button button-ghost" disabled aria-describedby="maps-note">
            <Icon name="map" size={18} />
            Google Maps
          </button>
          <button type="button" className="button button-ghost" disabled aria-describedby="maps-note">
            <Icon name="map" size={18} />
            Apple Maps
          </button>
        </div>
        <p id="maps-note" className="field-hint">
          Tombol peta akan aktif setelah data venue nyata tersedia. Venue sampel tidak memiliki
          lokasi.
        </p>
      </section>
    </div>
  );
}
