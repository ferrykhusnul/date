import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface Choice<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
  icon?: IconName;
  badge?: string;
}

interface Common<T extends string | number> {
  name: string;
  /** Accessible group name (the step question usually labels it visually). */
  legend: string;
  hideLegend?: boolean;
  options: Choice<T>[];
  columns?: 2 | 3;
  size?: 'md' | 'sm';
  footer?: ReactNode;
}

function Card<T extends string | number>({ name, o, checked, type, onChange, size }: {
  name: string;
  o: Choice<T>;
  checked: boolean;
  type: 'radio' | 'checkbox';
  onChange: () => void;
  size: 'md' | 'sm';
}) {
  return (
    <label className={`choice-card choice-card--${size}${checked ? ' is-selected' : ''}`}>
      <input type={type} name={name} value={String(o.value)} checked={checked} onChange={onChange} />
      {o.icon && (
        <span className="choice-icon">
          <Icon name={o.icon} size={size === 'sm' ? 20 : 24} />
        </span>
      )}
      <span className="choice-text">
        <span className="choice-label">{o.label}</span>
        {o.hint && <span className="choice-hint">{o.hint}</span>}
      </span>
      {o.badge && <span className="choice-badge">{o.badge}</span>}
      <span className="choice-check" aria-hidden="true">
        <Icon name="check" size={14} />
      </span>
    </label>
  );
}

/** Single choice as large tappable cards (native radios underneath). */
export function ChoiceCards<T extends string | number>({
  name, legend, hideLegend, options, value, onChange, columns = 2, size = 'md', footer,
}: Common<T> & { value: T; onChange: (v: T) => void }) {
  return (
    <fieldset className="choice-group">
      <legend className={hideLegend ? 'sr-only' : 'choice-legend'}>{legend}</legend>
      <div className={`choice-grid cols-${columns}`}>
        {options.map((o) => (
          <Card key={String(o.value)} name={name} o={o} checked={value === o.value} type="radio" size={size} onChange={() => onChange(o.value)} />
        ))}
      </div>
      {footer}
    </fieldset>
  );
}

/** Multiple choice as cards (native checkboxes underneath). */
export function MultiChoiceCards<T extends string>({
  name, legend, hideLegend, options, value, onChange, columns = 2, size = 'md', footer,
}: Common<T> & { value: T[]; onChange: (v: T[]) => void }) {
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="choice-group">
      <legend className={hideLegend ? 'sr-only' : 'choice-legend'}>{legend}</legend>
      <div className={`choice-grid cols-${columns}`}>
        {options.map((o) => (
          <Card key={o.value} name={name} o={o} checked={value.includes(o.value)} type="checkbox" size={size} onChange={() => toggle(o.value)} />
        ))}
      </div>
      {footer}
    </fieldset>
  );
}
