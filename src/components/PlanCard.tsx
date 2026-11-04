import { Link } from 'react-router-dom';
import { computeBudget } from '../engine/budget';
import { formatDateShort } from '../lib/format';
import { moodOf, shortIDR } from '../lib/uiLabels';
import { planDisplayName } from '../state/AppState';
import { useVenues } from '../state/VenueStore';
import type { DatePlan } from '../types';
import { Icon } from './Icon';
import { SampleBadge } from './SampleBadge';
import { VenueArt } from './VenueArt';

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Visual date card: picture, date, title, mood. Details live on the date page. */
export function PlanCard({
  plan,
  variant = 'compact',
  onDelete,
  onDuplicate,
  headingLevel = 3,
  showCreated = false,
}: {
  plan: DatePlan;
  /** 'preview' = larger card, 'compact' = carousel card. */
  variant?: 'compact' | 'preview';
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  /** 2 when the card sits directly under the page heading. */
  headingLevel?: 2 | 3;
  showCreated?: boolean;
}) {
  const { getVenue } = useVenues();
  const budget = computeBudget(plan);
  const name = planDisplayName(plan);
  const mood = moodOf(plan.input.vibe);
  const first = plan.items.find((i) => i.venueId);
  const category = first?.venueId ? getVenue(first.venueId)?.category : undefined;
  const Title = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <article className={`plan-card plan-card--${variant}`}>
      <Link to={`/rencana/${encodeURIComponent(plan.id)}`} className="plan-card-link">
        <div className="plan-card-art">
          <VenueArt category={category} size={variant === 'preview' ? 'lg' : 'md'} />
          <span className="date-chip">{formatDateShort(plan.input.date)}</span>
        </div>
        <div className="plan-card-body">
          <Title className="plan-card-title">{name}</Title>
          <div className="pill-row">
            <span className="pill pill-mood"><Icon name={mood.icon} size={13} /> {mood.label}</span>
            <span className="pill">{plan.items.length} tempat</span>
            <span className={`pill${budget.status === 'over' ? ' pill-warn' : ''}`}>± {shortIDR(budget.totalEstimate)}</span>
            {plan.usesSampleVenues && <SampleBadge label="Contoh" />}
          </div>
          {showCreated && (
            <p className="plan-card-dates">
              Dibuat {formatDateTimeShort(plan.createdAt)}
              {plan.editedAt && ` · diubah ${formatDateTimeShort(plan.editedAt)}`}
            </p>
          )}
        </div>
      </Link>
      {(onDelete || onDuplicate) && (
        <div className="plan-card-actions">
          {onDuplicate && (
            <button type="button" className="icon-button soft" aria-label={`Duplikat ${name}`} title="Duplikat" onClick={() => onDuplicate(plan.id)}>
              <Icon name="copy" size={18} />
            </button>
          )}
          {onDelete && (
            <button type="button" className="icon-button soft" aria-label={`Hapus ${name}`} title="Hapus" onClick={() => onDelete(plan.id)}>
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
