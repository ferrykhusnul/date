import { formatThousands, parseIDR } from '../lib/format';

export function CurrencyInput({
  id,
  value,
  onChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className={`currency-input${invalid ? ' is-invalid' : ''}`}>
      <span className="currency-prefix">Rp</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={formatThousands(value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(Math.min(parseIDR(e.target.value), 1_000_000_000))}
      />
    </div>
  );
}
