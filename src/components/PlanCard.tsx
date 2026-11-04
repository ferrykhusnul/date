import { Link } from 'react-router-dom';
import { computeBudget } from '../engine/budget';
import { planEndTime } from '../engine/itinerary';
import { formatDateShort, formatIDR } from '../lib/format';
import { planDisplayName } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DatePlan } from '../types';
import { Icon } from './Icon';
import { SampleBadge } from './SampleBadge';

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PlanCard({
  plan,
  variant = 'compact',
  onDelete,
  onDuplicate,
  headingLevel = 3,
}: {
  /** 2 when the card sits directly under the page heading. */
  headingLevel?: 2 | 3;
  plan: DatePlan;
  variant?: 'compact' | 'preview';
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}) {
  const { getVenue } = useVenues();
  const budget = computeBudget(plan);
  const name = planDisplayName(plan);
  const hasActions = Boolean(onDelete || onDuplicate);

  return (
    <article className={`plan-card plan-card--${variant}`}>
      <Link to={`/rencana/${encodeURIComponent(plan.id)}`} className="plan-card-link">
        <div className="plan-card-meta">
          <span>{formatDateShort(plan.input.date)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {plan.input.startTime}–{planEndTime(plan)}
          </span>
          {plan.usesSampleVenues && <SampleBadge label="Venue sampel" />}
        </div>
        {headingLevel === 2 ? <h2 className="plan-card-title">{name}</h2> : <h3 className="plan-card-title">{name}</h3>}
        {plan.name && plan.name !== plan.title && <p className="muted small">{plan.title}</p>}
        {variant === 'preview' && (
          <ol className="plan-card-stops">
            {plan.items.map((s) => (
              <li key={s.id}>
                <span className="stop-time">{s.startTime}</span>
                <span>{(s.venueId && getVenue(s.venueId)?.name) || s.title}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="plan-card-foot">
          <span>
            {plan.items.length} aktivitas · {plan.input.city}
          </span>
          <span className={budget.status === 'over' ? 'text-warn' : undefined}>
            ± {formatIDR(budget.totalEstimate)}
            {!budget.complete && '*'}
          </span>
        </div>
        <p className="plan-card-dates">
          Dibuat {formatDateTimeShort(plan.createdAt)}
          {plan.editedAt && ` · diubah ${formatDateTimeShort(plan.editedAt)}`}
        </p>
      </Link>
      {hasActions ? (
        <div className="plan-card-actions">
          {onDuplicate && (
            <button type="button" className="icon-button" aria-label={`Duplikat ${name}`} title="Duplikat" onClick={() => onDuplicate(plan.id)}>
              <Icon name="copy" size={18} />
            </button>
          )}
          {onDelete && (
            <button type="button" className="icon-button" aria-label={`Hapus ${name}`} title="Hapus" onClick={() => onDelete(plan.id)}>
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      ) : (
        <span className="plan-card-arrow" aria-hidden="true">
          <Icon name="arrow-right" size={18} />
        </span>
      )}
    </article>
  );
}
