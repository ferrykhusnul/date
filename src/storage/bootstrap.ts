import { reportStorageIssue } from './issues';
import { migrateLegacyKeys } from './migrations';
import { storageAvailable } from './storage';

/** Runs once before the first render. */
export function bootstrapStorage(): void {
  if (!storageAvailable()) {
    reportStorageIssue({
      id: 'storage-unavailable',
      severity: 'error',
      message: 'Penyimpanan peramban tidak tersedia (misalnya mode privat atau diblokir). Data hanya bertahan sampai halaman ditutup.',
    });
    return;
  }
  const report = migrateLegacyKeys();
  if (report.failed.length) {
    reportStorageIssue({
      id: 'legacy-migration',
      severity: 'warning',
      message: 'Data venue dari versi sebelumnya tidak bisa dipindahkan otomatis. Data lama dibiarkan apa adanya.',
    });
  }
}
