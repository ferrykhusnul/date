import type { BudgetSummary } from '../../engine/budget';
import { formatIDR } from '../../lib/format';
import { TRANSPORT_OPTIONS, labelOf } from '../../lib/options';
import type { DatePlan } from '../../types';

export function BudgetCard({ plan, budget }: { plan: DatePlan; budget: BudgetSummary }) {
  const pct = budget.utilization === null ? 100 : Math.min(100, budget.utilization);
  const statusText =
    budget.status === 'over'
      ? 'Melebihi anggaran'
      : budget.status === 'may-exceed'
        ? 'Bisa melebihi anggaran di batas atas'
        : 'Masih dalam anggaran';

  return (
    <div className="budget-card">
      <h2 className="section-title">Perkiraan biaya</h2>
      <p className="muted small">Untuk berdua · semua angka adalah perkiraan</p>

      <ul className="cost-list">
        {plan.items.map((i) => (
          <li key={i.id}>
            <span>{i.title}</span>
            <span>
              {i.priceKnown ? formatIDR(i.costEstimate) : <em className="muted">harga belum diketahui</em>}
            </span>
          </li>
        ))}
        <li>
          <span>
            Transportasi antar tempat ({labelOf(TRANSPORT_OPTIONS, plan.transport.mode).toLowerCase()},{' '}
            {plan.transport.legs}× perpindahan)
          </span>
          <span>{formatIDR(budget.transportEstimate)}</span>
        </li>
      </ul>

      <div className="cost-total">
        <span>Total perkiraan</span>
        <strong>
          {formatIDR(budget.totalEstimate)}
          {!budget.complete && '*'}
        </strong>
      </div>
      <p className="muted small">
        Rentang: {formatIDR(budget.totalMin)} – {formatIDR(budget.totalMax)}
      </p>

      <div
        className={`budget-meter is-${budget.status}`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Penggunaan anggaran"
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className={`budget-status is-${budget.status}`}>{statusText}</p>

      <dl className="budget-figures">
        <div>
          <dt>Anggaran</dt>
          <dd>{formatIDR(budget.budget)}</dd>
        </div>
        <div>
          <dt>{budget.remaining < 0 ? 'Kelebihan' : 'Sisa anggaran'}</dt>
          <dd className={budget.remaining < 0 ? 'text-warn' : 'text-ok'}>{formatIDR(Math.abs(budget.remaining))}</dd>
        </div>
        <div>
          <dt>Pemakaian</dt>
          <dd>{budget.utilization === null ? '—' : `${budget.utilization.toLocaleString('id-ID')}%`}</dd>
        </div>
        <div>
          <dt>Total maksimum</dt>
          <dd>{formatIDR(budget.totalMax)}</dd>
        </div>
      </dl>
      {!budget.complete && (
        <p className="field-hint">
          * {budget.unknownPriceCount} aktivitas belum punya harga dan tidak dihitung. Isi biayanya lewat mode ubah bila
          sudah tahu.
        </p>
      )}
    </div>
  );
}
