/**
 * Lightweight in-memory TTL cache for server-side API responses.
 * Prevents redundant external API calls for identical requests.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 500;

export class ApiCache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    // Evict expired entries when at capacity
    if (this.store.size >= this.maxEntries) {
      const now = Date.now();
      for (const [k, v] of this.store) {
        if (v.expiresAt <= now) this.store.delete(k);
        if (this.store.size < this.maxEntries) break;
      }
      // If still at capacity, evict oldest
      if (this.store.size >= this.maxEntries) {
        const oldest = this.store.keys().next().value;
        if (oldest !== undefined) this.store.delete(oldest);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}
