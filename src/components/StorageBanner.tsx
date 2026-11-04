import { Link } from 'react-router-dom';
import { clearStorageIssue, useStorageIssues } from '../storage/issues';

/** Shows storage problems (corrupt data, full or blocked storage) on every screen. */
export function StorageBanner() {
  const issues = useStorageIssues();
  if (!issues.length) return null;
  return (
    <div className="storage-banner" role="alert">
      {issues.map((i) => (
        <div key={i.id} className={`issue issue-${i.severity}`}>
          <span>{i.message}</span>
          <span className="storage-banner-actions">
            <Link to="/pengaturan#data" className="text-link">Data &amp; privasi</Link>
            <button type="button" className="text-link" onClick={() => clearStorageIssue(i.id)}>Tutup</button>
          </span>
        </div>
      ))}
    </div>
  );
}
