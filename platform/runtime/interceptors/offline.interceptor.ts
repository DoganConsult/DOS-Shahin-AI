import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { OfflineSyncService } from '../../mobile/services/offline-sync.service';
import { MobilePlatformService } from '../../mobile/services/mobile-platform.service';
import { HapticFeedbackService } from '../../mobile/services/haptic-feedback.service';

/**
 * Offline-aware HTTP interceptor for Capacitor native platforms.
 *
 * Behaviour:
 * - GET requests: When offline, serves from OfflineSyncService cache.
 *   When online, caches successful responses for future offline access.
 * - POST/PUT/PATCH/DELETE: When offline, queues the mutation via
 *   OfflineSyncService and returns a synthetic 202 Accepted so the
 *   UI can optimistically proceed. Haptic warning indicates queued action.
 * - On web: passes through untouched (no-op).
 */
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  if (!Capacitor.isNativePlatform()) return next(req);

  const platform = inject(MobilePlatformService);
  const offlineSync = inject(OfflineSyncService);
  const haptic = inject(HapticFeedbackService);

  const isOnline = platform.isOnline();
  const isApiRequest = req.url.includes('/api/');

  if (!isApiRequest) return next(req);

  // ──────── Offline GET → serve from cache ────────
  if (!isOnline && req.method === 'GET') {
    const cacheKey = extractCacheKey(req.url);
    return new Observable((subscriber) => {
      (offlineSync as unknown as { getCached(key: string): Promise<unknown> }).getCached(cacheKey).then((cached: unknown) => {
        if (cached !== null) {
          subscriber.next(new HttpResponse({ status: 200, body: cached }));
          subscriber.complete();
        } else {
          subscriber.error(new HttpErrorResponse({
            status: 0,
            statusText: 'Offline',
            url: req.url,
            error: 'No cached data available while offline.',
          }));
        }
      });
    });
  }

  // ──────── Offline mutation → queue for later ────────
  if (!isOnline && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const urlPath = req.url.replace(/^.*\/api/, '');
    offlineSync.enqueue(
      req.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      urlPath,
      req.body,
    );
    haptic.warning(); // tactile feedback: queued, not sent

    // Return synthetic 202 so the UI proceeds optimistically
    return of(new HttpResponse({
      status: 202,
      body: { queued: true, message: 'Action queued for sync when online' },
    }));
  }

  // ──────── Online GET → cache successful responses ────────
  if (isOnline && req.method === 'GET') {
    return next(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && event.status === 200) {
          const cacheKey = extractCacheKey(req.url);
          (offlineSync as unknown as { cacheData(key: string, data: Record<string, unknown>, ttl: number): void }).cacheData(cacheKey, event.body, 10 * 60 * 1000);
        }
      }),
    );
  }

  // ──────── Online mutation → pass through ────────
  return next(req);
};

/**
 * Extract a stable cache key from a URL.
 * /api/risks?page=1&limit=20 → 'risks?page=1&limit=20'
 */
function extractCacheKey(url: string): string {
  const match = url.match(/\/api\/(.+)/);
  return match ? match[1] : url;
}
