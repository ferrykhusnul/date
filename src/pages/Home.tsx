import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PlanCard } from '../components/PlanCard';
import { formatDateLong, greetingFor, todayISO } from '../lib/format';
import { planDisplayName, useAppState } from '../state/AppState';

export function Home() {
  const { savedPlans, draft, loadSamplePlans } = useAppState();
  const now = new Date();
  // Most recently saved first.
  const bySaved = [...savedPlans].sort((a, b) => (b.savedAt ?? b.createdAt).localeCompare(a.savedAt ?? a.createdAt));
  const [featured, ...rest] = bySaved;

  return (
    <div className="page page-home">
      <header className="hero">
        <p className="eyebrow">{formatDateLong(todayISO())}</p>
        <h1 className="hero-title">
          {greetingFor(now)}.
          <br />
          <em>Mau ke mana kalian hari ini?</em>
        </h1>
        <p className="page-lead">
          Susun rencana kencan yang rapi — dari kopi pertama sampai perjalanan pulang — dalam
          beberapa langkah.
        </p>
        <Link to="/buat" className="button button-primary button-lg">
          <Icon name="plus" />
          Buat Rencana Kencan
        </Link>
        {draft && (
          <Link to="/hasil" className="draft-link">
            Lanjutkan draf: <strong>{planDisplayName(draft)}</strong>
            <Icon name="arrow-right" size={16} />
          </Link>
        )}
      </header>

      {savedPlans.length === 0 ? (
        <section className="section">
          <EmptyState
            title="Belum ada rencana tersimpan"
            body="Rencana yang kamu simpan akan muncul di sini. Mulai dengan membuat rencana baru, atau muat contoh untuk melihat tampilannya."
            actions={
              <>
                <Link to="/buat" className="button button-primary">
                  Buat rencana
                </Link>
                <button type="button" className="button button-ghost" onClick={loadSamplePlans}>
                  Muat contoh rencana
                </button>
              </>
            }
          />
        </section>
      ) : (
        <div className="home-grid">
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">Terakhir disimpan</h2>
            </div>
            <PlanCard plan={featured} variant="preview" />
          </section>

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">Rencana terbaru</h2>
              <Link to="/tersimpan" className="text-link">
                Lihat semua
              </Link>
            </div>
            {rest.length ? (
              <div className="stack">
                {rest.slice(0, 3).map((p) => (
                  <PlanCard key={p.id} plan={p} />
                ))}
              </div>
            ) : (
              <p className="muted">Belum ada rencana lain. Rencana baru akan muncul di sini.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
