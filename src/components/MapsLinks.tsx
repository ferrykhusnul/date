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
            <Icon name="map" size={18} /> Buka Maps
          </button>
          <button type="button" className={cls} disabled>
            <Icon name="navigation" size={18} /> Rute
          </button>
        </div>
        {(
          <p className="field-hint">Tempat contoh nggak punya lokasi asli, jadi Maps-nya mati.</p>
        )}
      </div>
    );
  }

  const listing = listingUrl(venue);
  return (
    <div className="maps-links">
      <div className="maps-buttons">
        <ExternalLink href={buildSearchUrl(venue)} className={cls} label={`Buka Maps: ${venue.name}`}>
          <Icon name="map" size={18} /> Buka Maps
        </ExternalLink>
        <ExternalLink href={buildDirectionsUrl(venue)} className={cls} label={`Rute: ${venue.name}`}>
          <Icon name="navigation" size={18} /> Rute
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
            ? 'Ulasan bisa dibaca langsung di Google Maps.'
            : 'Link Google Maps belum diisi. Atur tempat ini buat nambahin.'}
        </p>
      )}
    </div>
  );
}
