import type { Option } from '../lib/options';

interface BaseProps<T extends string | number> {
  name: string;
  legend: string;
  options: Option<T>[];
  error?: string;
}

export function ChipGroup<T extends string | number>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: BaseProps<T> & { value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="field">
      <legend className="field-label">{legend}</legend>
      <div className="chips" role="radiogroup">
        {options.map((o) => (
          <label key={String(o.value)} className={`chip${value === o.value ? ' is-active' : ''}`}>
            <input
              type="radio"
              name={name}
              value={String(o.value)}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className="chip-label">{o.label}</span>
            {o.hint && <span className="chip-hint">{o.hint}</span>}
          </label>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}

export function MultiChipGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  hint,
}: BaseProps<T> & { value: T[]; onChange: (v: T[]) => void; hint?: string }) {
  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="field" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="field-label">{legend}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="chips">
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <label key={o.value} className={`chip${active ? ' is-active' : ''}`}>
              <input
                type="checkbox"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => toggle(o.value)}
              />
              <span className="chip-label">{o.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="field-error" id={`${name}-error`}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
