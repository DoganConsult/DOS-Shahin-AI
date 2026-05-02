import { Injectable } from '@angular/core';
import { OnboardingApiService } from './onboarding-api.service';
import { SaveBulkAnswersPayload } from '../models/onboarding.models';

const DB_NAME = 'onboarding_offline';
const STORE_NAME = 'pending_answers';
const DB_VERSION = 1;

interface PendingEntry {
  id?: number;
  sessionId: string;
  payload: SaveBulkAnswersPayload;
  createdAt: string;
  retryCount: number;
}

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private db: IDBDatabase | null = null;

  constructor(private readonly api: OnboardingApiService) {}

  async init(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async enqueue(sessionId: string, payload: SaveBulkAnswersPayload): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.add({ sessionId, payload, createdAt: new Date().toISOString(), retryCount: 0 } as PendingEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async flush(): Promise<{ flushed: number; failed: number }> {
    await this.init();
    if (!this.db) return { flushed: 0, failed: 0 };
    const entries = await this.getAll();
    let flushed = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        await this.api.saveAnswers(entry.sessionId, entry.payload).toPromise();
        await this.remove(entry.id!);
        flushed++;
      } catch {
        await this.incrementRetry(entry.id!);
        failed++;
      }
    }

    return { flushed, failed };
  }

  async pendingCount(): Promise<number> {
    await this.init();
    if (!this.db) return 0;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  }

  private async getAll(): Promise<PendingEntry[]> {
    if (!this.db) return [];
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as PendingEntry[]);
      req.onerror = () => resolve([]);
    });
  }

  private async remove(id: number): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  private async incrementRetry(id: number): Promise<void> {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const entry = getReq.result as PendingEntry | undefined;
        if (entry) {
          entry.retryCount = (entry.retryCount ?? 0) + 1;
          store.put(entry);
        }
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  }
}
