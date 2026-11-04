import type { ReactNode } from 'react';

/**
 * Opens an external URL in a new tab without giving the new page access to
 * this one (noopener) or leaking the referring URL (noreferrer).
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
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer external"
      referrerPolicy="no-referrer"
      className={className}
      aria-label={label ? `${label} (membuka tab baru)` : undefined}
    >
      {children}
    </a>
  );
}
