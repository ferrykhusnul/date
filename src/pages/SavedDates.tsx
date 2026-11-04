import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PlanCard } from '../components/PlanCard';
import { todayISO } from '../lib/format';
import { EMPTY_PLAN_FILTER, filterPlans, planCities, type PlanFilter } from '../lib/planFilters';
import { planDisplayName, useAppState } from '../state/AppState';

export function SavedDates() {
  const navigate = useNavigate();
  const { savedPlans, deletePlan, duplicatePlan, loadSamplePlans } = useAppState();
  const [filter, setFilter] = useState<PlanFilter>(EMPTY_PLAN_FILTER);
  const [status, setStatus] = useState('');

  const cities = useMemo(() => planCities(savedPlans), [savedPlans]);
  const results = useMemo(() => filterPlans(savedPlans, filter, todayISO()), [savedPlans, filter]);
  const filtered = filter.query !== '' || filter.city !== '' || filter.time !== 'all';
  const set = <K extends keyof PlanFilter>(k: K, v: PlanFilter[K]) => setFilter((f) => ({ ...f, [k]: v }));

  const onDelete = (id: string) => {
    const plan = savedPlans.find((p) => p.id === id);
    if (plan && window.confirm(`Hapus rencana "${planDisplayName(plan)}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deletePlan(id);
      setStatus(`"${planDisplayName(plan)}" dihapus.`);
    }
  };

  const onDuplicate = (id: string) => {
    const copy = duplicatePlan(id);
    if (copy) setStatus(`Salinan dibuat: "${planDisplayName(copy)}".`);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Koleksi"
        title="Rencana tersimpan"
        lead={savedPlans.length ? `${savedPlans.length} rencana, tersimpan di perangkat ini.` : undefined}
      />

      {savedPlans.length === 0 ? (
        <EmptyState
          title="Belum ada yang disimpan"
          body="Simpan rencana dari halaman hasil agar mudah dibuka kembali. Rencana tersimpan di perangkat ini dan tetap ada setelah halaman dimuat ulang."
          actions={
            <>
              <Link to="/buat" className="button button-primary">Buat rencana</Link>
              <button type="button" className="button button-ghost" onClick={loadSamplePlans}>Muat contoh rencana</button>
              <button type="button" className="button button-ghost" onClick={() => navigate('/cadangan')}>Pulihkan dari cadangan</button>
            </>
          }
        />
      ) : (
        <>
          <div className="plan-filters" role="search">
            <div className="field plan-filter-search">
              <label className="field-label" htmlFor="pf-q">Cari</label>
              <input id="pf-q" className="input" type="search" placeholder="Nama rencana, kota, venue, catatan…"
                value={filter.query} onChange={(e) => set('query', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pf-city">Kota</label>
              <select id="pf-city" className="input select" value={filter.city} onChange={(e) => set('city', e.target.value)}>
                <option value="">Semua kota</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pf-time">Waktu</label>
              <select id="pf-time" className="input select" value={filter.time} onChange={(e) => set('time', e.target.value as PlanFilter['time'])}>
                <option value="all">Semua</option>
                <option value="upcoming">Akan datang</option>
                <option value="past">Sudah lewat</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pf-sort">Urutkan</label>
              <select id="pf-sort" className="input select" value={filter.sort} onChange={(e) => set('sort', e.target.value as PlanFilter['sort'])}>
                <option value="created-desc">Dibuat terbaru</option>
                <option value="created-asc">Dibuat terlama</option>
                <option value="date-asc">Tanggal kencan terdekat</option>
                <option value="date-desc">Tanggal kencan terjauh</option>
                <option value="name">Nama A–Z</option>
              </select>
            </div>
          </div>

          <p className="status" role="status" aria-live="polite">
            {status || (filtered ? `${results.length} dari ${savedPlans.length} rencana cocok.` : '')}
          </p>

          {results.length === 0 ? (
            <EmptyState
              title="Tidak ada rencana yang cocok"
              body="Coba kata kunci lain atau longgarkan filter."
              actions={<button type="button" className="button button-ghost" onClick={() => setFilter(EMPTY_PLAN_FILTER)}>Reset filter</button>}
            />
          ) : (
            <div className="saved-grid">
              {results.map((p) => (
                <PlanCard key={p.id} plan={p} variant="preview" onDelete={onDelete} onDuplicate={onDuplicate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
