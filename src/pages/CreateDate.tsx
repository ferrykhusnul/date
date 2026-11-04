import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChoiceCards, MultiChoiceCards } from '../components/ChoiceCards';
import { CurrencyInput } from '../components/CurrencyInput';
import { Icon } from '../components/Icon';
import { isPublicTransport } from '../engine/transport';
import { validateDateInput, type InputErrors } from '../engine/validation';
import { formatIDR, todayISO } from '../lib/format';
import { CITY_SUGGESTIONS, DURATION_OPTIONS } from '../lib/options';
import { planFromInput } from '../lib/planning';
import {
  ACTIVITIES_UI,
  BUDGET_PRESETS_UI,
  ENVIRONMENTS_UI,
  MOODS,
  TIME_PRESETS,
  TRANSIT_MODES,
  TRANSPORT_GROUPS,
  transportGroupOf,
  type TransportGroup,
} from '../lib/uiLabels';
import { citiesOf, plannableVenues } from '../lib/venueFilters';
import { newPlanId, useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DateInput, PlanIssue, Transportation } from '../types';

const STEPS = [
  { key: 'city', title: 'Mau date di mana?' },
  { key: 'when', title: 'Kapan nih?' },
  { key: 'mood', title: 'Pengen vibes yang kayak apa?' },
  { key: 'activities', title: 'Mau ngapain?' },
  { key: 'budget', title: 'Budget date berapa?' },
  { key: 'transport', title: 'Berangkat naik apa?' },
] as const;

/** Which input fields each step is responsible for (for validation). */
const STEP_FIELDS: (keyof DateInput)[][] = [
  ['city'],
  ['date', 'startTime', 'durationHours'],
  ['vibe', 'environment'],
  ['activities'],
  ['budget'],
  ['transportation', 'startLocation', 'endLocation'],
];

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function nextSaturday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return addDays(iso, (6 - day + 7) % 7);
}

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
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<InputErrors>({});
  const [blocking, setBlocking] = useState<PlanIssue[]>([]);
  const [customBudget, setCustomBudget] = useState(() => !BUDGET_PRESETS_UI.some((b) => b.value === values.budget));
  const [customTime, setCustomTime] = useState(() => !TIME_PRESETS.some((t) => t.value === values.startTime));
  const [otherCity, setOtherCity] = useState('');
  const [showExtras, setShowExtras] = useState(Boolean(values.notes || values.startLocation || values.endLocation));
  // Captured once: the seed is consumed on mount so a later visit starts fresh.
  const [editing] = useState(() => Boolean(formSeed && draft));
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setFormSeed(null);
  }, [setFormSeed]);

  // Move focus to the new question so screen readers announce it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  const set = <K extends keyof DateInput>(key: K, val: DateInput[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (blocking.length) setBlocking([]);
  };

  const cityCards = useMemo(() => {
    const active = realVenues.filter((v) => v.status === 'active');
    const list = [...new Set(['Jakarta', ...citiesOf(active), ...CITY_SUGGESTIONS])].slice(0, 6);
    if (values.city.trim() && !list.some((c) => c.toLowerCase() === values.city.trim().toLowerCase())) list.push(values.city.trim());
    return list.map((c) => {
      const n = plannableVenues(realVenues, c).length;
      return { value: c, label: c, icon: 'building' as const, hint: n ? `${n} tempat` : 'Belum ada tempat' };
    });
  }, [realVenues, values.city]);

  const cityPool = plannableVenues(realVenues, values.city);
  const noVenues = values.city.trim() !== '' && cityPool.length === 0;
  const group = transportGroupOf(values.transportation);

  const validateStep = (i: number): boolean => {
    const all = validateDateInput(values);
    const stepErrors = Object.fromEntries(STEP_FIELDS[i].filter((f) => all[f]).map((f) => [f, all[f]])) as InputErrors;
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const jumpTo = (i: number) => {
    if (i < step) setStep(i);
    else if (i > step) {
      for (let s = step; s < i; s++) {
        if (!validateStep(s)) {
          setStep(s);
          return;
        }
      }
      setStep(i);
    }
  };

  const submit = () => {
    const all = validateDateInput(values);
    const firstBad = STEP_FIELDS.findIndex((fields) => fields.some((f) => all[f]));
    if (firstBad !== -1) {
      setStep(firstBad);
      setErrors(all);
      return;
    }
    const { plan, issues } = planFromInput(
      {
        ...values,
        city: values.city.trim(),
        notes: values.notes.trim(),
        startLocation: values.startLocation?.trim() || undefined,
        endLocation: values.endLocation?.trim() || undefined,
      },
      { realVenues, settings, planId: editing && draft ? draft.id : newPlanId() },
    );
    if (!plan) {
      setBlocking(issues);
      return;
    }
    setDraft(plan);
    navigate('/hasil');
  };

  const isLast = step === STEPS.length - 1;
  const err = (k: keyof InputErrors) => (errors[k] ? <p className="field-error" role="alert">{errors[k]}</p> : null);

  let body: ReactNode;
  switch (STEPS[step].key) {
    case 'city':
      body = (
        <>
          <ChoiceCards name="city" legend="Kota" hideLegend options={cityCards} value={values.city} onChange={(v) => set('city', v)} />
          <div className="field">
            <label className="field-label" htmlFor="f-city-other">Kota lain</label>
            <div className="input-with-action">
              <input id="f-city-other" className="input" placeholder="Ketik nama kota" value={otherCity}
                onChange={(e) => setOtherCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && otherCity.trim()) { e.preventDefault(); set('city', otherCity.trim()); setOtherCity(''); } }} />
              <button type="button" className="button button-soft button-sm" disabled={!otherCity.trim()}
                onClick={() => { set('city', otherCity.trim()); setOtherCity(''); }}>Pilih</button>
            </div>
          </div>
          {err('city')}
          {values.city.trim() && cityPool.length === 0 && (
            <p className="soft-note">
              Belum ada tempat di {values.city}. Coba Jakarta dulu, atau <Link to="/venue/baru" className="text-link">tambah tempat</Link> sendiri.
            </p>
          )}
        </>
      );
      break;
    case 'when':
      body = (
        <>
          <div className="field">
            <label className="field-label" htmlFor="f-date">Tanggal</label>
            <input id="f-date" type="date" className="input" min={todayISO()} value={values.date}
              aria-invalid={errors.date ? true : undefined} onChange={(e) => set('date', e.target.value)} />
            <div className="chips chips-tight">
              {[['Hari ini', todayISO()], ['Besok', addDays(todayISO(), 1)], ['Sabtu ini', nextSaturday(todayISO())]].map(([l, d]) => (
                <button key={l} type="button" className={`chip chip-button${values.date === d ? ' is-active' : ''}`} onClick={() => set('date', d)}>{l}</button>
              ))}
            </div>
            {err('date')}
          </div>
          <ChoiceCards name="time" legend="Jam berapa?" columns={2} size="sm"
            options={[...TIME_PRESETS, { value: '__custom', label: 'Jam lain', icon: 'calendar' as const, hint: customTime ? values.startTime : undefined }]}
            value={customTime ? '__custom' : values.startTime}
            onChange={(v) => { if (v === '__custom') setCustomTime(true); else { setCustomTime(false); set('startTime', v); } }} />
          {customTime && (
            <div className="field">
              <label className="field-label" htmlFor="f-startTime">Jam mulai</label>
              <input id="f-startTime" type="time" className="input" step={900} value={values.startTime}
                onChange={(e) => set('startTime', e.target.value)} />
            </div>
          )}
          {err('startTime')}
          <fieldset className="choice-group">
            <legend className="choice-legend">Berapa lama?</legend>
            <div className="chips">
              {DURATION_OPTIONS.map((o) => (
                <label key={o.value} className={`chip${values.durationHours === o.value ? ' is-active' : ''}`}>
                  <input type="radio" name="duration" checked={values.durationHours === o.value} onChange={() => set('durationHours', o.value)} />
                  <span className="chip-label">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      );
      break;
    case 'mood':
      body = (
        <>
          <ChoiceCards name="vibe" legend="Vibes" hideLegend options={MOODS} value={values.vibe} onChange={(v) => set('vibe', v)} />
          <fieldset className="choice-group">
            <legend className="choice-legend">Tempatnya</legend>
            <div className="chips">
              {ENVIRONMENTS_UI.map((o) => (
                <label key={o.value} className={`chip${values.environment === o.value ? ' is-active' : ''}`}>
                  <input type="radio" name="environment" checked={values.environment === o.value} onChange={() => set('environment', o.value)} />
                  <span className="chip-label">{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      );
      break;
    case 'activities':
      body = (
        <>
          <MultiChoiceCards name="activities" legend="Aktivitas" hideLegend options={ACTIVITIES_UI} value={values.activities}
            onChange={(v) => set('activities', v)} />
          <p className="step-hint">Boleh pilih lebih dari satu ♡</p>
          {err('activities')}
        </>
      );
      break;
    case 'budget':
      body = (
        <>
          <ChoiceCards name="budget" legend="Budget" hideLegend
            options={[...BUDGET_PRESETS_UI.map((b) => ({ ...b, icon: 'wallet' as const })), { value: -1, label: 'Custom', icon: 'sliders' as const }]}
            value={customBudget ? -1 : values.budget}
            onChange={(v) => { if (v === -1) setCustomBudget(true); else { setCustomBudget(false); set('budget', v); } }} />
          {customBudget && (
            <div className="field">
              <label className="field-label" htmlFor="f-budget">Budget kamu</label>
              <CurrencyInput id="f-budget" value={values.budget} invalid={Boolean(errors.budget)} onChange={(v) => set('budget', v)} />
            </div>
          )}
          <p className="step-hint">Buat berdua · sekarang {formatIDR(values.budget)}</p>
          {err('budget')}
        </>
      );
      break;
    case 'transport':
      body = (
        <>
          <ChoiceCards<TransportGroup> name="transport" legend="Transportasi" hideLegend options={TRANSPORT_GROUPS} value={group}
            onChange={(g) => set('transportation', g === 'transum' ? (isPublicTransport(values.transportation) ? values.transportation : 'umum') : (g as Transportation))} />
          {group === 'transum' && (
            <fieldset className="choice-group">
              <legend className="choice-legend">Naik apa?</legend>
              <div className="chips">
                {TRANSIT_MODES.map((m) => (
                  <label key={m.value} className={`chip${values.transportation === m.value ? ' is-active' : ''}`}>
                    <input type="radio" name="transit-mode" checked={values.transportation === m.value} onChange={() => set('transportation', m.value)} />
                    <span className="chip-label">{m.label}</span>
                  </label>
                ))}
              </div>
              <p className="step-hint">Tempat dekat stasiun/halte didahulukan. Rute & tarif dicek di Google Maps.</p>
            </fieldset>
          )}
          {group === 'campuran' && <p className="step-hint">Tiap perpindahan bisa beda kendaraan, atur di hasil nanti.</p>}

          <button type="button" className="disclosure" aria-expanded={showExtras} onClick={() => setShowExtras((s) => !s)}>
            <Icon name={showExtras ? 'arrow-up' : 'plus'} size={16} /> Tambahan (opsional)
          </button>
          {showExtras && (
            <div className="extras">
              <div className="field">
                <label className="field-label" htmlFor="f-startLocation">Berangkat dari</label>
                <input id="f-startLocation" className="input" maxLength={160} placeholder="Misal: Stasiun Sudirman" value={values.startLocation ?? ''}
                  onChange={(e) => set('startLocation', e.target.value)} />
                {err('startLocation')}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="f-endLocation">Pulang ke</label>
                <input id="f-endLocation" className="input" maxLength={160} placeholder="Misal: rumah" value={values.endLocation ?? ''}
                  onChange={(e) => set('endLocation', e.target.value)} />
                {err('endLocation')}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="f-notes">Catatan</label>
                <textarea id="f-notes" className="input textarea" rows={2} maxLength={300} placeholder="Misal: dia vegetarian"
                  value={values.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>
          )}
        </>
      );
      break;
  }

  return (
    <div className="page wizard">
      <div className="wizard-top">
        <button type="button" className="icon-button" aria-label={step === 0 ? 'Tutup' : 'Kembali'}
          onClick={() => (step === 0 ? navigate(editing ? '/hasil' : '/') : back())}>
          <Icon name="chevron-left" size={22} />
        </button>
        <ol className="wizard-progress" aria-label="Langkah">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button type="button" className={i === step ? 'is-current' : i < step ? 'is-done' : ''}
                aria-label={`Langkah ${i + 1}: ${s.title}`} aria-current={i === step ? 'step' : undefined} onClick={() => jumpTo(i)} />
            </li>
          ))}
        </ol>
        <span className="wizard-count" aria-hidden="true">{step + 1}/{STEPS.length}</span>
      </div>

      <header className="wizard-head">
        <p className="eyebrow">{editing ? 'Atur ulang date' : 'Bikin date'} <span aria-hidden="true">♡</span></p>
        <h1 className="wizard-title" ref={headingRef} tabIndex={-1}>{STEPS[step].title}</h1>
      </header>

      <div className="wizard-body" key={step}>{body}</div>

      {blocking.length > 0 && (
        <div className="issue-list" role="alert">
          {blocking.map((issue) => (
            <p key={issue.code} className={`issue issue-${issue.severity}`}>
              {issue.message} {issue.code === 'NO_VENUES' && <Link to="/venue/baru" className="text-link">Tambah tempat</Link>}
            </p>
          ))}
        </div>
      )}

      <div className="wizard-actions">
        {step > 0 && (
          <button type="button" className="button button-ghost" onClick={back}>
            Kembali
          </button>
        )}
        {isLast ? (
          <button type="button" className="button button-primary button-grow" onClick={submit} disabled={noVenues}>
            <Icon name="heart" size={18} /> {editing ? 'Cari ide baru' : 'Cari ide date'}
          </button>
        ) : (
          <button type="button" className="button button-primary button-grow" onClick={next}>
            Lanjut <Icon name="chevron-right" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
