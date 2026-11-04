import { Link } from 'react-router-dom';
import { categoryLabel } from '../lib/options';
import { activityLabel, environmentLabel } from '../lib/uiLabels';
import type { Venue } from '../types';
import { Icon } from './Icon';
import { MapsLinks } from './MapsLinks';
import { PriceEstimate } from './PriceEstimate';
import { SampleBadge } from './SampleBadge';
import { TransitBadge } from './TransitInfo';
import { VenueArt } from './VenueArt';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <article className={`venue-tile${venue.status === 'inactive' ? ' is-inactive' : ''}`}>
      <Link to={`/venue/${encodeURIComponent(venue.id)}`} className="venue-tile-link">
        <VenueArt category={venue.category} size="md" className="tile-art" />
        <div className="venue-card-top">
          <span className="venue-category">
            {categoryLabel(venue.category)} · {environmentLabel(venue.environment)}
          </span>
          <span className="badge-row">
            {venue.isSample && <SampleBadge label="Contoh" />}
            {venue.status === 'inactive' && <span className="status-badge">Nonaktif</span>}
            {!venue.isSample && venue.verifiedAt && <span className="verified-badge">Terverifikasi</span>}
          </span>
        </div>
        <h2 className="venue-card-name">{venue.name}</h2>
        <p className="venue-card-address">
          <Icon name="pin" size={14} />
          <span>
            {venue.address}
            {venue.district ? ` · ${venue.district}` : ''} · {venue.city}
          </span>
        </p>
        <div className="venue-tile-transit">
          <TransitBadge venue={venue} />
        </div>
        <p className="venue-tile-tags">
          {venue.activities.map(activityLabel).join(' · ')}
        </p>
        <div className="venue-card-foot">
          <PriceEstimate min={venue.priceMin} max={venue.priceMax} unknown={venue.priceUnknown} />
          <span className="text-link">
            Detail <Icon name="arrow-right" size={14} />
          </span>
        </div>
      </Link>
      {!venue.isSample && (
        <div className="venue-tile-maps">
          <MapsLinks venue={venue} compact />
        </div>
      )}
    </article>
  );
}
