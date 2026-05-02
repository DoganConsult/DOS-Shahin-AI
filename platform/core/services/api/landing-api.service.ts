/**
 * Landing API Service
 * Canonical location: core/services/api/landing-api.service.ts
 * Provides typed access to public landing content and platform statistics.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface LandingContentDto {
  heroTitle?: string;
  heroSubtitle?: string;
  features?: Array<{ title: string; description: string; icon?: string }>;
  testimonials?: Array<{ author: string; text: string; role?: string }>;
  [key: string]: unknown;
}

export interface PlatformStatsDto {
  tenants?: number;
  users?: number;
  controls?: number;
  risks?: number;
  uptime?: number;
  [key: string]: unknown;
}

const CACHE_TTL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class LandingApiService {
  private readonly http = inject(HttpClient);
  private readonly api = '/api';

  private landingContent$: Observable<LandingContentDto> | null = null;
  private landingContentTs = 0;
  private stats$: Observable<PlatformStatsDto> | null = null;
  private statsTs = 0;
  private readonly invalidate$ = new Subject<void>();

  getLandingContent(): Observable<LandingContentDto> {
    if (!this.landingContent$ || Date.now() - this.landingContentTs > CACHE_TTL_MS) {
      this.landingContentTs = Date.now();
      this.landingContent$ = this.http.get<LandingContentDto>(`${this.api}/public/landing-content`).pipe(
        catchError(() => of({} as LandingContentDto)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.landingContent$;
  }

  getStats(): Observable<PlatformStatsDto> {
    if (!this.stats$ || Date.now() - this.statsTs > CACHE_TTL_MS) {
      this.statsTs = Date.now();
      this.stats$ = this.http.get<PlatformStatsDto>(`${this.api}/public/stats`).pipe(
        catchError(() => of({} as PlatformStatsDto)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    }
    return this.stats$;
  }

  invalidateCache(): void {
    this.landingContent$ = null;
    this.stats$ = null;
    this.invalidate$.next();
  }
}
