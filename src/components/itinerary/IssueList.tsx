import type { PlanIssue } from '../../types';

const ORDER = { error: 0, warning: 1, info: 2 } as const;
const LABEL = { error: 'Penting', warning: 'Perhatian', info: 'Info' } as const;

export function IssueList({ issues, title }: { issues: PlanIssue[]; title?: string }) {
  if (!issues.length) return null;
  const sorted = [...issues].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return (
    <div className="issue-list" role="status" aria-live="polite">
      {title && <p className="eyebrow">{title}</p>}
      {sorted.map((issue, i) => (
        <p key={`${issue.code}-${i}`} className={`issue issue-${issue.severity}`}>
          <span className="issue-label">{LABEL[issue.severity]}</span>
          {issue.message}
        </p>
      ))}
    </div>
  );
}
