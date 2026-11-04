import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PlanCard } from '../components/PlanCard';
import { todayISO } from '../lib/format';
import { EMPTY_PLAN_FILTER, filterPlans, planCities, type PlanFilter } from '../lib/planFilters';
import { planDisplayName, useAppState } from '../state/AppState';

const TIME_TABS: { value: PlanFilter['time']; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'upcoming', label: 'Akan datang' },
  { value: 'past', label: 'Udah lewat' },
];

export function SavedDates() {
  const { savedPlans, deletePlan, duplicatePlan } = useAppState();
  const [filter, setFilter] = useState<PlanFilter>(EMPTY_PLAN_FILTER);
  const [status, setStatus] = useState('');

  const cities = useMemo(() => planCities(savedPlans), [savedPlans]);
  const results = useMemo(() => filterPlans(savedPlans, filter, todayISO()), [savedPlans, filter]);
  const filtered = filter.query !== '' || filter.city !== '' || filter.time !== 'all';
  const set = <K extends keyof PlanFilter>(k: K, v: PlanFilter[K]) => setFilter((f) => ({ ...f, [k]: v }));

  const onDelete = (id: string) => {
    const plan = savedPlans.find((p) => p.id === id);
    if (plan && window.confirm(`Hapus "${planDisplayName(plan)}"? Nggak bisa dibalikin lho.`)) {
      deletePlan(id);
      setStatus(`"${planDisplayName(plan)}" dihapus.`);
    }
  };

  const onDuplicate = (id: string) => {
    const copy = duplicatePlan(id);
    if (copy) setStatus(`Salinan dibuat ♡`);
  };

  return (
    <div className="page">
      <PageHeader title="Our little plans" lead={savedPlans.length ? `${savedPlans.length} date di perangkat ini` : undefined} />

      {savedPlans.length === 0 ? (
        <EmptyState
          title="Belum ada cerita nih ♡"
          body="Simpan date dari halaman hasil biar gampang dibuka lagi."
          actions={
            <>
              <Link to="/buat" className="button button-primary">Bikin date pertama</Link>
              <Link to="/cadangan" className="button button-ghost">Pulihkan cadangan</Link>
            </>
          }
        />
      ) : (
        <>
          <div className="plan-filters" role="search">
            <div className="field plan-filter-search">
              <label className="sr-only" htmlFor="pf-q">Cari date</label>
              <input id="pf-q" className="input input-pill" type="search" placeholder="Cari date…"
                value={filter.query} onChange={(e) => set('query', e.target.value)} />
            </div>
            <div className="segmented" role="radiogroup" aria-label="Waktu">
              {TIME_TABS.map((t) => (
                <label key={t.value} className={`segment${filter.time === t.value ? ' is-active' : ''}`}>
                  <input type="radio" name="pf-time" checked={filter.time === t.value} onChange={() => set('time', t.value)} />
                  {t.label}
                </label>
              ))}
            </div>
            <div className="filter-row">
              {cities.length > 1 && (
                <select aria-label="Kota" className="input select input-sm" value={filter.city} onChange={(e) => set('city', e.target.value)}>
                  <option value="">Semua kota</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select id="pf-sort" aria-label="Urutkan" className="input select input-sm" value={filter.sort}
                onChange={(e) => set('sort', e.target.value as PlanFilter['sort'])}>
                <option value="created-desc">Terbaru dibuat</option>
                <option value="created-asc">Terlama dibuat</option>
                <option value="date-asc">Tanggal terdekat</option>
                <option value="date-desc">Tanggal terjauh</option>
                <option value="name">Nama A–Z</option>
              </select>
            </div>
          </div>

          <p className="status" role="status" aria-live="polite">
            {status || (filtered ? `${results.length} dari ${savedPlans.length} date` : '')}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="Nggak ketemu"
              body="Coba kata lain atau ganti filternya."
              actions={<button type="button" className="button button-ghost" onClick={() => setFilter(EMPTY_PLAN_FILTER)}>Reset filter</button>}
            />
          ) : (
            <div className="saved-grid">
              {results.map((p) => (
                <PlanCard key={p.id} plan={p} variant="preview" headingLevel={2} showCreated onDelete={onDelete} onDuplicate={onDuplicate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
