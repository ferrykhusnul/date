import type { BudgetSummary } from '../../engine/budget';
import { formatIDR } from '../../lib/format';
import type { DatePlan } from '../../types';

/** "Total kira-kira": one big number, a status, and details on demand. */
export function BudgetCard({ plan, budget }: { plan: DatePlan; budget: BudgetSummary }) {
  const pct = budget.utilization === null ? 100 : Math.min(100, budget.utilization);
  const status =
    budget.status === 'over' ? 'Kelewat budget' : budget.status === 'may-exceed' ? 'Bisa mepet budget' : 'Masih aman';

  return (
    <div className="budget-card">
      <p className="budget-label">Total kira-kira</p>
      <p className="cost-total">
        <strong>
          {formatIDR(budget.totalEstimate)}
          {!budget.complete && '*'}
        </strong>
        <span className={`budget-status is-${budget.status}`}>{status}</span>
      </p>
      <div className={`budget-meter is-${budget.status}`} role="meter" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(pct)} aria-label="Pemakaian budget">
        <span style={{ width: `${pct}%` }} />
      </div>
      <dl className="budget-figures">
        <div>
          <dt>Budget</dt>
          <dd>{formatIDR(budget.budget)}</dd>
        </div>
        <div>
          <dt>{budget.remaining < 0 ? 'Kelebihan' : 'Sisa'}</dt>
          <dd className={budget.remaining < 0 ? 'text-warn' : 'text-ok'}>{formatIDR(Math.abs(budget.remaining))}</dd>
        </div>
        <div>
          <dt>Terpakai</dt>
          <dd>{budget.utilization === null ? '—' : `${budget.utilization.toLocaleString('id-ID')}%`}</dd>
        </div>
      </dl>

      <details className="budget-details">
        <summary>Rincian biaya</summary>
        <ul className="cost-list">
          {plan.items.map((i) => (
            <li key={i.id}>
              <span>{i.title}</span>
              <span>{i.priceKnown ? formatIDR(i.costEstimate) : <em className="muted">belum tahu</em>}</span>
            </li>
          ))}
          <li>
            <span>
              Perjalanan ({plan.transport.legs.length}×{budget.unpricedLegs > 0 ? `, ${budget.unpricedLegs} transum` : ''})
            </span>
            <span>{formatIDR(budget.transportEstimate)}</span>
          </li>
        </ul>
        <p className="field-hint">
          Buat berdua · rentang {formatIDR(budget.totalMin)} – {formatIDR(budget.totalMax)}. Semua angka perkiraan.
          {budget.unpricedLegs > 0 && ' Tarif transum nggak dihitung — cek di Google Maps.'}
          {!budget.complete && ` * ${budget.unknownPriceCount} tempat belum ada harganya.`}
        </p>
      </details>
    </div>
  );
}
