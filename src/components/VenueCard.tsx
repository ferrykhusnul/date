import { Link } from 'react-router-dom';
import { ACTIVITY_OPTIONS, ENVIRONMENT_OPTIONS, categoryLabel, labelOf } from '../lib/options';
import type { Activity, Venue } from '../types';
import { Icon } from './Icon';
import { MapsLinks } from './MapsLinks';
import { PriceEstimate } from './PriceEstimate';
import { SampleBadge } from './SampleBadge';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <article className={`venue-tile${venue.status === 'inactive' ? ' is-inactive' : ''}`}>
      <Link to={`/venue/${encodeURIComponent(venue.id)}`} className="venue-tile-link">
        <div className="venue-card-top">
          <span className="venue-category">
            {categoryLabel(venue.category)} · {labelOf(ENVIRONMENT_OPTIONS, venue.environment)}
          </span>
          <span className="badge-row">
            {venue.isSample && <SampleBadge label="Sampel" />}
            {venue.status === 'inactive' && <span className="status-badge">Nonaktif</span>}
            {!venue.isSample && venue.verifiedAt && <span className="verified-badge">Terverifikasi</span>}
          </span>
        </div>
        <h3 className="venue-card-name">{venue.name}</h3>
        <p className="venue-card-address">
          <Icon name="pin" size={14} />
          <span>
            {venue.address}
            {venue.district ? ` · ${venue.district}` : ''} · {venue.city}
          </span>
        </p>
        <p className="venue-tile-tags">
          {venue.activities.map((a) => labelOf(ACTIVITY_OPTIONS, a as Activity)).join(' · ')}
        </p>
        <div className="venue-card-foot">
          <PriceEstimate min={venue.priceMin} max={venue.priceMax} />
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
