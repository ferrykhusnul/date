import { useState, type FormEvent } from 'react';
import { CurrencyInput } from '../CurrencyInput';
import { Icon } from '../Icon';
import type { CustomActivityInput } from '../../engine/itinerary';

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function AddCustomActivity({ onAdd }: { onAdd: (input: CustomActivityInput) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Nama aktivitas wajib diisi.');
      document.getElementById('ca-title')?.focus();
      return;
    }
    onAdd({ title, durationMinutes: duration, cost, note });
    setTitle('');
    setDuration(30);
    setCost(0);
    setNote('');
    setError('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="button button-ghost button-block" onClick={() => setOpen(true)}>
        <Icon name="plus" size={18} /> Tambah aktivitas bebas
      </button>
    );
  }

  return (
    <form className="custom-form" onSubmit={submit} noValidate>
      <p className="eyebrow">Aktivitas bebas</p>
      <div className="field">
        <label className="field-label" htmlFor="ca-title">Nama aktivitas</label>
        <input id="ca-title" className="input" maxLength={80} placeholder="Misalnya: foto di photobox"
          value={title} aria-invalid={error ? true : undefined}
          onChange={(e) => { setTitle(e.target.value); setError(''); }} />
        {error && <p className="field-error">{error}</p>}
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field-label" htmlFor="ca-duration">Durasi</label>
          <select id="ca-duration" className="input select" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} menit</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ca-cost">Biaya berdua</label>
          <CurrencyInput id="ca-cost" value={cost} onChange={setCost} />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="ca-note">Catatan <span className="optional">(opsional)</span></label>
        <input id="ca-note" className="input" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="form-actions inline">
        <button type="submit" className="button button-primary">Tambahkan</button>
        <button type="button" className="button button-ghost" onClick={() => { setOpen(false); setError(''); }}>Batal</button>
      </div>
    </form>
  );
}
