import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { MobilePlatformService } from './mobile-platform.service';
import { StorageService } from '@app/infrastructure';

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  body?: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

export interface OfflineCache {
  key: string;
  data: unknown;
  cachedAt: number;
  ttlMs: number;
}

const QUEUE_KEY = 'offline_request_queue';
const IDB_NAME = 'agrc_offline';
const IDB_STORE = 'offline_cache';
const IDB_VERSION = 1;
const MAX_RETRIES = 5;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB total cap

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private http = inject(HttpClient);
  private mobilePlatform = inject(MobilePlatformService);
  private _storage = inject(StorageService);

  readonly queue = signal<QueuedRequest[]>(this.loadQueue());
  readonly queueLength = computed(() => this.queue().length);
  readonly syncing = signal<boolean>(false);

  private cache: Map<string, OfflineCache> = new Map();
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.openIndexedDB();
  }

  // ─── Queue management ────────────────────────────────────────────────────

  enqueue(method: string, url: string, body?: Record<string, unknown>): string {
    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      method,
      url,
      body,
      timestamp: new Date().toISOString(),
      retries: 0,
    };
    this.queue.update(q => [...q, request]);
    this.persistQueue();
    return request.id;
  }

  async flush(): Promise<void> {
    if (!this.mobilePlatform.isOnline() || this.syncing() || !this.queue().length) return;
    this.syncing.set(true);

    const toProcess = [...this.queue()];
    for (const req of toProcess) {
      try {
        await this.executeRequest(req);
        this.queue.update(q => q.filter(r => r.id !== req.id));
      } catch {
        if (req.retries >= MAX_RETRIES) {
          this.queue.update(q => q.filter(r => r.id !== req.id));
        } else {
          this.queue.update(q => q.map(r => r.id === req.id ? { ...r, retries: r.retries + 1 } : r));
        }
      }
    }
    this.persistQueue();
    this.syncing.set(false);
  }

  private async executeRequest(req: QueuedRequest): Promise<unknown> {
    return this.http.request(req.method, req.url, { body: req.body }).toPromise();
  }

  // ─── Cache management (IndexedDB-backed) ──────────────────────────────

  async cacheSet(key: string, data: Record<string, unknown>, ttlMs: number = 600_000): Promise<void> {
    const entry: OfflineCache = { key, data, cachedAt: Date.now(), ttlMs };
    this.cache.set(key, entry);
    await this.idbPut(entry);
  }

  cacheGet<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      this.idbDelete(key);
      return null;
    }
    return entry.data as T;
  }

  async cacheClear(): Promise<void> {
    this.cache.clear();
    await this.idbClearAll();
  }

  // ─── Queue Persistence (localStorage — small payload) ─────────────────

  private loadQueue(): QueuedRequest[] {
    try { return JSON.parse(this._storage.get(QUEUE_KEY) ?? '[]'); } catch { return []; }
  }

  private persistQueue(): void {
    try {
      this._storage.set(QUEUE_KEY, JSON.stringify(this.queue()));
    } catch { /* quota exceeded — queue will be rebuilt from memory */ }
  }

  // ─── IndexedDB operations ─────────────────────────────────────────────

  private openIndexedDB(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (typeof indexedDB === 'undefined') {
        // IndexedDB unavailable — fall back to in-memory only
        resolve();
        return;
      }
      try {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          // Load existing cache entries into memory
          this.idbLoadAll().then(() => resolve());
        };

        request.onerror = () => {
          // IndexedDB failed — continue with in-memory cache only
          resolve();
        };
      } catch {
        resolve();
      }
    });
  }

  private async idbLoadAll(): Promise<void> {
    if (!this.db) return;
    return new Promise<void>((resolve) => {
      try {
        const tx = this.db!.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
          const entries: OfflineCache[] = request.result || [];
          const now = Date.now();
          for (const entry of entries) {
            if (now - entry.cachedAt <= entry.ttlMs) {
              this.cache.set(entry.key, entry);
            } else {
              // Expired — clean up
              this.idbDelete(entry.key);
            }
          }
          resolve();
        };
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async idbPut(entry: OfflineCache): Promise<void> {
    await this.dbReady;
    if (!this.db) return;
    try {
      const tx = this.db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(entry);
    } catch { /* silently ignore write failures */ }
  }

  private idbDelete(key: string): void {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
    } catch { /* silently ignore delete failures */ }
  }

  private async idbClearAll(): Promise<void> {
    await this.dbReady;
    if (!this.db) return;
    try {
      const tx = this.db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
    } catch { /* silently ignore clear failures */ }
  }
}
