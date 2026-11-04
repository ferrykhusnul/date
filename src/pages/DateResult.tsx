import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { SampleNotice } from '../components/SampleBadge';
import { AddCustomActivity } from '../components/itinerary/AddCustomActivity';
import { BudgetCard } from '../components/itinerary/BudgetCard';
import { IssueList } from '../components/itinerary/IssueList';
import { ItineraryItemCard, type ItemHandlers } from '../components/itinerary/ItineraryItemCard';
import { TransitionRow, placeOfVenue, type Place } from '../components/itinerary/TransitionRow';
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
import { usedMinutes, validatePlan } from '../engine/validation';
import { formatDateLong, formatDuration, formatIDR } from '../lib/format';
import { planFromInput } from '../lib/planning';
import { moodOf, transportIcon, transportLabel } from '../lib/uiLabels';
import { plannableVenues } from '../lib/venueFilters';
import { newPlanId, planDisplayName, useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DatePlan, ItineraryItem, LegMode, Venue } from '../types';

/** Shows and edits the current draft (/hasil) or a saved plan (/rencana/:id). */
export function DateResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { draft, setDraft, setFormSeed, savePlan, updateSavedPlan, getSavedPlan, deletePlan, renamePlan, duplicatePlan, settings } =
    useAppState();
  const { getVenue, realVenues } = useVenues();
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [tried, setTried] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const plan: DatePlan | null | undefined = id ? getSavedPlan(id) : draft;
  const isDraft = !id;
  const alreadySaved = plan ? Boolean(getSavedPlan(plan.id)) : false;

  const budget = useMemo(() => (plan ? computeBudget(plan) : null), [plan]);
  // The budget card already explains that transit fares aren't counted.
  const liveIssues = useMemo(
    () => (plan ? validatePlan(plan, getVenue).filter((i) => i.code !== 'TRANSIT_FARE_NOT_ESTIMATED') : []),
    [plan, getVenue],
  );

  /** Venues this plan may draw replacements from. */
  const pool: Venue[] = useMemo(() => {
    if (!plan) return [];
    return plan.usesSampleVenues ? SAMPLE_VENUES : plannableVenues(realVenues, plan.input.city);
  }, [plan, realVenues]);

  if (!plan || !budget) {
    return (
      <div className="page page-narrow">
        <PageHeader title={isDraft ? 'Belum ada ide date' : 'Date nggak ketemu'} back="/" />
        <EmptyState
          title={isDraft ? 'Yuk bikin dulu ♡' : 'Date ini udah nggak ada'}
          body={isDraft ? 'Jawab beberapa pertanyaan singkat, nanti kita cariin idenya.' : 'Mungkin udah dihapus.'}
          actions={<Link to="/buat" className="button button-primary">Bikin date</Link>}
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
    if (item.kind === 'custom') return `Lokasi "${item.title}" belum diketahui, jadi rutenya nggak bisa dibuat.`;
    const v = item.venueId ? getVenue(item.venueId) : undefined;
    if (!v) return `"${item.title}" udah nggak ada di daftar tempat.`;
    if (v.isSample) return 'Tempat contoh nggak punya lokasi asli.';
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
      .map((v) => ({ venue: v, label: `♡ ${v.name} (opsi)` }));
    const others = pool
      .filter((v) => v.status === 'active' && !inPlan.has(v.id) && !altIds.includes(v.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'))
      .map((v) => ({ venue: v, label: v.name }));
    return [...alts, ...others];
  };

  /** Another idea from the same answers: the generator runs again without the venues already shown. */
  const tryAnotherIdea = () => {
    if (plan.editedAt && !window.confirm('Perubahan manual di date ini bakal diganti. Lanjut?')) return;
    const current = new Set([...inPlan].filter(Boolean) as string[]);
    const attempt = (exclude: Set<string>) =>
      planFromInput(plan.input, { realVenues, settings, planId: isDraft ? plan.id : newPlanId(), exclude }).plan;
    const everything = new Set([...tried, ...current]);
    let next = attempt(everything);
    let nextTried = everything;
    if (!next || next.items.length === 0) {
      next = attempt(current);
      nextTried = current;
    }
    if (!next || next.items.length === 0) {
      setToast('Belum ada ide lain buat pilihan ini. Coba ubah jawabannya ya.');
      return;
    }
    setTried(nextTried);
    setDraft(next);
    setEditing(false);
    setToast('Ini ide lainnya ♡');
    if (!isDraft) navigate('/hasil');
    window.scrollTo(0, 0);
  };

  const onEditPreferences = () => {
    if (plan.editedAt && !window.confirm('Perubahan manual bakal hilang kalau jawabannya diubah. Lanjut?')) return;
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
  const submitRename = (e: FormEvent) => {
    e.preventDefault();
    renamePlan(plan.id, nameDraft);
    setRenaming(false);
  };
  const onDuplicate = () => {
    const copy = duplicatePlan(plan.id);
    if (copy) navigate(`/rencana/${encodeURIComponent(copy.id)}`);
  };
  const onDelete = () => {
    if (window.confirm(`Hapus "${planDisplayName(plan)}"? Nggak bisa dibalikin lho.`)) {
      deletePlan(plan.id);
      navigate('/tersimpan', { replace: true });
    }
  };

  const fromGeneration = plan.generationIssues.filter((i) => i.code !== 'SAMPLE_VENUES');
  const generationWarnings = fromGeneration.filter((i) => i.severity !== 'info');
  const generationNotes = fromGeneration.filter((i) => i.severity === 'info');
  const mood = moodOf(plan.input.vibe);

  return (
    <div className="page page-result">
      {!isDraft && (
        <button type="button" className="back-link" onClick={() => navigate('/tersimpan')}>
          <Icon name="arrow-left" size={18} /> Kembali
        </button>
      )}

      <section className="date-hero" aria-labelledby="date-title">
        <span className="date-hero-deco" aria-hidden="true">♡ ✦</span>
        <p className="eyebrow">{formatDateLong(plan.input.date)} · {plan.input.startTime}–{planEndTime(plan)}</p>
        <h1 className="page-title" id="date-title">{planDisplayName(plan)}</h1>
        <div className="pill-row">
          <span className="pill pill-mood"><Icon name={mood.icon} size={14} /> {mood.label}</span>
          <span className="pill"><Icon name="clock" size={14} /> {formatDuration(usedMinutes(plan))}</span>
          <span className="pill"><Icon name={transportIcon(plan.input.transportation)} size={14} /> {transportLabel(plan.input.transportation)}</span>
          <span className="pill"><Icon name="pin" size={14} /> {plan.input.city}</span>
        </div>
        <div className="date-hero-total">
          <span>Total kira-kira</span>
          <strong>{formatIDR(budget.totalEstimate)}{!budget.complete && '*'}</strong>
          <span className={`budget-status is-${budget.status}`}>
            {budget.remaining < 0 ? `lebih ${formatIDR(-budget.remaining)}` : `sisa ${formatIDR(budget.remaining)}`}
          </span>
        </div>
        {renaming ? (
          <form className="rename-form" onSubmit={submitRename}>
            <label className="field-label" htmlFor="plan-name">Nama date</label>
            <div className="input-with-action">
              <input id="plan-name" className="input" maxLength={80} autoFocus placeholder={plan.title}
                value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
              <button type="submit" className="button button-primary button-sm">Simpan</button>
              <button type="button" className="button button-ghost button-sm" onClick={() => setRenaming(false)}>Batal</button>
            </div>
          </form>
        ) : (
          <button type="button" className="text-link rename-link" onClick={startRename}>
            <Icon name="edit" size={14} /> {plan.name ? 'Ganti nama' : 'Kasih nama'}
          </button>
        )}
      </section>

      {plan.usesSampleVenues && (
        <SampleNotice>Belum ada tempat asli di {plan.input.city}, jadi ini pakai tempat contoh dulu.</SampleNotice>
      )}

      <p className="status toast" role="status" aria-live="polite">{toast}</p>

      <div className="result-grid">
        <section className="section result-timeline" aria-labelledby="itinerary-title">
          <div className="section-head">
            <h2 className="section-title" id="itinerary-title">Rencananya</h2>
            <label className="switch switch-inline">
              <input type="checkbox" checked={editing} onChange={(e) => setEditing(e.target.checked)} />
              <span>Atur lagi</span>
            </label>
          </div>

          <IssueList issues={liveIssues} />
          <IssueList issues={generationWarnings} />

          {plan.items.length > 0 && (
            <ol className="timeline">
              {startPlace && firstItem && (
                <TransitionRow from={startPlace} to={placeOf(firstItem)} mode={edgeMode} reason={noPlaceReason(firstItem)} />
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
                    replacements={replacementsFor(item.id)}
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
                <TransitionRow from={placeOf(lastItem)} to={endPlace} mode={edgeMode} reason={noPlaceReason(lastItem)} />
              )}
            </ol>
          )}

          {editing && <AddCustomActivity onAdd={onAddCustom} />}

          {plan.input.notes && (
            <div className="notes-card">
              <p className="eyebrow">Catatan</p>
              <p>{plan.input.notes}</p>
            </div>
          )}

          <details className="why concept">
            <summary>Tentang date ini</summary>
            <p>{plan.concept}</p>
            <p className="field-hint">
              Urutan mengikuti alur aktivitas, belum berdasarkan jarak. Waktu antar tempat cuma perkiraan buffer — rute, durasi, dan
              tarif aslinya cek lewat tombol Maps.
            </p>
            {generationNotes.length > 0 && <IssueList issues={generationNotes} />}
          </details>
        </section>

        <aside className="section result-aside">
          <BudgetCard plan={plan} budget={budget} />

          <div className="result-actions">
            {isDraft ? (
              <button type="button" className="button button-primary button-block" onClick={onSave} disabled={plan.items.length === 0}>
                <Icon name="heart" size={18} /> {alreadySaved ? 'Simpan perubahan' : 'Simpan date'}
              </button>
            ) : (
              <p className="saved-note">
                <Icon name="heart" size={16} /> Tersimpan · perubahan otomatis kesimpan
              </p>
            )}
            <div className="action-pair">
              <button type="button" className="button button-soft" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
                <Icon name="sliders" size={18} /> {editing ? 'Selesai' : 'Atur lagi'}
              </button>
              <button type="button" className="button button-soft" onClick={tryAnotherIdea}>
                <Icon name="refresh" size={18} /> Coba ide lain
              </button>
            </div>
            <button type="button" className="button button-ghost button-block" onClick={onEditPreferences}>
              <Icon name="edit" size={16} /> Ubah jawaban
            </button>
            {!isDraft && (
              <div className="action-pair">
                <button type="button" className="button button-ghost" onClick={onDuplicate}>
                  <Icon name="copy" size={16} /> Duplikat
                </button>
                <button type="button" className="button button-danger-ghost" onClick={onDelete}>
                  <Icon name="trash" size={16} /> Hapus
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
