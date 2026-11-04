import { formatIDR } from '../lib/format';

/** Always labelled as an estimate: prices are never quoted as facts. */
export function priceRangeText(min: number, max: number): string {
  if (max === 0) return 'Gratis';
  if (min === max) return formatIDR(min);
  return `${min === 0 ? 'Gratis' : formatIDR(min)} – ${formatIDR(max)}`;
}

export function PriceEstimate({ min, max }: { min: number; max: number }) {
  return (
    <span className="price-estimate">
      <span className="price-estimate-label">Perkiraan</span> {priceRangeText(min, max)}
      <span className="price-estimate-unit"> /orang</span>
    </span>
  );
}
