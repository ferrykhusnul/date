import type { Collection } from './schema';
import { clearStorageIssue, reportStorageIssue } from './issues';
import { quarantine, readEnvelope, removeKey, storageAvailable, writeEnvelope, type StorageKey } from './storage';

/**
 * Load/save helpers used by the state providers. They turn every storage
 * problem into a visible issue and make sure unreadable data is copied
 * aside before the app writes over it.
 */

/** Keys holding data from a newer app version: never written by this version. */
const locked = new Set<StorageKey>();

export function isLocked(key: StorageKey): boolean {
  return locked.has(key);
}

function handleReadError(key: StorageKey, label: string, kind: string, message: string) {
  if (kind === 'newer-version') {
    locked.add(key);
    reportStorageIssue({
      id: `read:${key}`,
      severity: 'error',
      message: `${label}: ${message} Perubahan ${label.toLowerCase()} tidak akan disimpan di versi ini.`,
    });
    return;
  }
  const copy = quarantine(key);
  // Only replace the unreadable value once a copy of it exists.
  if (copy) removeKey(key);
  reportStorageIssue({
    id: `read:${key}`,
    severity: 'warning',
    message: `Data "${label}" rusak dan tidak bisa dibaca (${message})${copy ? ` Salinan aslinya disimpan sebagai "${copy}".` : ''} Aplikasi memulai dengan data kosong untuk bagian ini.`,
  });
}

export function loadCollection<T>(key: StorageKey, parse: (x: unknown) => Collection<T>, label: string): T[] {
  const r = readEnvelope(key);
  if (r.status === 'empty') return [];
  if (r.status === 'error') {
    handleReadError(key, label, r.kind, r.message);
    return [];
  }
  const { items, dropped } = parse(r.data);
  if (dropped > 0) {
    const copy = quarantine(key);
    // Write the cleaned list back (once) so the next load doesn't copy it again.
    if (copy) writeEnvelope(key, items);
    reportStorageIssue({
      id: `read:${key}`,
      severity: 'warning',
      message: `${dropped} data ${label.toLowerCase()} tidak valid dan tidak dimuat.${copy ? ` Salinan aslinya disimpan sebagai "${copy}".` : ''}`,
    });
  }
  return items;
}

export function loadValue<T>(
  key: StorageKey,
  parse: (x: unknown) => { value: T; fixedFields: string[] },
  label: string,
  fallback: T,
): T {
  const r = readEnvelope(key);
  if (r.status === 'empty') return fallback;
  if (r.status === 'error') {
    handleReadError(key, label, r.kind, r.message);
    return fallback;
  }
  const { value, fixedFields } = parse(r.data);
  if (fixedFields.length) {
    reportStorageIssue({
      id: `read:${key}`,
      severity: 'info',
      message: `${label}: nilai tidak valid diganti bawaan (${fixedFields.join(', ')}).`,
    });
  }
  return value;
}

/** Writes data; returns false (and reports why) when it could not be saved. */
export function persist<T>(key: StorageKey, data: T, label: string): boolean {
  if (locked.has(key)) return false;
  if (!storageAvailable()) {
    reportStorageIssue({
      id: 'storage-unavailable',
      severity: 'error',
      message: 'Penyimpanan peramban tidak tersedia (misalnya mode privat atau diblokir). Data hanya bertahan sampai halaman ditutup.',
    });
    return false;
  }
  const w = writeEnvelope(key, data);
  if (!w.ok) {
    reportStorageIssue({
      id: `write:${key}`,
      severity: 'error',
      message:
        w.kind === 'quota'
          ? `${label} tidak tersimpan: penyimpanan peramban penuh. Ekspor cadangan lalu hapus data yang tidak diperlukan.`
          : `${label} tidak tersimpan: ${w.message}`,
    });
    return false;
  }
  clearStorageIssue(`write:${key}`);
  return true;
}
