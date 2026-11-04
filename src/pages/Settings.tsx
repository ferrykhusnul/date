import { useState, type FormEvent } from 'react';
import { CurrencyInput } from '../components/CurrencyInput';
import { PageHeader } from '../components/PageHeader';
import { CITY_SUGGESTIONS, TRANSPORT_OPTIONS } from '../lib/options';
import { DEFAULT_SETTINGS, useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import { CURATED_VENUES } from '../data/venues';
import type { Settings as SettingsType, Transportation } from '../types';

export function Settings() {
  const { settings, updateSettings, savedPlans, clearSavedPlans } = useAppState();
  const { localVenues, realVenues, persistenceAvailable, clearLocal } = useVenues();
  const [values, setValues] = useState<SettingsType>(settings);
  const [status, setStatus] = useState<string>('');

  const dirty =
    values.defaultCity !== settings.defaultCity ||
    values.defaultBudget !== settings.defaultBudget ||
    values.defaultTransportation !== settings.defaultTransportation ||
    values.useSampleVenues !== settings.useSampleVenues;
  const valid = values.defaultCity.trim().length > 0 && values.defaultBudget >= 50_000;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateSettings({ ...values, defaultCity: values.defaultCity.trim() });
    setStatus('Pengaturan disimpan untuk sesi ini.');
  };

  const onReset = () => {
    setValues(DEFAULT_SETTINGS);
    setStatus('');
  };

  const onClear = () => {
    if (window.confirm('Hapus semua rencana tersimpan?')) {
      clearSavedPlans();
      setStatus('Semua rencana dihapus.');
    }
  };

  const onExport = () => {
    const json = JSON.stringify(realVenues, null, 2);
    const url = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `venues-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`${realVenues.length} venue diekspor.`);
  };

  const onClearVenues = () => {
    if (window.confirm(`Hapus ${localVenues.length} venue lokal dari perangkat ini? Tindakan ini tidak dapat dibatalkan.`)) {
      clearLocal();
      setStatus('Venue lokal dihapus.');
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader
        eyebrow="Preferensi"
        title="Pengaturan"
        lead="Nilai bawaan ini otomatis terisi saat kamu membuat rencana baru."
      />

      <form className="form" onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <div className="field">
            <label className="field-label" htmlFor="s-city">
              Kota bawaan
            </label>
            <input
              id="s-city"
              className="input"
              list="settings-city-suggestions"
              value={values.defaultCity}
              onChange={(e) => {
                setValues({ ...values, defaultCity: e.target.value });
                setStatus('');
              }}
            />
            <datalist id="settings-city-suggestions">
              {CITY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {!values.defaultCity.trim() && <p className="field-error">Kota wajib diisi.</p>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="s-budget">
              Anggaran bawaan (untuk berdua)
            </label>
            <CurrencyInput
              id="s-budget"
              value={values.defaultBudget}
              invalid={values.defaultBudget < 50_000}
              onChange={(v) => {
                setValues({ ...values, defaultBudget: v });
                setStatus('');
              }}
            />
            {values.defaultBudget < 50_000 && (
              <p className="field-error">Anggaran minimal Rp 50.000.</p>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="s-transport">
              Transportasi bawaan
            </label>
            <select
              id="s-transport"
              className="input select"
              value={values.defaultTransportation}
              onChange={(e) => {
                setValues({ ...values, defaultTransportation: e.target.value as Transportation });
                setStatus('');
              }}
            >
              {TRANSPORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={values.useSampleVenues}
              onChange={(e) => {
                setValues({ ...values, useSampleVenues: e.target.checked });
                setStatus('');
              }}
            />
            <span>
              Pakai venue sampel bila belum ada venue di kota tujuan
              <span className="field-hint block">Rencana dari venue sampel selalu diberi label "Venue sampel".</span>
            </span>
          </label>

          <div className="form-actions inline">
            <button type="submit" className="button button-primary" disabled={!dirty || !valid}>
              Simpan pengaturan
            </button>
            <button type="button" className="button button-ghost" onClick={onReset}>
              Kembalikan bawaan
            </button>
          </div>
          <p className="status" role="status" aria-live="polite">
            {status}
          </p>
        </section>
      </form>

      <section className="section storage-card">
        <h2 className="section-title">Penyimpanan</h2>
        <dl className="detail-list compact">
          <div>
            <dt>Rencana &amp; pengaturan</dt>
            <dd>Memori (hilang saat dimuat ulang)</dd>
          </div>
          <div>
            <dt>Rencana tersimpan</dt>
            <dd>{savedPlans.length} rencana</dd>
          </div>
          <div>
            <dt>Venue terkurasi (bawaan)</dt>
            <dd>{CURATED_VENUES.length} venue</dd>
          </div>
          <div>
            <dt>Venue lokal</dt>
            <dd>
              {localVenues.length} venue · {persistenceAvailable ? 'localStorage peramban' : 'tidak dapat disimpan'}
            </dd>
          </div>
        </dl>
        <p className="field-hint">
          Venue yang kamu tambah atau ubah tersimpan di peramban ini saja. Ekspor ke JSON untuk
          memindahkannya ke dataset terkurasi (<code>src/data/venues.ts</code>).
        </p>
        {!persistenceAvailable && (
          <p className="field-error">Penyimpanan peramban tidak tersedia; perubahan venue hanya bertahan sampai halaman dimuat ulang.</p>
        )}
        <div className="form-actions inline">
          <button type="button" className="button button-ghost" onClick={onExport} disabled={realVenues.length === 0}>
            Ekspor JSON
          </button>
          <button type="button" className="button button-danger-ghost" onClick={onClearVenues} disabled={localVenues.length === 0}>
            Hapus venue lokal
          </button>
          <button
            type="button"
            className="button button-danger-ghost"
            onClick={onClear}
            disabled={savedPlans.length === 0}
          >
            Hapus semua rencana
          </button>
        </div>
      </section>
    </div>
  );
}
