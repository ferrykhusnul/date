import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChipGroup, MultiChipGroup } from '../components/ChipGroup';
import { CurrencyInput } from '../components/CurrencyInput';
import { PageHeader } from '../components/PageHeader';
import { formatIDR, todayISO } from '../lib/format';
import type { PlanIssue } from '../types';
import {
  ACTIVITY_OPTIONS,
  BUDGET_PRESETS,
  CITY_SUGGESTIONS,
  DURATION_OPTIONS,
  ENVIRONMENT_OPTIONS,
  TRANSPORT_OPTIONS,
  VIBE_OPTIONS,
} from '../lib/options';
import { generateItinerary } from '../engine/generator';
import { isPublicTransport } from '../engine/transport';
import { validateDateInput as validate, type InputErrors } from '../engine/validation';
import { citiesOf, plannableVenues } from '../lib/venueFilters';
import { SAMPLE_VENUES } from '../data/sampleVenues';
import { useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DateInput } from '../types';

type Errors = InputErrors;

const NOTES_MAX = 300;

export function CreateDate() {
  const navigate = useNavigate();
  const { settings, preferences, formSeed, setFormSeed, draft, setDraft } = useAppState();
  const { realVenues } = useVenues();

  const [values, setValues] = useState<DateInput>(
    () =>
      formSeed ?? {
        city: settings.defaultCity,
        date: todayISO(),
        startTime: preferences.startTime,
        durationHours: preferences.durationHours,
        budget: settings.defaultBudget,
        vibe: preferences.vibe,
        activities: [...preferences.activities],
        transportation: settings.defaultTransportation,
        environment: preferences.environment,
        notes: '',
      },
  );
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [blocking, setBlocking] = useState<PlanIssue[]>([]);
  // Captured once: the seed is consumed on mount so a later visit starts fresh.
  const [editing] = useState(() => Boolean(formSeed && draft));
  useEffect(() => {
    setFormSeed(null);
  }, [setFormSeed]);

  const cityPool = plannableVenues(realVenues, values.city);
  const willUseSamples = values.city.trim() !== '' && cityPool.length === 0 && settings.useSampleVenues;
  const noVenues = values.city.trim() !== '' && cityPool.length === 0 && !settings.useSampleVenues;
  const citySuggestions = [...new Set([...citiesOf(realVenues.filter((v) => v.status === 'active')), ...CITY_SUGGESTIONS])];

  const set = <K extends keyof DateInput>(key: K, val: DateInput[K]) => {
    const next = { ...values, [key]: val };
    setValues(next);
    if (submitted) setErrors(validate(next));
    if (blocking.length) setBlocking([]);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = Object.keys(errs)[0];
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    const usesSampleVenues = cityPool.length === 0;
    const { plan, issues } = generateItinerary(
      {
        ...values,
        city: values.city.trim(),
        notes: values.notes.trim(),
        startLocation: values.startLocation?.trim() || undefined,
        endLocation: values.endLocation?.trim() || undefined,
      },
      usesSampleVenues ? (settings.useSampleVenues ? SAMPLE_VENUES : []) : realVenues,
      {
        planId: editing && draft ? draft.id : `plan-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        ignoreCity: usesSampleVenues,
        usesSampleVenues,
      },
    );
    if (!plan) {
      setBlocking(issues);
      document.getElementById('generation-error')?.focus();
      return;
    }
    setBlocking([]);
    setDraft(plan);
    navigate('/hasil');
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        eyebrow={editing ? 'Ubah itinerary' : 'Rencana baru'}
        title={editing ? 'Sesuaikan rencanamu' : 'Rancang kencanmu'}
        lead="Isi preferensi di bawah. Kami akan menyusun linimasa, tempat, dan perkiraan biaya."
        back={editing ? '/hasil' : undefined}
      />

      <form className="form" onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <h2 className="form-section-title">
            <span className="step">01</span> Kapan &amp; di mana
          </h2>

          <div className="field">
            <label className="field-label" htmlFor="f-city">
              Kota
            </label>
            <input
              id="f-city"
              className="input"
              list="city-suggestions"
              autoComplete="address-level2"
              placeholder="Contoh: Bandung"
              value={values.city}
              aria-invalid={Boolean(errors.city) || undefined}
              onChange={(e) => set('city', e.target.value)}
            />
            <datalist id="city-suggestions">
              {citySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.city && <p className="field-error">{errors.city}</p>}
            {cityPool.length > 0 && (
              <p className="field-hint">{cityPool.length} venue aktif tersedia di {values.city.trim()}.</p>
            )}
            {willUseSamples && (
              <p className="field-hint field-hint-warn">
                Belum ada venue di {values.city.trim()}. Rencana akan memakai <strong>venue sampel</strong> (bukan tempat
                nyata). <Link to="/venue/baru" className="text-link">Tambah venue</Link>
              </p>
            )}
            {noVenues && (
              <p className="field-hint field-hint-warn">
                Belum ada venue aktif di {values.city.trim()}.{' '}
                <Link to="/venue/baru" className="text-link">Tambah venue</Link> atau aktifkan venue sampel di Pengaturan.
              </p>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="f-date">
                Tanggal
              </label>
              <input
                id="f-date"
                type="date"
                className="input"
                min={todayISO()}
                value={values.date}
                aria-invalid={Boolean(errors.date) || undefined}
                onChange={(e) => set('date', e.target.value)}
              />
              {errors.date && <p className="field-error">{errors.date}</p>}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="f-startTime">
                Jam mulai
              </label>
              <input
                id="f-startTime"
                type="time"
                className="input"
                step={900}
                value={values.startTime}
                aria-invalid={Boolean(errors.startTime) || undefined}
                onChange={(e) => set('startTime', e.target.value)}
              />
              {errors.startTime && <p className="field-error">{errors.startTime}</p>}
            </div>
          </div>

          <ChipGroup
            name="duration"
            legend="Durasi"
            options={DURATION_OPTIONS}
            value={values.durationHours}
            onChange={(v) => set('durationHours', v)}
          />
        </section>

        <section className="form-section">
          <h2 className="form-section-title">
            <span className="step">02</span> Anggaran
          </h2>
          <div className="field">
            <label className="field-label" htmlFor="f-budget">
              Total anggaran (untuk berdua)
            </label>
            <CurrencyInput
              id="f-budget"
              value={values.budget}
              invalid={Boolean(errors.budget)}
              onChange={(v) => set('budget', v)}
            />
            <div className="chips chips-tight">
              {BUDGET_PRESETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`chip chip-button${values.budget === b ? ' is-active' : ''}`}
                  onClick={() => set('budget', b)}
                >
                  {formatIDR(b)}
                </button>
              ))}
            </div>
            {errors.budget && <p className="field-error">{errors.budget}</p>}
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">
            <span className="step">03</span> Suasana &amp; aktivitas
          </h2>
          <ChipGroup
            name="vibe"
            legend="Vibe"
            options={VIBE_OPTIONS}
            value={values.vibe}
            onChange={(v) => set('vibe', v)}
          />
          <div id="f-activities" tabIndex={-1}>
            <MultiChipGroup
              name="activities"
              legend="Aktivitas"
              hint="Pilih satu atau lebih."
              options={ACTIVITY_OPTIONS}
              value={values.activities}
              error={errors.activities}
              onChange={(v) => set('activities', v)}
            />
          </div>
          <ChipGroup
            name="environment"
            legend="Lingkungan"
            options={ENVIRONMENT_OPTIONS}
            value={values.environment}
            onChange={(v) => set('environment', v)}
          />
        </section>

        <section className="form-section">
          <h2 className="form-section-title">
            <span className="step">04</span> Perjalanan &amp; catatan
          </h2>
          <ChipGroup
            name="transportation"
            legend="Transportasi"
            options={TRANSPORT_OPTIONS}
            value={values.transportation}
            onChange={(v) => set('transportation', v)}
          />
          {(isPublicTransport(values.transportation) || values.transportation === 'campuran') && (
            <p className="field-hint field-hint-info">
              {values.transportation === 'campuran'
                ? 'Moda bisa berbeda di tiap perpindahan dan diubah di halaman hasil. '
                : 'Venue dengan akses transit terverifikasi diprioritaskan, dan jumlah perpindahan dibatasi. '}
              Aplikasi ini tidak menghitung rute, durasi, atau tarif — tiap perpindahan punya tombol rute ke Google Maps.
            </p>
          )}
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="f-startLocation">
                Titik berangkat <span className="optional">(opsional)</span>
              </label>
              <input id="f-startLocation" className="input" maxLength={160} autoComplete="off"
                placeholder="Misalnya: Stasiun Sudirman" value={values.startLocation ?? ''}
                aria-invalid={errors.startLocation ? true : undefined}
                onChange={(e) => set('startLocation', e.target.value)} />
              {errors.startLocation && <p className="field-error">{errors.startLocation}</p>}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="f-endLocation">
                Tujuan akhir <span className="optional">(opsional)</span>
              </label>
              <input id="f-endLocation" className="input" maxLength={160} autoComplete="off"
                placeholder="Misalnya: rumah atau stasiun" value={values.endLocation ?? ''}
                aria-invalid={errors.endLocation ? true : undefined}
                onChange={(e) => set('endLocation', e.target.value)} />
              {errors.endLocation && <p className="field-error">{errors.endLocation}</p>}
            </div>
          </div>
          <p className="field-hint">Hanya dipakai untuk membuka rute di Google Maps; tidak disimpan di luar perangkat ini.</p>
          <div className="field">
            <label className="field-label" htmlFor="f-notes">
              Catatan <span className="optional">(opsional)</span>
            </label>
            <textarea
              id="f-notes"
              className="input textarea"
              rows={3}
              maxLength={NOTES_MAX}
              placeholder="Misalnya: hindari tempat yang terlalu ramai, pasangan vegetarian…"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
            <p className="field-hint align-end">
              {values.notes.length}/{NOTES_MAX}
            </p>
          </div>
        </section>

        {blocking.length > 0 && (
          <div className="issue-list" id="generation-error" tabIndex={-1} role="alert">
            {blocking.map((issue) => (
              <p key={issue.code} className={`issue issue-${issue.severity}`}>
                {issue.message}{' '}
                {issue.code === 'NO_VENUES' && <Link to="/venue/baru" className="text-link">Tambah venue</Link>}
              </p>
            ))}
          </div>
        )}

        <div className="form-actions sticky-actions">
          <button type="submit" className="button button-primary button-lg button-block" disabled={noVenues}>
            {editing ? 'Perbarui rencana' : 'Susun rencana'}
          </button>
        </div>
      </form>
    </div>
  );
}
