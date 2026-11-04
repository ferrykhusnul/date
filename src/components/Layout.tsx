import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Icon, type IconName } from './Icon';
import { OfflineBanner } from './OfflineBanner';
import { PwaStatus } from './PwaStatus';
import { StorageBanner } from './StorageBanner';

const NAV_ITEMS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Beranda', icon: 'home', end: true },
  { to: '/buat', label: 'Buat', icon: 'plus' },
  { to: '/tersimpan', label: 'Tersimpan', icon: 'bookmark' },
  { to: '/venue', label: 'Venue', icon: 'store' },
  { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
];

export function Layout() {
  const { pathname, hash } = useLocation();

  // New page: start at the top, or at the #section the link points to.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <div className="brand">
          <span className="brand-mark">D</span>
          <span className="brand-name">Date Planner</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="sidebar-link">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="sidebar-note">Data tersimpan di perangkat ini saja. Harga venue selalu berupa perkiraan.</p>
      </aside>

      <main className="main" id="konten">
        <OfflineBanner />
        <StorageBanner />
        <Outlet />
      </main>

      <PwaStatus />

      <nav className="bottom-nav" aria-label="Navigasi utama">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="bottom-link">
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
