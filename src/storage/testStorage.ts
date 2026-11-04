/** In-memory localStorage for tests, with switches for quota and blocked storage. */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  quotaBytes = Infinity;
  blocked = false;

  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    if (this.blocked) throw new DOMException('blocked', 'SecurityError');
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    if (this.blocked) throw new DOMException('blocked', 'SecurityError');
    const used = [...this.map.entries()].filter(([key]) => key !== k).reduce((s, [a, b]) => s + a.length + b.length, 0);
    if (used + k.length + v.length > this.quotaBytes) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, String(v));
  }
}

export function installMemoryStorage(): MemoryStorage {
  const mem = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: mem };
  return mem;
}
