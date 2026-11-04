import { useSyncExternalStore } from 'react';

/**
 * App-wide list of storage problems (corrupt data, full storage, blocked
 * storage) so any screen can show them. Kept in memory only.
 */

export interface StorageIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

let issues: StorageIssue[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Adds or replaces an issue with the same id. */
export function reportStorageIssue(issue: StorageIssue): void {
  issues = [...issues.filter((i) => i.id !== issue.id), issue];
  emit();
}

export function clearStorageIssue(id: string): void {
  if (!issues.some((i) => i.id === id)) return;
  issues = issues.filter((i) => i.id !== id);
  emit();
}

export function dismissAllStorageIssues(): void {
  issues = [];
  emit();
}

export function useStorageIssues(): StorageIssue[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => issues,
    () => issues,
  );
}
