import { Link } from 'react-router-dom';
import { MAX_ITEM_MINUTES, MIN_ITEM_MINUTES, DURATION_STEP } from '../../engine/itinerary';
import { WEIGHTS } from '../../engine/scoring';
import { formatDuration, formatIDR } from '../../lib/format';
import { ACTIVITY_OPTIONS, categoryLabel, labelOf } from '../../lib/options';
import type { ItineraryItem, Transportation, Venue } from '../../types';
import { TransitAccessList, TransitBadge } from '../TransitInfo';
import { CurrencyInput } from '../CurrencyInput';
import { Icon } from '../Icon';
import { MapsLinks } from '../MapsLinks';
import { SampleBadge } from '../SampleBadge';

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
  ['budget', 'Anggaran'],
  ['environment', 'Lingkungan'],
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
  const kindLabel = item.kind === 'custom' ? 'Aktivitas bebas' : venue ? categoryLabel(venue.category) : 'Venue';
  const activityLabel = item.activity ? labelOf(ACTIVITY_OPTIONS, item.activity) : null;
  const header = [kindLabel, activityLabel].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ');

  return (
    <li className="timeline-item">
      <div className="timeline-time">
        <span className="time">{item.startTime}</span>
        <span className="dur">s/d {item.endTime}</span>
      </div>
      <div className="timeline-marker" aria-hidden="true">
        <span>{index + 1}</span>
      </div>

      <article className={`venue-card${editing ? ' is-editing' : ''}`}>
        <div className="venue-card-top">
          <span className="venue-category">{header}</span>
          <span className="badge-row">
            {venue?.isSample && <SampleBadge label="Sampel" />}
            {venue?.status === 'inactive' && <span className="status-badge">Nonaktif</span>}
            {item.score && (
              <span className="score-badge" title={item.score.transport !== undefined ? `Skor peringkat (kecocokan ${item.score.total} + transportasi)` : 'Skor kecocokan 0–100'}>
                {item.score.rank}
              </span>
            )}
          </span>
        </div>

        {item.kind === 'venue' && item.venueId && venue ? (
          <Link to={`/venue/${encodeURIComponent(item.venueId)}`} className="venue-card-name venue-card-title-link">
            {venue.name}
          </Link>
        ) : (
          <h3 className="venue-card-name">{item.title}</h3>
        )}

        {transportation && venue && item.kind === 'venue' && (
          <div className="item-transit">
            <TransitBadge venue={venue} mode={transportation} />
          </div>
        )}

        <dl className="item-facts">
          <div>
            <dt>Waktu</dt>
            <dd>
              {item.startTime}–{item.endTime} · {formatDuration(item.durationMinutes)}
            </dd>
          </div>
          <div>
            <dt>Perkiraan biaya</dt>
            <dd>
              {!item.priceKnown
                ? 'Harga belum diketahui'
                : item.costMin !== item.costMax
                  ? `${formatIDR(item.costEstimate)} (${formatIDR(item.costMin)}–${formatIDR(item.costMax)})`
                  : formatIDR(item.costEstimate)}
              <span className="muted"> berdua</span>
            </dd>
          </div>
        </dl>

        {item.reasons.length > 0 && (
          <div className="reasons">
            <p className="reasons-title">Kenapa dipilih</p>
            <ul>
              {item.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}

        {item.notes.length > 0 && (
          <ul className="item-notes">
            {item.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}

        {transportation && venue && item.kind === 'venue' && !editing && (
          <details className="transit-details">
            <summary>Akses transit</summary>
            <TransitAccessList venue={venue} mode={transportation} />
          </details>
        )}

        {item.score && (
          <details className="score-details">
            <summary>Rincian skor {item.score.rank}/100</summary>
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
                  <span>Transportasi <span className="muted">(peringkat 25%)</span></span>
                  <span className="score-bar" aria-hidden="true"><span style={{ width: `${item.score.transport * 100}%` }} /></span>
                  <span className="score-num">{Math.round(item.score.transport * 100)}</span>
                </li>
              )}
            </ul>
            {item.score.transport !== undefined && (
              <p className="field-hint">
                Kecocokan {item.score.total}/100 (bobot vibe 35, aktivitas 25, anggaran 20, lingkungan 10, durasi 10) digabung
                dengan kecocokan transportasi: peringkat = 75% kecocokan + 25% transportasi.
              </p>
            )}
          </details>
        )}

        {!editing && item.alternatives.length > 0 && (
          <details className="alternatives">
            <summary>{item.alternatives.length} alternatif</summary>
            <ul>
              {item.alternatives.map((a) => (
                <li key={a.venueId}>
                  <Link to={`/venue/${encodeURIComponent(a.venueId)}`} className="text-link">{a.venueName}</Link>
                  <span className="muted small"> · skor {a.score} · {a.reason}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {!editing && venue && !venue.isSample && <MapsLinks venue={venue} compact />}

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
              <label className="field-label" htmlFor={`cost-${item.id}`}>Perkiraan biaya berdua</label>
              <CurrencyInput id={`cost-${item.id}`} value={item.priceKnown ? item.costEstimate : 0}
                onChange={(v) => handlers.onCost(item.id, v)} />
              {!item.priceKnown && <p className="field-hint">Harga belum diketahui. Isi bila kamu sudah mengeceknya.</p>}
            </div>

            {item.kind === 'venue' && (
              <div className="field">
                <label className="field-label" htmlFor={`rep-${item.id}`}>Ganti venue</label>
                <select id={`rep-${item.id}`} className="input select" value=""
                  disabled={replacements.length === 0}
                  onChange={(e) => e.target.value && handlers.onReplace(item.id, e.target.value)}>
                  <option value="">{replacements.length ? 'Pilih venue pengganti…' : 'Tidak ada venue lain yang tersedia'}</option>
                  {replacements.map((r) => <option key={r.venue.id} value={r.venue.id}>{r.label}</option>)}
                </select>
              </div>
            )}

            <button type="button" className="button button-danger-ghost button-sm" onClick={() => handlers.onRemove(item.id)}>
              <Icon name="trash" size={16} /> Hapus aktivitas
            </button>
          </div>
        )}
      </article>
    </li>
  );
}
