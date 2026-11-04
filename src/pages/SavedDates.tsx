import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { PlanCard } from '../components/PlanCard';
import { useAppState } from '../state/AppState';

export function SavedDates() {
  const { savedPlans, deletePlan, loadSamplePlans } = useAppState();

  const onDelete = (id: string) => {
    const plan = savedPlans.find((p) => p.id === id);
    if (plan && window.confirm(`Hapus rencana "${plan.title}"?`)) deletePlan(id);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Koleksi"
        title="Rencana tersimpan"
        lead={
          savedPlans.length
            ? `${savedPlans.length} rencana. Ketuk untuk melihat detail lengkap.`
            : undefined
        }
      />

      {savedPlans.length === 0 ? (
        <EmptyState
          title="Belum ada yang disimpan"
          body="Simpan rencana dari halaman hasil agar mudah dibuka kembali."
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
      ) : (
        <div className="saved-grid">
          {savedPlans.map((p) => (
            <PlanCard key={p.id} plan={p} variant="preview" onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
