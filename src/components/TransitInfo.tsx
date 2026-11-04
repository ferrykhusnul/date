import { transitAccessScore, transitTypeLabel, wantedTransitType } from '../engine/transport';
import { formatDateShort } from '../lib/format';
import { buildRouteUrl, mapsQuery, stationQuery } from '../lib/maps';
import { TRANSIT_SHORT } from '../lib/options';
import type { TransitAccess, Transportation, Venue } from '../types';
import { ExternalLink } from './ExternalLink';
import { Icon } from './Icon';

/** Compact badge: best known station for the chosen mode, or "unknown". */
export function TransitBadge({ venue, mode }: { venue: Venue; mode?: Transportation }) {
  const list = venue.transitAccess ?? [];
  if (!list.length) return <span className="transit-badge is-unknown">Transit belum diketahui</span>;
  const best = mode ? (transitAccessScore(venue, mode).access ?? list[0]) : list[0];
  return (
    <span className={`transit-badge${best.verifiedAt ? ' is-verified' : ''}`} title={`${transitTypeLabel(best.transitType)} — ${best.stationName}`}>
      <span className="transit-type">{TRANSIT_SHORT[best.transitType]}</span>
      {best.stationName}
      {best.verifiedAt ? <Icon name="check" size={12} /> : null}
      {list.length > 1 && <span className="muted"> +{list.length - 1}</span>}
    </span>
  );
}

/** Walking info appears only when a person verified the record. */
export function walkingText(a: TransitAccess): string {
  if (!a.verifiedAt) return 'Jarak & waktu jalan kaki belum diverifikasi';
  const parts: string[] = [];
  if (typeof a.distanceMeters === 'number') parts.push(`${a.distanceMeters.toLocaleString('id-ID')} m`);
  if (typeof a.walkingMinutes === 'number') parts.push(`±${a.walkingMinutes} menit jalan kaki`);
  return parts.length ? `${parts.join(' · ')} (terverifikasi ${formatDateShort(a.verifiedAt)})` : `Stasiun terverifikasi ${formatDateShort(a.verifiedAt)}; jarak belum dicatat`;
}

/** Full list of known stations with walking routes to the venue. */
export function TransitAccessList({
  venue,
  mode,
  showRoutes = true,
}: {
  venue: Venue;
  mode?: Transportation;
  showRoutes?: boolean;
}) {
  const list = venue.transitAccess ?? [];
  if (!list.length) {
    return (
      <p className="transit-unknown">
        Info akses transit belum diketahui untuk venue ini. Cek rute langsung di Google Maps.
      </p>
    );
  }
  const wanted = mode ? wantedTransitType(mode) : null;
  return (
    <ul className="transit-list">
      {list.map((a) => (
        <li key={`${a.transitType}-${a.stationName}`} className={wanted && a.transitType === wanted ? 'is-preferred' : undefined}>
          <div className="transit-row-head">
            <span className="transit-type">{TRANSIT_SHORT[a.transitType]}</span>
            <strong>{a.stationName}</strong>
            <span className="muted small">{transitTypeLabel(a.transitType)}</span>
          </div>
          <p className={a.verifiedAt ? 'small' : 'small muted'}>{walkingText(a)}</p>
          {showRoutes && !venue.isSample && (
            <ExternalLink
              className="text-link small"
              href={buildRouteUrl(stationQuery(a, venue.city), mapsQuery(venue), 'walking')}
              label={`Rute jalan kaki dari ${a.stationName} ke ${venue.name}`}
            >
              Rute jalan kaki dari stasiun <Icon name="external" size={12} />
            </ExternalLink>
          )}
        </li>
      ))}
    </ul>
  );
}
