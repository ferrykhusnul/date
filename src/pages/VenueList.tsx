import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { VenueCard } from '../components/VenueCard';
import { formatIDR } from '../lib/format';
import {
  CATEGORY_OPTIONS,
  TRANSIT_TYPE_OPTIONS,
} from '../lib/options';
import { UI_ACTIVITY_OPTIONS, UI_ENVIRONMENT_OPTIONS, UI_MOOD_OPTIONS } from '../lib/uiLabels';
import { EMPTY_FILTER, citiesOf, filterVenues, type VenueFilter } from '../lib/venueFilters';
import { useVenues } from '../state/VenueStore';
import type { Environment, VenueStatus } from '../types';

const PRICE_LIMITS = [50_000, 100_000, 200_000, 500_000];

export function VenueList() {
  const { venues, realVenues } = useVenues();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<VenueFilter>(() => ({
    ...EMPTY_FILTER,
    city: params.get('kota') ?? '',
    includeSamples: params.get('sampel') === '1',
  }));

  const set = <K extends keyof VenueFilter>(key: K, value: VenueFilter[K]) =>
    setFilter((f) => ({ ...f, [key]: value }));

  const cityOptions = useMemo(
    () => citiesOf(filter.includeSamples ? venues : realVenues),
    [venues, realVenues, filter.includeSamples],
  );
  const results = useMemo(() => filterVenues(venues, filter), [venues, filter]);
  const activeFilters = (Object.keys(EMPTY_FILTER) as (keyof VenueFilter)[]).filter(
    (k) => k !== 'includeSamples' && filter[k] !== EMPTY_FILTER[k],
  ).length;

  return (
    <div className="page">
      <PageHeader
        title="Tempat"
        lead="Tempat-tempat buat ide date. Yang aktif aja yang dipakai."
        actions={
          <Link to="/venue/baru" className="button button-primary">
            <Icon name="plus" size={18} /> Tambah tempat
          </Link>
        }
      />

      <details className="filter-panel" open={activeFilters > 0 || undefined}>
        <summary>
          Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
          <span className="muted small">{results.length} tempat</span>
        </summary>
        <div className="filter-grid">
          <div className="field filter-search">
            <label className="field-label" htmlFor="vf-q">
              Cari
            </label>
            <input
              id="vf-q"
              className="input"
              type="search"
              placeholder="Nama, alamat, stasiun…"
              value={filter.query}
              onChange={(e) => set('query', e.target.value)}
            />
          </div>
          <FilterSelect id="vf-city" label="Kota" value={filter.city} onChange={(v) => set('city', v)}
            options={cityOptions.map((c) => ({ value: c, label: c }))} />
          <FilterSelect id="vf-cat" label="Kategori" value={filter.category} onChange={(v) => set('category', v)}
            options={CATEGORY_OPTIONS} />
          <FilterSelect id="vf-act" label="Aktivitas" value={filter.activity} onChange={(v) => set('activity', v)}
            options={UI_ACTIVITY_OPTIONS} />
          <FilterSelect id="vf-vibe" label="Vibes" value={filter.vibe} onChange={(v) => set('vibe', v)}
            options={UI_MOOD_OPTIONS} />
          <FilterSelect id="vf-env" label="Tempatnya" value={filter.environment}
            onChange={(v) => set('environment', v as Environment | '')} options={UI_ENVIRONMENT_OPTIONS} />
          <FilterSelect id="vf-price" label="Harga maks. /orang" value={filter.maxPrice ? String(filter.maxPrice) : ''}
            onChange={(v) => set('maxPrice', Number(v) || 0)}
            options={PRICE_LIMITS.map((p) => ({ value: String(p), label: `≤ ${formatIDR(p)}` }))} />
          <FilterSelect id="vf-transit" label="Transum" value={filter.transit}
            onChange={(v) => set('transit', v as VenueFilter['transit'])}
            options={[
              { value: 'any', label: 'Dekat transum' },
              { value: 'verified', label: 'Udah dicek' },
              { value: 'unknown', label: 'Belum tahu' },
              ...TRANSIT_TYPE_OPTIONS,
            ]} />
          <div className="field">
            <label className="field-label" htmlFor="vf-status">
              Status
            </label>
            <select id="vf-status" className="input select" value={filter.status}
              onChange={(e) => set('status', e.target.value as VenueStatus | 'all')}>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="all">Semua</option>
            </select>
          </div>
        </div>
        <div className="filter-foot">
          <label className="switch">
            <input type="checkbox" checked={filter.includeSamples}
              onChange={(e) => set('includeSamples', e.target.checked)} />
            <span>Tampilkan tempat contoh</span>
          </label>
          <button type="button" className="button button-ghost button-sm" disabled={activeFilters === 0}
            onClick={() => setFilter((f) => ({ ...EMPTY_FILTER, includeSamples: f.includeSamples }))}>
            Reset filter
          </button>
        </div>
      </details>

      {realVenues.length === 0 && !filter.includeSamples ? (
        <EmptyState
          title="Belum ada tempat nih ♡"
          body="Tambahin tempat yang udah kamu cek di Google Maps, atau lihat contoh dulu."
          actions={
            <>
              <Link to="/venue/baru" className="button button-primary">Tambah tempat</Link>
              <button type="button" className="button button-ghost" onClick={() => set('includeSamples', true)}>
                Lihat contoh
              </button>
            </>
          }
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="Nggak ketemu"
          body="Coba longgarin filternya."
          actions={
            <button type="button" className="button button-ghost"
              onClick={() => setFilter((f) => ({ ...EMPTY_FILTER, includeSamples: f.includeSamples }))}>
              Reset filter
            </button>
          }
        />
      ) : (
        <div className="venue-grid">
          {results.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="input select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Semua</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
