import type { ReactNode } from 'react';

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-ornament" aria-hidden="true">
        ✦
      </div>
      <h2 className="empty-title">{title}</h2>
      <p>{body}</p>
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}
