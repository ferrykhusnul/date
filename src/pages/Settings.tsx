import { useState, type FormEvent } from 'react';
import { CurrencyInput } from '../components/CurrencyInput';
import { PageHeader } from '../components/PageHeader';
import { CITY_SUGGESTIONS, TRANSPORT_OPTIONS } from '../lib/options';
import { DEFAULT_SETTINGS, useAppState } from '../state/AppState';
import type { Settings as SettingsType, Transportation } from '../types';

export function Settings() {
  const { settings, updateSettings, savedPlans, clearSavedPlans } = useAppState();
  const [values, setValues] = useState<SettingsType>(settings);
  const [status, setStatus] = useState<string>('');

  const dirty =
    values.defaultCity !== settings.defaultCity ||
    values.defaultBudget !== settings.defaultBudget ||
    values.defaultTransportation !== settings.defaultTransportation;
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
            <dt>Lokasi data</dt>
            <dd>Memori peramban (sesi ini saja)</dd>
          </div>
          <div>
            <dt>Rencana tersimpan</dt>
            <dd>{savedPlans.length} rencana</dd>
          </div>
          <div>
            <dt>Sumber venue</dt>
            <dd>Data sampel (bukan tempat nyata)</dd>
          </div>
        </dl>
        <p className="field-hint">
          Pada Fase 1, data belum disimpan permanen. Memuat ulang halaman akan menghapus pengaturan
          dan rencana tersimpan.
        </p>
        <button
          type="button"
          className="button button-danger-ghost"
          onClick={onClear}
          disabled={savedPlans.length === 0}
        >
          Hapus semua rencana
        </button>
      </section>
    </div>
  );
}
