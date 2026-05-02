import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { OfflineSyncService } from '../services/offline-sync.service';
import { MobilePlatformService } from '../services/mobile-platform.service';
import { HapticService } from '../services/haptic.service';

const CACHE_TTL = 10 * 60 * 1000; // 10 min

export const offlineInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
) => {
  const offlineSync = inject(OfflineSyncService);
  const platform = inject(MobilePlatformService);
  const haptic = inject(HapticService);

  const isOffline = !platform.isOnline();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isApiCall = req.url.includes('/api/');
  const cacheKey = `http_${req.method}_${req.url}`;

  // ─── Offline GET: serve from cache ───────────────────────────────────────
  if (isOffline && req.method === 'GET' && isApiCall) {
    const cached = offlineSync.cacheGet(cacheKey);
    if (cached) {
      return of(new HttpResponse({ status: 200, body: cached, url: req.url }));
    }
    return throwError(() => new Error('OFFLINE_NO_CACHE'));
  }

  // ─── Offline mutation: queue and return optimistic 202 ───────────────────
  if (isOffline && isMutation && isApiCall) {
    haptic.trigger('warning');
    offlineSync.enqueue(req.method, req.url, req.body);
    return of(new HttpResponse({ status: 202, body: { queued: true }, url: req.url }));
  }

  // ─── Online GET: pass through and cache response ─────────────────────────
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && req.method === 'GET' && isApiCall && event.status === 200) {
        offlineSync.cacheSet(cacheKey, event.body, CACHE_TTL);
      }
    }),
    catchError(err => throwError(() => err)),
  );
};
