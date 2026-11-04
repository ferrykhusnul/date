import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MultiChipGroup } from '../components/ChipGroup';
import { TransitAccessEditor, type TransitRowForm } from '../components/TransitAccessEditor';
import { CurrencyInput } from '../components/CurrencyInput';
import { EmptyState } from '../components/EmptyState';
import { ExternalLink } from '../components/ExternalLink';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { todayISO } from '../lib/format';
import { buildSearchUrl } from '../lib/maps';
import {
  CATEGORY_OPTIONS,
  CITY_SUGGESTIONS,
  STATUS_OPTIONS,
} from '../lib/options';
import { citiesOf } from '../lib/venueFilters';
import { UI_ACTIVITY_OPTIONS, UI_ENVIRONMENT_OPTIONS, UI_MOOD_OPTIONS } from '../lib/uiLabels';
import { validateVenue, type VenueErrors } from '../lib/venueValidation';
import { newVenueId, useVenues } from '../state/VenueStore';
import type { Activity, Environment, Venue, VenueStatus, Vibe } from '../types';

/** Form state keeps optional numbers as text so fields can be left blank. */
interface FormValues extends Omit<Venue, 'latitude' | 'longitude' | 'transitAccess'> {
  latitude: string;
  longitude: string;
  transitRows: TransitRowForm[];
}

const BLANK: FormValues = {
  id: '',
  name: '',
  category: '',
  address: '',
  city: '',
  district: '',
  priceMin: 0,
  priceMax: 0,
  priceUnknown: false,
  visitDurationMinutes: 60,
  vibes: [],
  activities: [],
  environment: 'indoor',
  latitude: '',
  longitude: '',
  googleMapsUrl: '',
  description: '',
  verifiedAt: '',
  status: 'active',
  transitRows: [],
  transitNote: '',
};

function toForm(v: Venue): FormValues {
  return {
    ...BLANK,
    ...(({ transitAccess: _omit, ...rest }) => rest)(v),
    priceUnknown: Boolean(v.priceUnknown),
    district: v.district ?? '',
    verifiedAt: v.verifiedAt ?? '',
    transitRows: (v.transitAccess ?? []).map((a) => ({
      stationName: a.stationName,
      transitType: a.transitType,
      distanceMeters: a.distanceMeters === undefined ? '' : String(a.distanceMeters),
      walkingMinutes: a.walkingMinutes === undefined ? '' : String(a.walkingMinutes),
      verifiedAt: a.verifiedAt ?? '',
    })),
    transitNote: v.transitNote ?? '',
    latitude: v.latitude === undefined ? '' : String(v.latitude),
    longitude: v.longitude === undefined ? '' : String(v.longitude),
  };
}

function parseCoord(text: string): number | undefined {
  const t = text.trim().replace(',', '.');
  return t === '' ? undefined : Number(t);
}

function parseWhole(text: string): number | undefined {
  const t = text.trim();
  return t === '' ? undefined : Number(t);
}

function toVenue(f: FormValues, id: string): Venue {
  const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : undefined);
  return {
    id,
    name: f.name.trim(),
    category: f.category,
    address: f.address.trim(),
    city: f.city.trim(),
    district: opt(f.district),
    priceMin: f.priceUnknown ? 0 : f.priceMin,
    priceMax: f.priceUnknown ? 0 : f.priceMax,
    priceUnknown: f.priceUnknown ? true : undefined,
    visitDurationMinutes: f.visitDurationMinutes,
    vibes: f.vibes,
    activities: f.activities,
    environment: f.environment,
    latitude: parseCoord(f.latitude),
    longitude: parseCoord(f.longitude),
    googleMapsUrl: f.googleMapsUrl.trim(),
    description: f.description.trim(),
    verifiedAt: opt(f.verifiedAt),
    status: f.status,
    transitAccess: f.transitRows.length
      ? f.transitRows.map((r) => ({
          stationName: r.stationName.trim(),
          transitType: r.transitType,
          distanceMeters: parseWhole(r.distanceMeters),
          walkingMinutes: parseWhole(r.walkingMinutes),
          verifiedAt: opt(r.verifiedAt),
        }))
      : undefined,
    transitNote: opt(f.transitNote),
  };
}

export function VenueForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getVenue, saveVenue, realVenues } = useVenues();
  const existing = id ? getVenue(id) : undefined;

  const [values, setValues] = useState<FormValues>(() => (existing ? toForm(existing) : BLANK));
  const [errors, setErrors] = useState<VenueErrors>({});
  const [submitted, setSubmitted] = useState(false);

  if (id && (!existing || existing.isSample)) {
    return (
      <div className="page page-narrow">
        <PageHeader title={existing ? 'Venue sampel tidak dapat diubah' : 'Venue tidak ditemukan'} back />
        <EmptyState
          title={existing ? 'Ini venue sampel' : 'Venue tidak tersedia'}
          body={existing ? 'Venue sampel hanya contoh dan bersifat baca-saja. Tambahkan venue nyata sebagai gantinya.' : 'Tautan mungkin salah atau venue sudah dihapus.'}
          actions={<Link to="/venue/baru" className="button button-primary">Tambah venue</Link>}
        />
      </div>
    );
  }

  const set = <K extends keyof FormValues>(key: K, val: FormValues[K]) => {
    const next = { ...values, [key]: val };
    setValues(next);
    if (submitted) setErrors(validateVenue(toVenue(next, next.id || 'draft')));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const venueId = existing?.id ?? newVenueId(values.name, values.city);
    const venue = toVenue(values, venueId);
    const errs = validateVenue(venue);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      if (first === 'transitRows') {
        const [row, fields] = Object.entries(errs.transitRows ?? {})[0] ?? [];
        if (row !== undefined) document.getElementById(`ta-${row}-${Object.keys(fields ?? {})[0]}`)?.focus();
      } else {
        document.getElementById(`v-${first}`)?.focus();
      }
      return;
    }
    saveVenue(venue);
    navigate(`/venue/${encodeURIComponent(venueId)}`, { replace: true });
  };

  const err = (k: keyof Venue) =>
    errors[k] ? <p className="field-error" id={`v-${k}-error`}>{errors[k]}</p> : null;
  const inv = (k: keyof Venue) => (errors[k] ? true : undefined);
  const canSearch = values.name.trim() && values.address.trim();
  const cities = [...new Set([...citiesOf(realVenues), ...CITY_SUGGESTIONS])];

  return (
    <div className="page page-narrow">
      <PageHeader
        back
        eyebrow={existing ? 'Atur tempat' : 'Tempat baru'}
        title={existing ? existing.name : 'Tambah tempat'}
        lead="Isi yang udah kamu cek aja ya. Harga = kira-kira per orang."
      />

      <form className="form" onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <h2 className="form-section-title"><span className="step">01</span> Tentang tempatnya</h2>
          <div className="field">
            <label className="field-label" htmlFor="v-name">Nama tempat</label>
            <input id="v-name" className="input" value={values.name} aria-invalid={inv('name')}
              onChange={(e) => set('name', e.target.value)} />
            {err('name')}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="v-category">Kategori</label>
            <select id="v-category" className="input select" value={values.category} aria-invalid={inv('category')}
              onChange={(e) => set('category', e.target.value)}>
              <option value="" disabled>Pilih kategori</option>
              {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {err('category')}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="v-description">Deskripsi <span className="optional">(opsional)</span></label>
            <textarea id="v-description" className="input textarea" rows={3} maxLength={500}
              value={values.description} onChange={(e) => set('description', e.target.value)} />
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title"><span className="step">02</span> Lokasi</h2>
          <div className="field">
            <label className="field-label" htmlFor="v-address">Alamat</label>
            <input id="v-address" className="input" value={values.address} aria-invalid={inv('address')}
              onChange={(e) => set('address', e.target.value)} />
            {err('address')}
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="v-city">Kota</label>
              <input id="v-city" className="input" list="venue-city-list" value={values.city} aria-invalid={inv('city')}
                onChange={(e) => set('city', e.target.value)} />
              <datalist id="venue-city-list">{cities.map((c) => <option key={c} value={c} />)}</datalist>
              {err('city')}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-district">Kecamatan <span className="optional">(opsional)</span></label>
              <input id="v-district" className="input" value={values.district}
                onChange={(e) => set('district', e.target.value)} />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="v-latitude">Lintang <span className="optional">(opsional)</span></label>
              <input id="v-latitude" className="input" inputMode="decimal" placeholder="-6.2"
                value={values.latitude} aria-invalid={inv('latitude')} onChange={(e) => set('latitude', e.target.value)} />
              {err('latitude')}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-longitude">Bujur <span className="optional">(opsional)</span></label>
              <input id="v-longitude" className="input" inputMode="decimal" placeholder="106.8"
                value={values.longitude} aria-invalid={inv('longitude')} onChange={(e) => set('longitude', e.target.value)} />
              {err('longitude')}
            </div>
          </div>
          <TransitAccessEditor rows={values.transitRows} errors={errors.transitRows}
            onChange={(rows) => set('transitRows', rows)} />
          {err('transitAccess')}
          <div className="field">
            <label className="field-label" htmlFor="v-transitNote">Catatan transum <span className="optional">(opsional)</span></label>
            <input id="v-transitNote" className="input" maxLength={160} value={values.transitNote}
              onChange={(e) => set('transitNote', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="v-googleMapsUrl">Link Google Maps</label>
            <input id="v-googleMapsUrl" className="input" type="url" inputMode="url" placeholder="https://maps.app.goo.gl/…"
              value={values.googleMapsUrl} aria-invalid={inv('googleMapsUrl')}
              onChange={(e) => set('googleMapsUrl', e.target.value)} />
            <p className="field-hint">
              Buka tempatnya di Google Maps → Bagikan → Salin link.{' '}
              {canSearch ? (
                <ExternalLink className="text-link" href={buildSearchUrl({ ...values, district: values.district })}>
                  Cari di Google Maps <Icon name="external" size={14} />
                </ExternalLink>
              ) : (
                <span>Isi nama & alamat dulu buat cari.</span>
              )}
            </p>
            {err('googleMapsUrl')}
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title"><span className="step">03</span> Harga &amp; durasi</h2>
          <label className="switch">
            <input id="v-priceUnknown" type="checkbox" checked={Boolean(values.priceUnknown)}
              onChange={(e) => set('priceUnknown', e.target.checked)} />
            <span>
              Harga belum diketahui
              <span className="field-hint block">Nggak bakal ditebak, nanti ditandai "harga belum tahu".</span>
            </span>
          </label>
          {!values.priceUnknown && (
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="v-priceMin">Min. /orang</label>
              <CurrencyInput id="v-priceMin" value={values.priceMin} invalid={Boolean(errors.priceMin)}
                onChange={(v) => set('priceMin', v)} />
              {err('priceMin')}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-priceMax">Maks. /orang</label>
              <CurrencyInput id="v-priceMax" value={values.priceMax} invalid={Boolean(errors.priceMax)}
                onChange={(v) => set('priceMax', v)} />
              {err('priceMax')}
            </div>
          </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="v-visitDurationMinutes">Biasanya berapa lama (menit)</label>
            <input id="v-visitDurationMinutes" className="input" type="number" inputMode="numeric" min={15} max={720} step={15}
              value={values.visitDurationMinutes || ''} aria-invalid={inv('visitDurationMinutes')}
              onChange={(e) => set('visitDurationMinutes', Number(e.target.value) || 0)} />
            {err('visitDurationMinutes')}
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title"><span className="step">04</span> Cocok buat apa?</h2>
          <div id="v-activities" tabIndex={-1}>
            <MultiChipGroup<Activity> name="v-act" legend="Aktivitas" options={UI_ACTIVITY_OPTIONS}
              value={values.activities as Activity[]} error={errors.activities}
              onChange={(v) => set('activities', v)} />
          </div>
          <div id="v-vibes" tabIndex={-1}>
            <MultiChipGroup<Vibe> name="v-vibe" legend="Vibes" options={UI_MOOD_OPTIONS}
              value={values.vibes as Vibe[]} error={errors.vibes} onChange={(v) => set('vibes', v)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="v-environment">Tempatnya</label>
              <select id="v-environment" className="input select" value={values.environment}
                onChange={(e) => set('environment', e.target.value as Environment)}>
                {UI_ENVIRONMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="v-status">Status</label>
              <select id="v-status" className="input select" value={values.status}
                onChange={(e) => set('status', e.target.value as VenueStatus)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="v-verifiedAt">Kapan dicek <span className="optional">(opsional)</span></label>
            <div className="input-with-action">
              <input id="v-verifiedAt" className="input" type="date" max={todayISO()} value={values.verifiedAt}
                aria-invalid={inv('verifiedAt')} onChange={(e) => set('verifiedAt', e.target.value)} />
              <button type="button" className="button button-ghost button-sm" onClick={() => set('verifiedAt', todayISO())}>
                Hari ini
              </button>
            </div>
            <p className="field-hint">Isi kalau kamu udah cek detailnya di Google Maps.</p>
            {err('verifiedAt')}
          </div>
        </section>

        <div className="form-actions sticky-actions">
          <button type="submit" className="button button-primary button-lg button-block">
            {existing ? 'Simpan perubahan' : 'Simpan tempat'}
          </button>
        </div>
      </form>
    </div>
  );
}
