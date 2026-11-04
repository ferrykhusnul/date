import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFound() {
  return (
    <div className="page page-narrow">
      <EmptyState
        title="Halaman tidak ditemukan"
        body="Alamat yang kamu buka tidak tersedia."
        actions={
          <Link to="/" className="button button-primary">
            Ke beranda
          </Link>
        }
      />
    </div>
  );
}
