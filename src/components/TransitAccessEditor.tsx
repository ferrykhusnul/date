import { todayISO } from '../lib/format';
import { TRANSIT_TYPE_OPTIONS } from '../lib/options';
import { MAX_STATION_DISTANCE, MAX_TRANSIT_ROWS, MAX_WALKING_MINUTES, type VenueErrors } from '../lib/venueValidation';
import type { TransitType } from '../types';
import { Icon } from './Icon';

/** Form rows keep numbers as text so they can be left blank. */
export interface TransitRowForm {
  stationName: string;
  transitType: TransitType;
  distanceMeters: string;
  walkingMinutes: string;
  verifiedAt: string;
}

export const BLANK_TRANSIT_ROW: TransitRowForm = {
  stationName: '',
  transitType: 'transjakarta',
  distanceMeters: '',
  walkingMinutes: '',
  verifiedAt: '',
};

export function TransitAccessEditor({
  rows,
  onChange,
  errors,
}: {
  rows: TransitRowForm[];
  onChange: (rows: TransitRowForm[]) => void;
  errors?: VenueErrors['transitRows'];
}) {
  const update = (i: number, patch: Partial<TransitRowForm>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <fieldset className="field transit-editor">
      <legend className="field-label">
        Akses transportasi umum <span className="optional">(opsional)</span>
      </legend>
      <p className="field-hint">
        Isi hanya stasiun/halte yang sudah kamu cek. Jarak dan waktu jalan kaki baru ditampilkan setelah diberi tanggal
        verifikasi. Kosongkan bila belum tahu — venue tetap bisa dipakai.
      </p>

      {rows.map((row, i) => {
        const e = errors?.[i] ?? {};
        const id = (k: string) => `ta-${i}-${k}`;
        return (
          <div className="transit-editor-row" key={i}>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor={id('stationName')}>Stasiun / halte</label>
                <input id={id('stationName')} className="input" maxLength={80} value={row.stationName}
                  aria-invalid={e.stationName ? true : undefined}
                  onChange={(ev) => update(i, { stationName: ev.target.value })} />
                {e.stationName && <p className="field-error">{e.stationName}</p>}
              </div>
              <div className="field">
                <label className="field-label" htmlFor={id('transitType')}>Jenis</label>
                <select id={id('transitType')} className="input select" value={row.transitType}
                  onChange={(ev) => update(i, { transitType: ev.target.value as TransitType })}>
                  {TRANSIT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor={id('distanceMeters')}>Jarak (meter)</label>
                <input id={id('distanceMeters')} className="input" type="number" inputMode="numeric" min={0}
                  max={MAX_STATION_DISTANCE} value={row.distanceMeters} aria-invalid={e.distanceMeters ? true : undefined}
                  onChange={(ev) => update(i, { distanceMeters: ev.target.value })} />
                {e.distanceMeters && <p className="field-error">{e.distanceMeters}</p>}
              </div>
              <div className="field">
                <label className="field-label" htmlFor={id('walkingMinutes')}>Jalan kaki (menit)</label>
                <input id={id('walkingMinutes')} className="input" type="number" inputMode="numeric" min={0}
                  max={MAX_WALKING_MINUTES} value={row.walkingMinutes} aria-invalid={e.walkingMinutes ? true : undefined}
                  onChange={(ev) => update(i, { walkingMinutes: ev.target.value })} />
                {e.walkingMinutes && <p className="field-error">{e.walkingMinutes}</p>}
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor={id('verifiedAt')}>Diverifikasi pada</label>
              <div className="input-with-action">
                <input id={id('verifiedAt')} className="input" type="date" max={todayISO()} value={row.verifiedAt}
                  aria-invalid={e.verifiedAt ? true : undefined}
                  onChange={(ev) => update(i, { verifiedAt: ev.target.value })} />
                <button type="button" className="button button-ghost button-sm" onClick={() => update(i, { verifiedAt: todayISO() })}>
                  Hari ini
                </button>
              </div>
              {e.verifiedAt && <p className="field-error">{e.verifiedAt}</p>}
            </div>
            <button type="button" className="button button-danger-ghost button-sm" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              <Icon name="trash" size={16} /> Hapus stasiun
            </button>
          </div>
        );
      })}

      <button type="button" className="button button-ghost button-sm" disabled={rows.length >= MAX_TRANSIT_ROWS}
        onClick={() => onChange([...rows, BLANK_TRANSIT_ROW])}>
        <Icon name="plus" size={16} /> Tambah stasiun/halte
      </button>
    </fieldset>
  );
}
