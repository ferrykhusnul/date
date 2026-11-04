import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PlanCard } from '../components/PlanCard';
import { greetingFor, todayISO } from '../lib/format';
import { planDisplayName, useAppState } from '../state/AppState';

export function Home() {
  const { savedPlans, draft } = useAppState();
  const now = new Date();
  // Most recently saved first.
  const bySaved = [...savedPlans].sort((a, b) => (b.savedAt ?? b.createdAt).localeCompare(a.savedAt ?? a.createdAt));
  const upcoming = bySaved.filter((p) => p.input.date >= todayISO());

  return (
    <div className="page page-home">
      <header className="home-head">
        <p className="home-greeting">{greetingFor(now)} <span aria-hidden="true">♡</span></p>
        <h1 className="hero-title">
          A Day With Us
          <span className="title-deco" aria-hidden="true">✦</span>
        </h1>
        <p className="home-tagline">Let&apos;s make some memories <span aria-hidden="true">♡</span></p>
      </header>

      <Link to="/buat" className="cta-card">
        <span className="cta-art" aria-hidden="true">
          <Icon name="heart" size={30} />
        </span>
        <span className="cta-text">
          <span className="cta-title">Bikin date</span>
          <span className="cta-sub">6 pertanyaan singkat, langsung dapet ide</span>
        </span>
        <span className="cta-go" aria-hidden="true">
          <Icon name="chevron-right" size={22} />
        </span>
      </Link>

      {draft && (
        <Link to="/hasil" className="draft-link">
          <Icon name="sparkle" size={16} /> Lanjutin: <strong>{planDisplayName(draft)}</strong>
        </Link>
      )}

      {savedPlans.length === 0 ? (
        <EmptyState
          title="Belum ada cerita nih ♡"
          body="Date yang kamu simpan bakal muncul di sini."
          actions={<Link to="/buat" className="button button-primary">Bikin date pertama</Link>}
        />
      ) : (
        <section className="section" aria-labelledby="home-dates">
          <div className="section-head">
            <h2 className="section-title" id="home-dates">Our little plans</h2>
            <Link to="/tersimpan" className="text-link">Lihat semua</Link>
          </div>
          <div className="card-scroller">
            {(upcoming.length ? upcoming : bySaved).slice(0, 8).map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
