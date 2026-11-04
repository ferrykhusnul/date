import { buildDirectionsUrl, buildSearchUrl, listingUrl } from '../lib/maps';
import type { Venue } from '../types';
import { ExternalLink } from './ExternalLink';
import { Icon } from './Icon';

export function MapsLinks({ venue, compact = false }: { venue: Venue; compact?: boolean }) {
  const cls = `button button-ghost${compact ? ' button-sm' : ''}`;

  if (venue.isSample) {
    if (compact) return null;
    return (
      <div className="maps-links">
        <div className="maps-buttons">
          <button type="button" className={cls} disabled>
            <Icon name="map" size={18} /> Cari di Maps
          </button>
          <button type="button" className={cls} disabled>
            <Icon name="navigation" size={18} /> Petunjuk arah
          </button>
        </div>
        {(
          <p className="field-hint">Venue sampel tidak memiliki lokasi nyata, jadi tautan peta dinonaktifkan.</p>
        )}
      </div>
    );
  }

  const listing = listingUrl(venue);
  return (
    <div className="maps-links">
      <div className="maps-buttons">
        <ExternalLink href={buildSearchUrl(venue)} className={cls} label={`Cari di Maps: ${venue.name}`}>
          <Icon name="map" size={18} /> Cari di Maps
        </ExternalLink>
        <ExternalLink href={buildDirectionsUrl(venue)} className={cls} label={`Petunjuk arah: ${venue.name}`}>
          <Icon name="navigation" size={18} /> Petunjuk arah
        </ExternalLink>
        {!compact &&
          (listing ? (
            <ExternalLink href={listing} className={cls} label={`Listing & ulasan: ${venue.name} di Google Maps`}>
              <Icon name="external" size={18} /> Listing &amp; ulasan
            </ExternalLink>
          ) : (
            <button type="button" className={cls} disabled>
              <Icon name="external" size={18} /> Listing &amp; ulasan
            </button>
          ))}
      </div>
      {!compact && (
        <p className="field-hint">
          {listing
            ? 'Ulasan hanya dapat dibaca langsung di listing Google Maps venue. Aplikasi ini tidak menampilkan rating atau ulasan.'
            : 'Tautan listing Google Maps belum diisi atau tidak valid. Ubah venue untuk menambahkannya.'}
        </p>
      )}
    </div>
  );
}
