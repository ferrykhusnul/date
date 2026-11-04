import type { ReactNode } from 'react';

export function SampleBadge({ label = 'Data sampel' }: { label?: string }) {
  return (
    <span className="sample-badge" title="Data ini hanya contoh dan bukan informasi venue nyata">
      {label}
    </span>
  );
}

export function SampleNotice({ children }: { children: ReactNode }) {
  return (
    <div className="sample-notice" role="note">
      <SampleBadge />
      <p>{children}</p>
    </div>
  );
}
