import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SampleNotice } from '../components/SampleBadge';
import { AddCustomActivity } from '../components/itinerary/AddCustomActivity';
import { BudgetCard } from '../components/itinerary/BudgetCard';
import { IssueList } from '../components/itinerary/IssueList';
import { ItineraryItemCard, type ItemHandlers } from '../components/itinerary/ItineraryItemCard';
import { SAMPLE_VENUES } from '../data/sampleVenues';
import { computeBudget } from '../engine/budget';
import {
  addCustomItem,
  moveItem,
  planEndTime,
  removeItem,
  replaceVenue,
  setCost,
  setDuration,
  setLegMode,
  type CustomActivityInput,
} from '../engine/itinerary';
import { defaultLegMode, isPublicTransport } from '../engine/transport';
import { TransitionRow, placeOfVenue, type Place } from '../components/itinerary/TransitionRow';
import { validatePlan } from '../engine/validation';
import { formatDateLong, formatDuration } from '../lib/format';
import { ENVIRONMENT_OPTIONS, TRANSPORT_OPTIONS, VIBE_OPTIONS, labelOf } from '../lib/options';
import { plannableVenues } from '../lib/venueFilters';
import { planDisplayName, useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DatePlan, ItineraryItem, LegMode, Venue } from '../types';

/** Shows and edits the current draft (/hasil) or a saved plan (/rencana/:id). */
export function DateResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { draft, setDraft, setFormSeed, savePlan, updateSavedPlan, getSavedPlan, deletePlan, renamePlan, duplicatePlan } =
    useAppState();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const { getVenue, realVenues } = useVenues();
  const [editing, setEditing] = useState(false);

  const plan: DatePlan | null | undefined = id ? getSavedPlan(id) : draft;
  const isDraft = !id;
  const alreadySaved = plan ? Boolean(getSavedPlan(plan.id)) : false;

  const budget = useMemo(() => (plan ? computeBudget(plan) : null), [plan]);
  const liveIssues = useMemo(() => (plan ? validatePlan(plan, getVenue) : []), [plan, getVenue]);

  /** Venues this plan may draw replacements from. */
  const pool: Venue[] = useMemo(() => {
    if (!plan) return [];
    return plan.usesSampleVenues ? SAMPLE_VENUES : plannableVenues(realVenues, plan.input.city);
  }, [plan, realVenues]);

  if (!plan || !budget) {
    return (
      <div className="page page-narrow">
        <PageHeader title={isDraft ? 'Belum ada draf' : 'Rencana tidak ditemukan'} back="/" />
        <EmptyState
          title={isDraft ? 'Belum ada rencana untuk ditampilkan' : 'Rencana ini tidak tersedia'}
          body={
            isDraft
              ? 'Buat rencana baru untuk melihat linimasa dan perkiraan biaya.'
              : 'Rencana mungkin sudah dihapus, atau halaman dimuat ulang (rencana hanya disimpan di memori).'
          }
          actions={<Link to="/buat" className="button button-primary">Buat rencana</Link>}
        />
      </div>
    );
  }

  const commit = (next: DatePlan) => {
    const stamped = { ...next, editedAt: new Date().toISOString() };
    if (isDraft) setDraft(stamped);
    else updateSavedPlan(stamped);
  };

  const handlers: ItemHandlers = {
    onMove: (from, to) => commit(moveItem(plan, from, to, getVenue)),
    onRemove: (itemId) => commit(removeItem(plan, itemId, getVenue)),
    onDuration: (itemId, minutes) => commit(setDuration(plan, itemId, minutes, getVenue)),
    onCost: (itemId, amount) => commit(setCost(plan, itemId, amount, getVenue)),
    onReplace: (itemId, venueId) => {
      const venue = getVenue(venueId);
      if (venue) commit(replaceVenue(plan, itemId, venue, getVenue));
    },
  };
  const onAddCustom = (input: CustomActivityInput) => commit(addCustomItem(plan, input, getVenue));
  const onLegMode = (key: string, mode: LegMode) => commit(setLegMode(plan, key, mode, getVenue));

  const transitFocus = isPublicTransport(plan.input.transportation) || plan.input.transportation === 'campuran';
  const placeOf = (item: ItineraryItem): Place =>
    item.kind === 'venue' && item.venueId ? placeOfVenue(getVenue(item.venueId)) : null;
  const noPlaceReason = (item: ItineraryItem): string | undefined => {
    if (item.kind === 'custom') return `Lokasi "${item.title}" tidak diketahui, jadi rute tidak bisa dibuat otomatis.`;
    const v = item.venueId ? getVenue(item.venueId) : undefined;
    if (!v) return `"${item.title}" sudah tidak ada di dataset.`;
    if (v.isSample) return 'Venue sampel tidak punya lokasi nyata, jadi rute dinonaktifkan.';
    return undefined;
  };
  // Start/end links use the plan's mode (public transport for mixed plans), not a neighbouring leg's.
  const edgeMode: LegMode = defaultLegMode(plan.input.transportation);
  const startPlace: Place = plan.input.startLocation ? { label: plan.input.startLocation, query: plan.input.startLocation } : null;
  const endPlace: Place = plan.input.endLocation ? { label: plan.input.endLocation, query: plan.input.endLocation } : null;
  const firstItem = plan.items[0];
  const lastItem = plan.items[plan.items.length - 1];

  const inPlan = new Set(plan.items.map((i) => i.venueId).filter(Boolean));
  const replacementsFor = (itemId: string) => {
    const item = plan.items.find((i) => i.id === itemId)!;
    const altIds = item.alternatives.map((a) => a.venueId);
    const alts = item.alternatives
      .map((a) => getVenue(a.venueId))
      .filter((v): v is Venue => Boolean(v && v.status === 'active' && !inPlan.has(v.id)))
      .map((v) => ({ venue: v, label: `★ ${v.name} (alternatif)` }));
    const others = pool
      .filter((v) => v.status === 'active' && !inPlan.has(v.id) && !altIds.includes(v.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'))
      .map((v) => ({ venue: v, label: v.name }));
    return [...alts, ...others];
  };

  const onEditPreferences = () => {
    if (plan.editedAt && !window.confirm('Menyusun ulang dari preferensi akan menghapus perubahan manual. Lanjutkan?')) return;
    setDraft(plan);
    setFormSeed(plan.input);
    navigate('/buat');
  };

  const onSave = () => {
    const saved = savePlan(plan);
    setDraft(null);
    setEditing(false);
    navigate(`/rencana/${saved.id}`, { replace: true });
  };

  const startRename = () => {
    setNameDraft(plan.name ?? '');
    setRenaming(true);
  };
  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    renamePlan(plan.id, nameDraft);
    setRenaming(false);
  };
  const onDuplicate = () => {
    const copy = duplicatePlan(plan.id);
    if (copy) navigate(`/rencana/${encodeURIComponent(copy.id)}`);
  };

  const onDelete = () => {
    if (window.confirm(`Hapus rencana "${planDisplayName(plan)}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deletePlan(plan.id);
      navigate('/tersimpan', { replace: true });
    }
  };

  const fromGeneration = plan.generationIssues.filter((i) => i.code !== 'SAMPLE_VENUES');
  const generationWarnings = fromGeneration.filter((i) => i.severity !== 'info');
  const generationNotes = fromGeneration.filter((i) => i.severity === 'info');

  return (
    <div className="page page-result">
      <PageHeader
        back={isDraft ? undefined : '/tersimpan'}
        eyebrow={`${formatDateLong(plan.input.date)} · ${plan.input.startTime}–${planEndTime(plan)}`}
        title={planDisplayName(plan)}
        lead={plan.concept}
      />

      {renaming ? (
        <form className="rename-form" onSubmit={submitRename}>
          <label className="field-label" htmlFor="plan-name">Nama rencana</label>
          <div className="input-with-action">
            <input id="plan-name" className="input" maxLength={80} autoFocus placeholder={plan.title}
              value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
            <button type="submit" className="button button-primary button-sm">Simpan</button>
            <button type="button" className="button button-ghost button-sm" onClick={() => setRenaming(false)}>Batal</button>
          </div>
          <p className="field-hint">Kosongkan untuk memakai judul otomatis ("{plan.title}").</p>
        </form>
      ) : (
        <button type="button" className="text-link rename-link" onClick={startRename}>
          <Icon name="edit" size={14} /> {plan.name ? 'Ganti nama' : 'Beri nama rencana'}
        </button>
      )}

      <div className="tag-row">
        <span className="tag">{plan.input.city}</span>
        <span className="tag">{labelOf(VIBE_OPTIONS, plan.input.vibe)}</span>
        <span className="tag">{formatDuration(plan.input.durationHours * 60)}</span>
        <span className="tag">{labelOf(TRANSPORT_OPTIONS, plan.input.transportation)}</span>
        <span className="tag">{labelOf(ENVIRONMENT_OPTIONS, plan.input.environment)}</span>
      </div>

      {plan.usesSampleVenues && (
        <SampleNotice>
          Belum ada venue nyata di {plan.input.city}, jadi rencana ini memakai venue sampel — bukan rekomendasi tempat
          nyata. Semua harga adalah perkiraan.
        </SampleNotice>
      )}

      <div className="result-grid">
        <section className="section result-timeline">
          <div className="section-head">
            <h2 className="section-title">Itinerary</h2>
            <label className="switch switch-inline">
              <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
              <span>Mode ubah</span>
            </label>
          </div>
          <p className="field-hint">
            Urutan mengikuti alur aktivitas; rute belum dioptimalkan. Di antara tempat disisakan buffer perjalanan
            (bukan estimasi rute) — durasi, rute, dan tarif sebenarnya dicek lewat tombol rute di Google Maps.
            {editing && ' Perubahan langsung menghitung ulang waktu dan biaya.'}
          </p>

          <IssueList issues={liveIssues} />
          <IssueList issues={generationWarnings} title="Saat menyusun rencana" />

          {plan.items.length > 0 ? (
            <ol className="timeline">
              {startPlace && firstItem && (
                <TransitionRow
                  from={startPlace}
                  to={placeOf(firstItem)}
                  mode={edgeMode}
                  reason={noPlaceReason(firstItem)}
                />
              )}
              {plan.items.map((item, i) => {
                const leg = plan.transport.legs[i];
                const next = plan.items[i + 1];
                return [
                  <ItineraryItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    count={plan.items.length}
                    venue={item.venueId ? getVenue(item.venueId) : undefined}
                    editing={editing}
                    transportation={transitFocus ? plan.input.transportation : undefined}
                    replacements={editing ? replacementsFor(item.id) : []}
                    handlers={handlers}
                  />,
                  leg && next ? (
                    <TransitionRow
                      key={leg.key}
                      from={placeOf(item)}
                      to={placeOf(next)}
                      mode={leg.mode}
                      leg={leg}
                      reason={noPlaceReason(placeOf(item) ? next : item)}
                      editable={editing && plan.input.transportation === 'campuran'}
                      onModeChange={(m) => onLegMode(leg.key, m)}
                    />
                  ) : null,
                ];
              })}
              {endPlace && lastItem && (
                <TransitionRow
                  from={placeOf(lastItem)}
                  to={endPlace}
                  mode={edgeMode}
                  reason={noPlaceReason(lastItem)}
                />
              )}
            </ol>
          ) : null}

          {editing && <AddCustomActivity onAdd={onAddCustom} />}

          {plan.input.notes && (
            <div className="notes-card">
              <p className="eyebrow">Catatanmu</p>
              <p>{plan.input.notes}</p>
            </div>
          )}

          {generationNotes.length > 0 && (
            <details className="generation-notes">
              <summary>Catatan saat menyusun ({generationNotes.length})</summary>
              <IssueList issues={generationNotes} />
            </details>
          )}
        </section>

        <aside className="section result-aside">
          <BudgetCard plan={plan} budget={budget} />

          <div className="result-actions">
            <button type="button" className="button button-ghost button-block" onClick={() => setEditing((e) => !e)}>
              <Icon name="edit" size={18} />
              {editing ? 'Selesai mengubah' : 'Ubah itinerary'}
            </button>
            <button type="button" className="button button-ghost button-block" onClick={onEditPreferences}>
              Susun ulang dari preferensi
            </button>
            {isDraft ? (
              <button type="button" className="button button-primary button-block" onClick={onSave}
                disabled={plan.items.length === 0}>
                <Icon name="bookmark" size={18} />
                {alreadySaved ? 'Simpan perubahan' : 'Simpan rencana'}
              </button>
            ) : (
              <>
                <p className="saved-note">
                  <Icon name="check" size={16} /> Tersimpan di perangkat ini · perubahan disimpan otomatis
                </p>
                <button type="button" className="button button-ghost button-block" onClick={onDuplicate}>
                  <Icon name="copy" size={18} />
                  Duplikat rencana
                </button>
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
