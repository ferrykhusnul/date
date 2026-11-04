import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

export function PageHeader({
  eyebrow,
  title,
  lead,
  back,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  back?: string | true;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button
          type="button"
          className="back-link"
          onClick={() => (back === true ? navigate(-1) : navigate(back))}
        >
          <Icon name="arrow-left" size={18} />
          Kembali
        </button>
      )}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {lead && <p className="page-lead">{lead}</p>}
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
