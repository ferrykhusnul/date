import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DURATION_STEP, MAX_ITEM_MINUTES, MIN_ITEM_MINUTES } from '../../engine/itinerary';
import { WEIGHTS } from '../../engine/scoring';
import { formatDuration, formatIDR } from '../../lib/format';
import { buildDirectionsUrl, buildSearchUrl } from '../../lib/maps';
import { categoryLabel } from '../../lib/options';
import { activityUi, shortIDR } from '../../lib/uiLabels';
import type { ItineraryItem, Transportation, Venue } from '../../types';
import { CurrencyInput } from '../CurrencyInput';
import { ExternalLink } from '../ExternalLink';
import { Icon } from '../Icon';
import { SampleBadge } from '../SampleBadge';
import { TransitAccessList, TransitBadge } from '../TransitInfo';
import { VenueArt } from '../VenueArt';

export interface ItemHandlers {
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onDuration: (id: string, minutes: number) => void;
  onCost: (id: string, amount: number) => void;
  onReplace: (id: string, venueId: string) => void;
}

const SCORE_LABELS: [keyof typeof WEIGHTS, string][] = [
  ['vibe', 'Vibe'],
  ['activity', 'Aktivitas'],
  ['budget', 'Budget'],
  ['environment', 'Tempat'],
  ['duration', 'Durasi'],
];

export function ItineraryItemCard({
  item,
  index,
  count,
  venue,
  editing,
  transportation,
  replacements,
  handlers,
}: {
  item: ItineraryItem;
  index: number;
  count: number;
  venue: Venue | undefined;
  editing: boolean;
  /** Set when the plan uses public or mixed transport: shows transit details. */
  transportation?: Transportation;
  /** Venues the item may be swapped to (alternatives first). */
  replacements: { venue: Venue; label: string }[];
  handlers: ItemHandlers;
}) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const activity = item.activity ? activityUi(item.activity).label : null;
  const kind = item.kind === 'custom' ? 'Aktivitas bebas' : venue ? categoryLabel(venue.category) : 'Tempat';
  const meta = [kind, activity].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ');
  const realVenue = venue && !venue.isSample ? venue : undefined;
  const cost = !item.priceKnown ? 'Harga belum tahu' : item.costEstimate === 0 ? 'Gratis' : `± ${shortIDR(item.costEstimate)}`;
  const alternatives = item.alternatives.filter((a) => replacements.some((r) => r.venue.id === a.venueId));

  return (
    <li className="timeline-item">
      <div className="timeline-time">
        <span className="time">{item.startTime}</span>
        <span className="dur">s/d {item.endTime}</span>
      </div>
      <div className="timeline-marker" aria-hidden="true">
        <span>{index + 1}</span>
      </div>

      <article className={`venue-card stop-card${editing ? ' is-editing' : ''}`}>
        <VenueArt category={item.kind === 'custom' ? 'custom' : venue?.category} size="md" className="stop-art" />
        <div className="stop-body">
          <div className="venue-card-top">
            <span className="venue-category">{meta}</span>
            <span className="badge-row">
              {venue?.isSample && <SampleBadge label="Contoh" />}
              {venue?.status === 'inactive' && <span className="status-badge">Nonaktif</span>}
            </span>
          </div>

          {item.kind === 'venue' && item.venueId && venue ? (
            <Link to={`/venue/${encodeURIComponent(item.venueId)}`} className="venue-card-name venue-card-title-link">
              {venue.name}
            </Link>
          ) : (
            <h3 className="venue-card-name">{item.title}</h3>
          )}

          {venue?.description && <p className="stop-desc">{venue.description}</p>}
          {item.kind === 'custom' && item.userNote && <p className="stop-desc">{item.userNote}</p>}

          <div className="pill-row">
            <span className="pill"><Icon name="clock" size={14} /> {formatDuration(item.durationMinutes)}</span>
            <span className="pill" title={item.priceKnown && item.costMin !== item.costMax ? `${formatIDR(item.costMin)}–${formatIDR(item.costMax)} berdua` : undefined}>
              <Icon name="wallet" size={14} /> {cost}
            </span>
            {item.score && <span className="pill pill-score" title="Skor kecocokan">♡ {item.score.rank}</span>}
          </div>

          {transportation && venue && item.kind === 'venue' && (
            <div className="item-transit">
              <TransitBadge venue={venue} mode={transportation} />
            </div>
          )}

          {!editing && (
            <div className="stop-actions">
              {realVenue && (
                <>
                  <ExternalLink href={buildSearchUrl(realVenue)} className="button button-soft button-sm" label={`Buka Maps: ${realVenue.name}`}>
                    <Icon name="map" size={16} /> Buka Maps
                  </ExternalLink>
                  <ExternalLink href={buildDirectionsUrl(realVenue)} className="button button-ghost button-sm" label={`Rute: ${realVenue.name}`}>
                    <Icon name="navigation" size={16} /> Rute
                  </ExternalLink>
                </>
              )}
              {item.kind === 'venue' && alternatives.length > 0 && (
                <button type="button" className="button button-ghost button-sm" aria-expanded={showAlternatives}
                  onClick={() => setShowAlternatives((s) => !s)}>
                  <Icon name="shuffle" size={16} /> Opsi lainnya
                </button>
              )}
            </div>
          )}

          {!editing && showAlternatives && (
            <ul className="alt-list">
              {alternatives.map((a) => {
                const v = replacements.find((r) => r.venue.id === a.venueId)!.venue;
                return (
                  <li key={a.venueId}>
                    <VenueArt category={v.category} size="sm" />
                    <span className="alt-text">
                      <Link to={`/venue/${encodeURIComponent(a.venueId)}`} className="alt-name">{a.venueName}</Link>
                      <span className="alt-reason">{a.reason}</span>
                    </span>
                    <button type="button" className="button button-soft button-sm" onClick={() => { handlers.onReplace(item.id, a.venueId); setShowAlternatives(false); }}>
                      Pakai
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!editing && (item.reasons.length > 0 || item.notes.length > 0 || item.score || transportation) && (
            <details className="why">
              <summary>Kenapa ini?</summary>
              {item.reasons.length > 0 && (
                <ul className="reasons-list">
                  {item.reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
              {item.notes.length > 0 && (
                <ul className="item-notes">
                  {item.notes.map((n) => <li key={n}>{n}</li>)}
                </ul>
              )}
              {transportation && venue && item.kind === 'venue' && <TransitAccessList venue={venue} mode={transportation} />}
              {item.score && (
                <div className="score-details">
                  <p className="score-title">Skor {item.score.rank}/100</p>
                  <ul>
                    {SCORE_LABELS.map(([k, label]) => (
                      <li key={k}>
                        <span>{label} <span className="muted">({WEIGHTS[k]}%)</span></span>
                        <span className="score-bar" aria-hidden="true"><span style={{ width: `${item.score![k] * 100}%` }} /></span>
                        <span className="score-num">{Math.round(item.score![k] * WEIGHTS[k])}</span>
                      </li>
                    ))}
                    {item.score.transport !== undefined && (
                      <li className="score-transport">
                        <span>Transportasi <span className="muted">(25%)</span></span>
                        <span className="score-bar" aria-hidden="true"><span style={{ width: `${item.score.transport * 100}%` }} /></span>
                        <span className="score-num">{Math.round(item.score.transport * 100)}</span>
                      </li>
                    )}
                  </ul>
                  {item.score.transport !== undefined && (
                    <p className="field-hint">Peringkat = 75% kecocokan ({item.score.total}) + 25% transportasi.</p>
                  )}
                </div>
              )}
            </details>
          )}

          {editing && (
            <div className="item-editor">
              <div className="editor-row">
                <span className="field-label">Urutan</span>
                <div className="editor-buttons">
                  <button type="button" className="icon-button bordered" disabled={index === 0}
                    aria-label={`Pindahkan ${item.title} ke atas`} onClick={() => handlers.onMove(index, index - 1)}>
                    <Icon name="arrow-up" size={18} />
                  </button>
                  <button type="button" className="icon-button bordered" disabled={index === count - 1}
                    aria-label={`Pindahkan ${item.title} ke bawah`} onClick={() => handlers.onMove(index, index + 1)}>
                    <Icon name="arrow-down" size={18} />
                  </button>
                </div>
              </div>

              <div className="editor-row">
                <span className="field-label" id={`dur-${item.id}`}>Durasi</span>
                <div className="stepper" role="group" aria-labelledby={`dur-${item.id}`}>
                  <button type="button" className="icon-button bordered" disabled={item.durationMinutes <= MIN_ITEM_MINUTES}
                    aria-label="Kurangi 15 menit" onClick={() => handlers.onDuration(item.id, item.durationMinutes - DURATION_STEP)}>
                    −
                  </button>
                  <output aria-live="polite">{formatDuration(item.durationMinutes)}</output>
                  <button type="button" className="icon-button bordered" disabled={item.durationMinutes >= MAX_ITEM_MINUTES}
                    aria-label="Tambah 15 menit" onClick={() => handlers.onDuration(item.id, item.durationMinutes + DURATION_STEP)}>
                    +
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor={`cost-${item.id}`}>Kira-kira biaya berdua</label>
                <CurrencyInput id={`cost-${item.id}`} value={item.priceKnown ? item.costEstimate : 0} onChange={(v) => handlers.onCost(item.id, v)} />
                {!item.priceKnown && <p className="field-hint">Harganya belum tahu. Isi kalau udah cek.</p>}
              </div>

              {item.kind === 'venue' && (
                <div className="field">
                  <label className="field-label" htmlFor={`rep-${item.id}`}>Ganti tempat</label>
                  <select id={`rep-${item.id}`} className="input select" value="" disabled={replacements.length === 0}
                    onChange={(e) => e.target.value && handlers.onReplace(item.id, e.target.value)}>
                    <option value="">{replacements.length ? 'Pilih tempat lain…' : 'Nggak ada tempat lain'}</option>
                    {replacements.map((r) => <option key={r.venue.id} value={r.venue.id}>{r.label}</option>)}
                  </select>
                </div>
              )}

              <button type="button" className="button button-danger-ghost button-sm" onClick={() => handlers.onRemove(item.id)}>
                <Icon name="trash" size={16} /> Hapus
              </button>
            </div>
          )}
        </div>
      </article>
    </li>
  );
}
