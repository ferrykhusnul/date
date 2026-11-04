import type { ReactNode } from 'react';

/** Soft illustration + short text + actions. */
export function EmptyState({
  title,
  body,
  actions,
  headingLevel = 2,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
  /** 1 when the empty state is the whole page (e.g. 404). */
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="empty-state">
      <svg className="empty-illustration" viewBox="0 0 120 96" aria-hidden="true">
        <ellipse cx="60" cy="86" rx="38" ry="6" fill="#f5dde3" />
        <path d="M60 78s-30-17-30-38a16 16 0 0 1 30-8 16 16 0 0 1 30 8c0 21-30 38-30 38z" fill="#f5dde3" stroke="#c68fa2" strokeWidth="2.5" />
        <path d="M48 40a8 8 0 0 1 8-8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M98 18v8M94 22h8M22 30v6M19 33h6" stroke="#c68fa2" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <Heading className="empty-title">{title}</Heading>
      {body && <p>{body}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
