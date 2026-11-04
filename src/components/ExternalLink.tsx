import type { ReactNode } from 'react';
import { useOnlineStatus } from '../pwa/useOnlineStatus';

/**
 * Opens an external URL in a new tab without giving the new page access to
 * this one (noopener) or leaking the referring URL (noreferrer).
 * `label` must START with the visible text (WCAG 2.5.3 Label in Name).
 */
export function ExternalLink({
  href,
  children,
  className,
  label,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  const online = useOnlineStatus();
  const suffix = online ? '(membuka tab baru)' : '(membuka tab baru, butuh internet — sedang offline)';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      referrerPolicy="no-referrer"
      className={`${className ?? ''}${online ? '' : ' is-offline'}`.trim() || undefined}
      aria-label={label ? `${label} ${suffix}` : undefined}
      title={online ? undefined : 'Butuh koneksi internet'}
    >
      {children}
    </a>
  );
}
