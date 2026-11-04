import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SampleBadge, SampleNotice } from '../components/SampleBadge';
import { MapsLinks } from '../components/MapsLinks';
import { formatDateLong, formatDuration, formatIDR } from '../lib/format';
import {
  ACTIVITY_OPTIONS,
  categoryLabel,
  ENVIRONMENT_OPTIONS,
  TRANSPORT_OPTIONS,
  VIBE_OPTIONS,
  labelOf,
} from '../lib/options';
import { planEndTime, planTotal } from '../lib/planGenerator';
import { useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DatePlan } from '../types';

/** Shows the current draft (/hasil) or a saved plan (/rencana/:id). */
export function DateResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { draft, setDraft, setFormSeed, savePlan, getSavedPlan, deletePlan } = useAppState();
  const { getVenue } = useVenues();

  const plan: DatePlan | null | undefined = id ? getSavedPlan(id) : draft;
  const isDraft = !id;
  const alreadySaved = plan ? Boolean(getSavedPlan(plan.id)) : false;

  if (!plan) {
    return (
      <div className="page page-narrow">
        <PageHeader title={isDraft ? 'Belum ada draf' : 'Rencana tidak ditemukan'} back="/" />
        <EmptyState
          title={isDraft ? 'Belum ada rencana untuk ditampilkan' : 'Rencana ini tidak tersedia'}
          body={
            isDraft
              ? 'Buat rencana baru untuk melihat linimasa dan perkiraan biaya.'
              : 'Rencana mungkin sudah dihapus, atau halaman dimuat ulang (penyimpanan Fase 1 hanya di memori).'
          }
          actions={
            <Link to="/buat" className="button button-primary">
              Buat rencana
            </Link>
          }
        />
      </div>
    );
  }

  const total = planTotal(plan);
  const remaining = plan.input.budget - total;
  const usedPct = plan.input.budget > 0 ? Math.min(100, Math.round((total / plan.input.budget) * 100)) : 100;

  const onEdit = () => {
    setDraft(plan);
    setFormSeed(plan.input);
    navigate('/buat');
  };

  const onSave = () => {
    const saved = savePlan(plan);
    setDraft(null);
    navigate(`/rencana/${saved.id}`, { replace: true });
  };

  const onDelete = () => {
    if (window.confirm(`Hapus rencana "${plan.title}"?`)) {
      deletePlan(plan.id);
      navigate('/tersimpan', { replace: true });
    }
  };

  return (
    <div className="page page-result">
      <PageHeader
        back={isDraft ? undefined : '/tersimpan'}
        eyebrow={`${formatDateLong(plan.input.date)} · ${plan.input.startTime}–${planEndTime(plan)}`}
        title={plan.title}
        lead={plan.concept}
      />

      <div className="tag-row">
        <span className="tag">{plan.input.city}</span>
        <span className="tag">{labelOf(VIBE_OPTIONS, plan.input.vibe)}</span>
        <span className="tag">{formatDuration(plan.input.durationHours * 60)}</span>
        <span className="tag">{labelOf(TRANSPORT_OPTIONS, plan.input.transportation)}</span>
        <span className="tag">{labelOf(ENVIRONMENT_OPTIONS, plan.input.environment)}</span>
      </div>

      {plan.usesSampleVenues ? (
        <SampleNotice>
          Belum ada venue nyata di {plan.input.city}, jadi rencana ini memakai venue sampel — bukan
          rekomendasi tempat nyata. Semua harga adalah perkiraan.
        </SampleNotice>
      ) : (
        <p className="muted small">Semua harga adalah perkiraan berdasarkan dataset venue, bukan harga resmi.</p>
      )}

      <div className="result-grid">
        <section className="section result-timeline">
          <h2 className="section-title">Linimasa</h2>
          <ol className="timeline">
            {plan.stops.map((stop, i) => {
              const venue = getVenue(stop.venueId);
              return (
                <li key={stop.id} className="timeline-item">
                  <div className="timeline-time">
                    <span className="time">{stop.startTime}</span>
                    <span className="dur">{formatDuration(stop.durationMinutes)}</span>
                  </div>
                  <div className="timeline-marker" aria-hidden="true">
                    <span>{i + 1}</span>
                  </div>
                  <div className="venue-card">
                    <Link to={`/venue/${encodeURIComponent(stop.venueId)}`} className="venue-card-main">
                      <div className="venue-card-top">
                        <span className="venue-category">
                          {[venue ? categoryLabel(venue.category) : 'Venue', labelOf(ACTIVITY_OPTIONS, stop.activity)]
                            .filter((v, idx, arr) => arr.indexOf(v) === idx)
                            .join(' · ')}
                        </span>
                        {venue?.isSample && <SampleBadge label="Sampel" />}
                        {venue && venue.status === 'inactive' && <span className="status-badge">Nonaktif</span>}
                      </div>
                      <h3 className="venue-card-name">{venue?.name ?? stop.venueName}</h3>
                      <p className="venue-card-address">
                        <Icon name="pin" size={14} />
                        <span>{venue ? venue.address : 'Venue ini sudah tidak ada di dataset.'}</span>
                      </p>
                      <div className="venue-card-foot">
                        <span>Perkiraan {formatIDR(stop.estimatedCost)} berdua</span>
                        <span className="text-link">
                          Detail <Icon name="arrow-right" size={14} />
                        </span>
                      </div>
                    </Link>
                    {venue && !venue.isSample && <MapsLinks venue={venue} compact />}
                  </div>
                </li>
              );
            })}
          </ol>
          {plan.input.notes && (
            <div className="notes-card">
              <p className="eyebrow">Catatan</p>
              <p>{plan.input.notes}</p>
            </div>
          )}
        </section>

        <aside className="section result-aside">
          <div className="budget-card">
            <h2 className="section-title">Perkiraan biaya</h2>
            <p className="muted small">Untuk berdua · semua angka perkiraan</p>
            <ul className="cost-list">
              {plan.stops.map((s) => (
                <li key={s.id}>
                  <span>{getVenue(s.venueId)?.name ?? s.venueName}</span>
                  <span>{formatIDR(s.estimatedCost)}</span>
                </li>
              ))}
              <li>
                <span>Transportasi ({labelOf(TRANSPORT_OPTIONS, plan.input.transportation).toLowerCase()})</span>
                <span>{formatIDR(plan.transportCost)}</span>
              </li>
            </ul>
            <div className="cost-total">
              <span>Total perkiraan</span>
              <strong>{formatIDR(total)}</strong>
            </div>
            <div
              className={`budget-meter${remaining < 0 ? ' is-over' : ''}`}
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usedPct}
              aria-label="Penggunaan anggaran"
            >
              <span style={{ width: `${usedPct}%` }} />
            </div>
            <dl className="budget-figures">
              <div>
                <dt>Anggaran</dt>
                <dd>{formatIDR(plan.input.budget)}</dd>
              </div>
              <div>
                <dt>{remaining < 0 ? 'Melebihi anggaran' : 'Sisa anggaran'}</dt>
                <dd className={remaining < 0 ? 'text-warn' : 'text-ok'}>{formatIDR(Math.abs(remaining))}</dd>
              </div>
            </dl>
          </div>

          <div className="result-actions">
            <button type="button" className="button button-ghost button-block" onClick={onEdit}>
              <Icon name="edit" size={18} />
              Ubah itinerary
            </button>
            {isDraft ? (
              <button type="button" className="button button-primary button-block" onClick={onSave}>
                <Icon name="bookmark" size={18} />
                {alreadySaved ? 'Simpan perubahan' : 'Simpan rencana'}
              </button>
            ) : (
              <>
                <p className="saved-note">
                  <Icon name="check" size={16} /> Tersimpan
                </p>
                <button type="button" className="button button-danger-ghost button-block" onClick={onDelete}>
                  <Icon name="trash" size={18} />
                  Hapus rencana
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
