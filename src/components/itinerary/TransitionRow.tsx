import { MODE_PROFILE, formatKm } from '../../engine/transport';
import { buildRouteUrl, mapsQuery } from '../../lib/maps';
import { LEG_MODE_OPTIONS, TRANSPORT_OPTIONS, labelOf } from '../../lib/options';
import type { LegMode, PlanLeg, Venue } from '../../types';
import { ExternalLink } from '../ExternalLink';
import { Icon } from '../Icon';

/** A free-text place or a venue, as a Google Maps search string. */
export type Place = { label: string; query: string } | null;

export function placeOfVenue(v: Venue | undefined): Place {
  if (!v || v.isSample) return null;
  return { label: v.name, query: mapsQuery(v) };
}

const ROUTE_LABEL = {
  transit: 'Cari rute transit',
  walking: 'Rute jalan kaki',
  driving: 'Rute mobil',
  'two-wheeler': 'Rute motor',
} as const;

/**
 * The move between two stops (or from the start point / to the destination).
 * Shows the planning buffer and a Google Maps route link — never a computed
 * route, travel time, line number or fare.
 */
export function TransitionRow({
  from,
  to,
  mode,
  leg,
  reason,
  editable,
  onModeChange,
}: {
  from: Place;
  to: Place;
  mode: LegMode;
  leg?: PlanLeg;
  /** Why no link can be made (e.g. sample venue or free-form activity). */
  reason?: string;
  editable?: boolean;
  onModeChange?: (mode: LegMode) => void;
}) {
  const profile = MODE_PROFILE[mode];
  const url = from && to ? buildRouteUrl(from.query, to.query, profile.travelmode) : null;
  const missing = !from || !to;

  return (
    <li className="transition-row">
      <div className="transition-line" aria-hidden="true" />
      <div className="transition-body">
        <div className="transition-head">
          <span className="transition-mode">{labelOf(TRANSPORT_OPTIONS, mode)}</span>
          {leg && (
            <span className="muted small">
              buffer {leg.bufferMinutes} menit (bukan estimasi rute)
              {leg.straightLineMeters !== undefined && ` · ${formatKm(leg.straightLineMeters)} garis lurus`}
            </span>
          )}
        </div>
        {editable && onModeChange && (
          <label className="leg-mode">
            <span className="sr-only">Moda perpindahan</span>
            <select className="input select input-sm" value={mode} onChange={(e) => onModeChange(e.target.value as LegMode)}>
              {LEG_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}
        {url ? (
          <ExternalLink className="button button-ghost button-sm route-button" href={url}
            label={`${ROUTE_LABEL[profile.travelmode]} dari ${from!.label} ke ${to!.label}`}>
            <Icon name="navigation" size={16} /> {ROUTE_LABEL[profile.travelmode]}
          </ExternalLink>
        ) : (
          <button type="button" className="button button-ghost button-sm route-button" disabled>
            <Icon name="navigation" size={16} /> {ROUTE_LABEL[profile.travelmode]}
          </button>
        )}
        {missing && reason && <p className="field-hint">{reason}</p>}
      </div>
    </li>
  );
}
