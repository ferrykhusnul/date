import { Link } from 'react-router-dom';
import { getVenue } from '../data/sampleVenues';
import { formatDateShort, formatIDR } from '../lib/format';
import { planEndTime, planTotal } from '../lib/planGenerator';
import type { DatePlan } from '../types';
import { Icon } from './Icon';
import { SampleBadge } from './SampleBadge';

export function PlanCard({
  plan,
  variant = 'compact',
  onDelete,
}: {
  plan: DatePlan;
  variant?: 'compact' | 'preview';
  onDelete?: (id: string) => void;
}) {
  const total = planTotal(plan);
  const over = total > plan.input.budget;
  return (
    <article className={`plan-card plan-card--${variant}`}>
      <Link to={`/rencana/${plan.id}`} className="plan-card-link">
        <div className="plan-card-meta">
          <span>{formatDateShort(plan.input.date)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {plan.input.startTime}–{planEndTime(plan)}
          </span>
          <SampleBadge label="Sampel" />
        </div>
        <h3 className="plan-card-title">{plan.title}</h3>
        {variant === 'preview' && (
          <ol className="plan-card-stops">
            {plan.stops.map((s) => (
              <li key={s.id}>
                <span className="stop-time">{s.startTime}</span>
                <span>{getVenue(s.venueId)?.name ?? 'Venue sampel'}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="plan-card-foot">
          <span>
            {plan.stops.length} tempat · {plan.input.city}
          </span>
          <span className={over ? 'text-warn' : undefined}>{formatIDR(total)}</span>
        </div>
      </Link>
      {onDelete && (
        <button
          type="button"
          className="icon-button plan-card-delete"
          aria-label={`Hapus ${plan.title}`}
          onClick={() => onDelete(plan.id)}
        >
          <Icon name="trash" size={18} />
        </button>
      )}
      {!onDelete && (
        <span className="plan-card-arrow" aria-hidden="true">
          <Icon name="arrow-right" size={18} />
        </span>
      )}
    </article>
  );
}
