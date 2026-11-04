import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChipGroup, MultiChipGroup } from '../components/ChipGroup';
import { CurrencyInput } from '../components/CurrencyInput';
import { AppInstallCard } from '../components/AppInstallCard';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PrivacyNote } from '../components/PrivacyNote';
import { CURATED_VENUES } from '../data/venues';
import {
  ACTIVITY_OPTIONS,
  CITY_SUGGESTIONS,
  DURATION_OPTIONS,
  ENVIRONMENT_OPTIONS,
  TRANSPORT_OPTIONS,
  VIBE_OPTIONS,
} from '../lib/options';
import { downloadJson } from '../storage/backup';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from '../storage/defaults';
import { quarantinedKeys, readRaw, removeKey, storageAvailable, usageBytes } from '../storage/storage';
import { useAppState } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { Activity, Preferences, Settings as SettingsType, Transportation } from '../types';

type PersistState = 'unsupported' | 'granted' | 'not-granted' | 'unknown';

function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function Settings() {
  const { settings, updateSettings, preferences, updatePreferences, savedPlans, clearSavedPlans } = useAppState();
  const { localVenues, realVenues, persistenceAvailable, clearLocal } = useVenues();
  const [values, setValues] = useState<SettingsType>(settings);
  const [prefs, setPrefs] = useState<Preferences>(preferences);
  const [status, setStatus] = useState('');
  const [prefStatus, setPrefStatus] = useState('');
  const [dataStatus, setDataStatus] = useState('');
  const [persistState, setPersistState] = useState<PersistState>('unknown');
  const [quarantined, setQuarantined] = useState<string[]>(quarantinedKeys);
  const [usage, setUsage] = useState(usageBytes);

  // Refresh when data changes elsewhere (e.g. another tab or an import).
  useEffect(() => setValues(settings), [settings]);
  useEffect(() => setPrefs(preferences), [preferences]);
  useEffect(() => setUsage(usageBytes()), [savedPlans, localVenues, settings, preferences, quarantined]);

  useEffect(() => {
    const s = navigator.storage;
    if (!s?.persisted) {
      setPersistState('unsupported');
      return;
    }
    s.persisted().then((p) => setPersistState(p ? 'granted' : 'not-granted')).catch(() => setPersistState('unsupported'));
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(settings);
  const valid = values.defaultCity.trim().length > 0 && values.defaultBudget >= 50_000;
  const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(preferences);
  const prefsValid = prefs.activities.length > 0 && /^\d{2}:\d{2}$/.test(prefs.startTime);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateSettings({ ...values, defaultCity: values.defaultCity.trim() });
    setStatus(persistenceAvailable ? 'Pengaturan disimpan di perangkat ini.' : 'Pengaturan dipakai sampai halaman ditutup (penyimpanan tidak tersedia).');
  };

  const onPrefsSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prefsValid) return;
    updatePreferences(prefs);
    setPrefStatus('Preferensi disimpan. Formulir rencana baru akan memakai nilai ini.');
  };

  const onRequestPersist = async () => {
    try {
      const granted = await navigator.storage.persist();
      setPersistState(granted ? 'granted' : 'not-granted');
      setDataStatus(granted ? 'Peramban setuju menyimpan data secara persisten.' : 'Peramban tidak memberi izin penyimpanan persisten. Tetap ekspor cadangan secara berkala.');
    } catch {
      setDataStatus('Permintaan penyimpanan persisten gagal.');
    }
  };

  const onExportVenues = () => {
    downloadJson(JSON.stringify(realVenues, null, 2) + '\n', `venues-${new Date().toISOString().slice(0, 10)}.json`);
    setDataStatus(`${realVenues.length} venue diekspor.`);
  };

  const onClearPlans = () => {
    if (window.confirm(`Hapus ${savedPlans.length} rencana tersimpan dari perangkat ini? Tindakan ini tidak dapat dibatalkan. Ekspor cadangan dulu bila ragu.`)) {
      clearSavedPlans();
      setDataStatus('Semua rencana dihapus.');
    }
  };

  const onClearVenues = () => {
    if (window.confirm(`Hapus ${localVenues.length} venue lokal dari perangkat ini? Tindakan ini tidak dapat dibatalkan. Ekspor cadangan dulu bila ragu.`)) {
      clearLocal();
      setDataStatus('Venue lokal dihapus.');
    }
  };

  const downloadQuarantined = (key: string) => {
    const raw = readRaw(key);
    if (raw !== null) downloadJson(raw, `${key}.json`);
  };
  const deleteQuarantined = (key: string) => {
    if (!window.confirm('Hapus salinan data rusak ini? Isinya tidak bisa dipulihkan lagi.')) return;
    removeKey(key);
    setQuarantined(quarantinedKeys());
  };

  return (
    <div className="page page-narrow">
      <PageHeader eyebrow="Preferensi" title="Pengaturan" lead="Nilai bawaan untuk rencana baru, serta data di perangkat ini." />

      <form className="form" onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <h2 className="form-section-title"><span className="step">01</span> Pengaturan umum</h2>
          <div className="field">
            <label className="field-label" htmlFor="s-city">Kota bawaan</label>
            <input id="s-city" className="input" list="settings-city-suggestions" value={values.defaultCity}
              onChange={(e) => { setValues({ ...values, defaultCity: e.target.value }); setStatus(''); }} />
            <datalist id="settings-city-suggestions">{CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            {!values.defaultCity.trim() && <p className="field-error">Kota wajib diisi.</p>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="s-budget">Anggaran bawaan (untuk berdua)</label>
            <CurrencyInput id="s-budget" value={values.defaultBudget} invalid={values.defaultBudget < 50_000}
              onChange={(v) => { setValues({ ...values, defaultBudget: v }); setStatus(''); }} />
            {values.defaultBudget < 50_000 && <p className="field-error">Anggaran minimal Rp 50.000.</p>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="s-transport">Transportasi bawaan</label>
            <select id="s-transport" className="input select" value={values.defaultTransportation}
              onChange={(e) => { setValues({ ...values, defaultTransportation: e.target.value as Transportation }); setStatus(''); }}>
              {TRANSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <label className="switch">
            <input type="checkbox" checked={values.useSampleVenues}
              onChange={(e) => { setValues({ ...values, useSampleVenues: e.target.checked }); setStatus(''); }} />
            <span>
              Pakai venue sampel bila belum ada venue di kota tujuan
              <span className="field-hint block">Rencana dari venue sampel selalu diberi label "Venue sampel".</span>
            </span>
          </label>
          <div className="form-actions inline">
            <button type="submit" className="button button-primary" disabled={!dirty || !valid}>Simpan pengaturan</button>
            <button type="button" className="button button-ghost" onClick={() => { setValues(DEFAULT_SETTINGS); setStatus(''); }}>Kembalikan bawaan</button>
          </div>
          <p className="status" role="status" aria-live="polite">{status}</p>
        </section>
      </form>

      <form className="form" onSubmit={onPrefsSubmit} noValidate>
        <section className="form-section">
          <h2 className="form-section-title"><span className="step">02</span> Preferensi rencana</h2>
          <p className="field-hint">Isian awal formulir "Buat Kencan".</p>
          <ChipGroup name="p-vibe" legend="Vibe" options={VIBE_OPTIONS} value={prefs.vibe}
            onChange={(v) => { setPrefs({ ...prefs, vibe: v }); setPrefStatus(''); }} />
          <MultiChipGroup<Activity> name="p-act" legend="Aktivitas" options={ACTIVITY_OPTIONS} value={prefs.activities}
            error={prefs.activities.length ? undefined : 'Pilih minimal satu aktivitas.'}
            onChange={(v) => { setPrefs({ ...prefs, activities: v }); setPrefStatus(''); }} />
          <ChipGroup name="p-env" legend="Lingkungan" options={ENVIRONMENT_OPTIONS} value={prefs.environment}
            onChange={(v) => { setPrefs({ ...prefs, environment: v }); setPrefStatus(''); }} />
          <ChipGroup name="p-dur" legend="Durasi" options={DURATION_OPTIONS} value={prefs.durationHours}
            onChange={(v) => { setPrefs({ ...prefs, durationHours: v }); setPrefStatus(''); }} />
          <div className="field">
            <label className="field-label" htmlFor="p-start">Jam mulai</label>
            <input id="p-start" className="input" type="time" step={900} value={prefs.startTime}
              onChange={(e) => { setPrefs({ ...prefs, startTime: e.target.value }); setPrefStatus(''); }} />
          </div>
          <div className="form-actions inline">
            <button type="submit" className="button button-primary" disabled={!prefsDirty || !prefsValid}>Simpan preferensi</button>
            <button type="button" className="button button-ghost" onClick={() => { setPrefs(DEFAULT_PREFERENCES); setPrefStatus(''); }}>Kembalikan bawaan</button>
          </div>
          <p className="status" role="status" aria-live="polite">{prefStatus}</p>
        </section>
      </form>

      <AppInstallCard />

      <section className="section storage-card" id="data">
        <h2 className="section-title"><Icon name="shield" size={20} /> Data &amp; privasi</h2>
        <PrivacyNote />

        <dl className="detail-list compact">
          <div><dt>Lokasi data</dt><dd>{storageAvailable() ? 'localStorage peramban ini' : 'Memori saja (penyimpanan tidak tersedia)'}</dd></div>
          <div><dt>Rencana tersimpan</dt><dd>{savedPlans.length} rencana</dd></div>
          <div><dt>Venue lokal</dt><dd>{localVenues.length} venue</dd></div>
          <div><dt>Venue terkurasi (bawaan)</dt><dd>{CURATED_VENUES.length} venue</dd></div>
          <div><dt>Ruang terpakai</dt><dd>± {formatBytes(usage)}</dd></div>
          <div>
            <dt>Penyimpanan persisten</dt>
            <dd>{{ granted: 'Diizinkan', 'not-granted': 'Belum diizinkan', unsupported: 'Tidak didukung peramban', unknown: '…' }[persistState]}</dd>
          </div>
        </dl>

        <div className="form-actions inline">
          <Link to="/cadangan" className="button button-primary"><Icon name="download" size={18} /> Cadangan &amp; impor</Link>
          {persistState === 'not-granted' && (
            <button type="button" className="button button-ghost" onClick={onRequestPersist}>Minta penyimpanan persisten</button>
          )}
          <button type="button" className="button button-ghost" onClick={onExportVenues} disabled={realVenues.length === 0}>Ekspor venue (JSON)</button>
        </div>
        <p className="field-hint">
          "Ekspor venue" menghasilkan daftar venue saja, untuk disalin ke dataset terkurasi (<code>src/data/venues.ts</code>).
          Untuk mencadangkan semua data, pakai "Cadangan &amp; impor".
        </p>

        {quarantined.length > 0 && (
          <div className="quarantine">
            <p className="eyebrow">Salinan data rusak ({quarantined.length})</p>
            <p className="field-hint">Data yang tidak bisa dibaca disimpan di sini agar tidak hilang diam-diam.</p>
            <ul>
              {quarantined.map((k) => (
                <li key={k}>
                  <code>{k}</code>
                  <span className="quarantine-actions">
                    <button type="button" className="button button-ghost button-sm" onClick={() => downloadQuarantined(k)}>Unduh</button>
                    <button type="button" className="button button-danger-ghost button-sm" onClick={() => deleteQuarantined(k)}>Hapus</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="danger-zone">
          <p className="eyebrow">Hapus data</p>
          <div className="form-actions inline">
            <button type="button" className="button button-danger-ghost" onClick={onClearPlans} disabled={savedPlans.length === 0}>Hapus semua rencana</button>
            <button type="button" className="button button-danger-ghost" onClick={onClearVenues} disabled={localVenues.length === 0}>Hapus venue lokal</button>
          </div>
        </div>
        <p className="status" role="status" aria-live="polite">{dataStatus}</p>
      </section>
    </div>
  );
}
