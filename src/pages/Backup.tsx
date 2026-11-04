import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { PrivacyNote } from '../components/PrivacyNote';
import { formatDateTimeShort } from '../components/PlanCard';
import {
  MAX_BACKUP_BYTES,
  backupFileName,
  buildBackup,
  downloadJson,
  parseBackup,
  planImport,
  serializeBackup,
  type ImportOptions,
  type ParsedBackup,
  type SectionSummary,
} from '../storage/backup';
import { clearSnapshot, readSnapshot, saveSnapshot, type Snapshot } from '../storage/snapshot';
import { useAppData } from '../state/useAppData';

type Step =
  | { kind: 'pick' }
  | { kind: 'preview'; fileName: string; backup: ParsedBackup; warnings: string[] }
  | { kind: 'done'; message: string; ok: boolean };

function describe(s: SectionSummary, noun: string): string[] {
  const out: string[] = [];
  if (s.added) out.push(`${s.added} ${noun} baru ditambahkan`);
  if (s.replaced) out.push(`${s.replaced} ${noun} diganti versi cadangan`);
  if (s.keptLocal) out.push(`${s.keptLocal} ${noun} bentrok — versi di perangkat dipertahankan`);
  if (s.identical) out.push(`${s.identical} ${noun} sudah sama`);
  if (s.removed) out.push(`${s.removed} ${noun} di perangkat akan dihapus`);
  return out;
}

export function Backup() {
  const { data, replaceAll } = useAppData();
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [error, setError] = useState('');
  const [opts, setOpts] = useState<ImportOptions>({ mode: 'merge', conflict: 'keep-local', includeSettings: false });
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloadedCurrent, setDownloadedCurrent] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(readSnapshot);
  const [exportStatus, setExportStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const preview = useMemo(
    () => (step.kind === 'preview' ? planImport(data, step.backup, opts) : null),
    [step, data, opts],
  );

  const exportAll = () => {
    downloadJson(serializeBackup(buildBackup(data)), backupFileName());
    setDownloadedCurrent(true);
    setExportStatus(`Cadangan diunduh: ${data.plans.length} rencana, ${data.venues.length} venue lokal, pengaturan dan preferensi.`);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    setError('');
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError('File terlalu besar untuk cadangan Date Planner (maksimal 5 MB).');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError('File tidak bisa dibaca.');
      return;
    }
    const r = parseBackup(text);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAcknowledged(false);
    // On an empty device, restoring settings too is what people expect.
    const emptyDevice = data.plans.length === 0 && data.venues.length === 0;
    setOpts({ mode: 'merge', conflict: 'keep-local', includeSettings: emptyDevice });
    setStep({ kind: 'preview', fileName: file.name, backup: r.backup, warnings: r.warnings });
  };

  const apply = () => {
    if (step.kind !== 'preview' || !preview) return;
    if (preview.destructive && !acknowledged) return;
    if (opts.mode === 'replace' && !window.confirm('Ganti SEMUA data di perangkat ini dengan isi cadangan?')) return;

    // Safety copy first. Without it, the user must have downloaded a backup of the current data.
    const snap = saveSnapshot(data, 'import');
    if (!snap.ok && !downloadedCurrent) {
      setError('Cadangan otomatis tidak bisa dibuat (penyimpanan penuh atau tidak tersedia). Unduh cadangan data saat ini terlebih dahulu, lalu coba lagi.');
      return;
    }
    const ok = replaceAll(preview.next);
    setSnapshot(snap.ok ? readSnapshot() : null);
    setStep({
      kind: 'done',
      ok,
      message: ok
        ? `Impor selesai: ${preview.next.plans.length} rencana dan ${preview.next.venues.length} venue lokal sekarang tersimpan di perangkat ini.`
        : 'Impor diterapkan, tetapi sebagian data tidak bisa disimpan ke peramban. Lihat peringatan penyimpanan dan ekspor cadangan sesegera mungkin.',
    });
  };

  const restoreSnapshot = () => {
    if (!snapshot) return;
    const when = formatDateTimeShort(snapshot.takenAt);
    if (!window.confirm(`Pulihkan data dari cadangan otomatis (${when})? Data saat ini akan disimpan sebagai cadangan otomatis baru, jadi langkah ini bisa dibatalkan lagi.`)) return;
    const current = data;
    const restoreData = snapshot.data;
    const saved = saveSnapshot(current, 'restore');
    if (!saved.ok && !downloadedCurrent) {
      setError('Data saat ini tidak bisa dicadangkan otomatis. Unduh cadangan data saat ini terlebih dahulu.');
      return;
    }
    const ok = replaceAll(restoreData);
    setSnapshot(saved.ok ? readSnapshot() : null);
    setStep({ kind: 'done', ok, message: ok ? 'Data sebelumnya berhasil dipulihkan.' : 'Pemulihan diterapkan, tetapi sebagian data tidak bisa disimpan.' });
  };

  const discardSnapshot = () => {
    if (!window.confirm('Hapus cadangan otomatis? Impor terakhir tidak bisa dibatalkan lagi.')) return;
    clearSnapshot();
    setSnapshot(null);
  };

  return (
    <div className="page page-narrow">
      <PageHeader back="/pengaturan" title="Cadangan"
        lead="Simpan semua date ke file, atau pulihkan dari file. Semuanya di perangkat ini aja." />

      <section className="section backup-card">
        <h2 className="section-title">Simpan ke file</h2>
        <p className="muted">
          {data.plans.length} rencana, {data.venues.length} venue lokal, pengaturan, dan preferensi akan disimpan ke satu file
          JSON. Draf yang belum disimpan tidak ikut.
        </p>
        <button type="button" className="button button-primary" onClick={exportAll}>
          <Icon name="download" size={18} /> Unduh cadangan
        </button>
        <p className="status" role="status" aria-live="polite">{exportStatus}</p>
      </section>

      <section className="section backup-card">
        <h2 className="section-title">Pulihkan dari file</h2>

        {step.kind === 'pick' && (
          <>
            <p className="muted">
              Pilih file cadangan Date Planner (.json). Isinya diperiksa dan ditampilkan dulu — tidak ada yang berubah sebelum
              kamu mengonfirmasi.
            </p>
            <input ref={fileInput} id="backup-file" type="file" accept="application/json,.json" className="sr-only" onChange={onFile} />
            <label htmlFor="backup-file" className="button button-ghost file-button">
              <Icon name="upload" size={18} /> Pilih file cadangan
            </label>
          </>
        )}

        {error && <p className="issue issue-error" role="alert">{error}</p>}

        {step.kind === 'preview' && preview && (
          <div className="import-preview">
            <dl className="detail-list compact">
              <div><dt>File</dt><dd>{step.fileName}</dd></div>
              <div><dt>Diekspor</dt><dd>{step.backup.exportedAt ? formatDateTimeShort(step.backup.exportedAt) : 'Tidak diketahui'}</dd></div>
              <div><dt>Isi cadangan</dt><dd>{step.backup.plans.length} rencana · {step.backup.venues.length} venue{step.backup.settings ? ' · pengaturan' : ''}{step.backup.preferences ? ' · preferensi' : ''}</dd></div>
              <div><dt>Data di perangkat</dt><dd>{data.plans.length} rencana · {data.venues.length} venue</dd></div>
            </dl>

            {step.warnings.length > 0 && (
              <div className="issue-list">
                {step.warnings.map((w) => <p key={w} className="issue issue-warning">{w}</p>)}
              </div>
            )}

            {step.backup.plans.length > 0 && (
              <details className="alternatives">
                <summary>Lihat rencana di cadangan ({step.backup.plans.length})</summary>
                <ul>
                  {step.backup.plans.map((p) => (
                    <li key={p.id}>
                      <strong>{p.name || p.title || p.input.city}</strong>
                      <span className="muted small"> · {p.input.date} · {p.items.length} aktivitas{data.plans.some((l) => l.id === p.id) ? ' · sudah ada di perangkat' : ''}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <fieldset className="field">
              <legend className="field-label">Cara impor</legend>
              <label className="choice">
                <input type="radio" name="mode" checked={opts.mode === 'merge'} onChange={() => { setOpts({ ...opts, mode: 'merge' }); setAcknowledged(false); }} />
                <span><strong>Gabungkan</strong> — tambahkan data dari cadangan, data di perangkat tetap ada.</span>
              </label>
              <label className="choice">
                <input type="radio" name="mode" checked={opts.mode === 'replace'} onChange={() => { setOpts({ ...opts, mode: 'replace' }); setAcknowledged(false); }} />
                <span><strong>Ganti semua</strong> — data di perangkat diganti seluruhnya dengan isi cadangan.</span>
              </label>
            </fieldset>

            {opts.mode === 'merge' && (
              <>
                <fieldset className="field">
                  <legend className="field-label">Jika data yang sama berbeda isinya</legend>
                  <label className="choice">
                    <input type="radio" name="conflict" checked={opts.conflict === 'keep-local'} onChange={() => { setOpts({ ...opts, conflict: 'keep-local' }); setAcknowledged(false); }} />
                    <span>Pertahankan versi di perangkat</span>
                  </label>
                  <label className="choice">
                    <input type="radio" name="conflict" checked={opts.conflict === 'use-backup'} onChange={() => { setOpts({ ...opts, conflict: 'use-backup' }); setAcknowledged(false); }} />
                    <span>Pakai versi dari cadangan</span>
                  </label>
                </fieldset>
                {(step.backup.settings || step.backup.preferences) && (
                  <label className="switch">
                    <input type="checkbox" checked={opts.includeSettings} onChange={(e) => { setOpts({ ...opts, includeSettings: e.target.checked }); setAcknowledged(false); }} />
                    <span>Juga pakai pengaturan dan preferensi dari cadangan</span>
                  </label>
                )}
              </>
            )}

            <div className="import-summary">
              <p className="eyebrow">Yang akan terjadi</p>
              <ul>
                {[...describe(preview.plans, 'rencana'), ...describe(preview.venues, 'venue')].map((l) => <li key={l}>{l}</li>)}
                {preview.settingsChanged && <li>Pengaturan diganti dengan versi cadangan</li>}
                {preview.preferencesChanged && <li>Preferensi diganti dengan versi cadangan</li>}
                {!preview.destructive && preview.plans.added + preview.venues.added === 0 && !preview.settingsChanged && <li>Tidak ada perubahan.</li>}
              </ul>
              <p className="result-after">Setelah impor: {preview.next.plans.length} rencana · {preview.next.venues.length} venue lokal.</p>
            </div>

            {preview.destructive && (
              <div className="destructive-confirm">
                <p className="issue issue-warning">
                  Impor ini akan mengganti atau menghapus data di perangkat. Cadangan otomatis dibuat sebelum impor sehingga bisa
                  dibatalkan, tetapi sebaiknya unduh juga cadangan data saat ini.
                </p>
                <button type="button" className="button button-ghost button-sm" onClick={exportAll}>
                  <Icon name="download" size={16} /> Unduh cadangan data saat ini
                </button>
                <label className="switch">
                  <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                  <span>Saya mengerti data di perangkat akan diganti atau dihapus seperti di atas.</span>
                </label>
              </div>
            )}

            <div className="form-actions inline">
              <button type="button" className="button button-primary" onClick={apply}
                disabled={(preview.destructive && !acknowledged) || (!preview.destructive && preview.plans.added + preview.venues.added === 0 && !preview.settingsChanged && !preview.preferencesChanged)}>
                {opts.mode === 'replace' ? 'Ganti semua data' : 'Gabungkan data'}
              </button>
              <button type="button" className="button button-ghost" onClick={() => { setStep({ kind: 'pick' }); setError(''); }}>Batal</button>
            </div>
          </div>
        )}

        {step.kind === 'done' && (
          <>
            <p className={`issue ${step.ok ? 'issue-info' : 'issue-error'}`} role="status">{step.message}</p>
            <div className="form-actions inline">
              <Link to="/tersimpan" className="button button-primary">Lihat date tersimpan</Link>
              <button type="button" className="button button-ghost" onClick={() => setStep({ kind: 'pick' })}>Impor file lain</button>
            </div>
          </>
        )}
      </section>

      {snapshot && (
        <section className="section backup-card">
          <h2 className="section-title">Cadangan otomatis</h2>
          <p className="muted">
            Dibuat {formatDateTimeShort(snapshot.takenAt)} sebelum {snapshot.reason === 'import' ? 'impor' : 'pemulihan'} terakhir:{' '}
            {snapshot.data.plans.length} rencana, {snapshot.data.venues.length} venue lokal.
          </p>
          <div className="form-actions inline">
            <button type="button" className="button button-ghost" onClick={restoreSnapshot}>Pulihkan data ini</button>
            <button type="button" className="button button-danger-ghost button-sm" onClick={discardSnapshot}>Hapus cadangan otomatis</button>
          </div>
        </section>
      )}

      <section className="section backup-card">
        <h2 className="section-title">Privasi</h2>
        <PrivacyNote />
      </section>
    </div>
  );
}
