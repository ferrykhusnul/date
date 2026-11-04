import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export function NotFound() {
  return (
    <div className="page page-narrow">
      <EmptyState
        title="Halaman nggak ketemu"
        body="Kayaknya alamatnya salah deh."
        actions={
          <Link to="/" className="button button-primary">
            Ke beranda
          </Link>
        }
      />
    </div>
  );
}
