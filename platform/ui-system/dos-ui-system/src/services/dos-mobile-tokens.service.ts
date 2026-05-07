import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * @dos/ui-system Mobile Tokens Service
 *
 * Loads breakpoint configurations from dos.mobile_breakpoint_config
 * and emits CSS custom properties at runtime.
 */
@Injectable({
  providedIn: 'root',
})
export class DosMobileTokensService {
  private breakpoints = new BehaviorSubject<MobileBreakpointMap>({});
  private isInitialized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private http: HttpClient
  ) {}

  /**
   * Load breakpoint configurations from DB
   */
  loadBreakpoints(): Observable<void> {
    return this.http
      .get<{ data: MobileBreakpointConfig[] }>('/api/ui-os/mobile-breakpoint-config')
      .pipe(
        map((response) => {
          const breakpointMap: MobileBreakpointMap = {};
          for (const bp of response.data) {
            if (bp.is_active) {
              breakpointMap[bp.breakpoint_key] = bp;
            }
          }
          this.breakpoints.next(breakpointMap);
          this.emitTokens();
          this.isInitialized = true;
        }),
        catchError(() => {
          // Fallback to default breakpoints if DB load fails
          const defaults = this.getDefaultBreakpoints();
          this.breakpoints.next(defaults);
          this.emitTokens();
          this.isInitialized = true;
          return of(void 0);
        })
      );
  }

  /**
   * Emit CSS custom properties to :root
   */
  emitTokens(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const bp = this.breakpoints.value;
    const root = document.documentElement;

    root.style.setProperty('--mobile-breakpoint-min', `${bp.mobile?.min_px || 0}px`);
    root.style.setProperty('--mobile-breakpoint-max', `${bp.mobile?.max_px || 480}px`);
    root.style.setProperty('--tablet-breakpoint-min', `${bp.tablet?.min_px || 481}px`);
    root.style.setProperty('--tablet-breakpoint-max', `${bp.tablet?.max_px || 1024}px`);
    root.style.setProperty('--desktop-breakpoint-min', `${bp.desktop?.min_px || 1025}px`);
    root.style.setProperty('--desktop-breakpoint-max', `${bp.desktop?.max_px || 9999}px`);
  }

  /**
   * Update tokens when breakpoint config changes
   */
  updateTokens(): void {
    this.loadBreakpoints().subscribe();
  }

  /**
   * Get current breakpoint for viewport width
   */
  getCurrentBreakpoint(viewportWidth: number): string {
    const bp = this.breakpoints.value;
    if (viewportWidth <= (bp.mobile?.max_px || 480)) return 'mobile';
    if (viewportWidth <= (bp.tablet?.max_px || 1024)) return 'tablet';
    return 'desktop';
  }

  /**
   * Get default fallback breakpoints
   */
  private getDefaultBreakpoints(): MobileBreakpointMap {
    return {
      mobile: { breakpoint_key: 'mobile', min_px: 0, max_px: 480, default_behavior: 'stacked', is_active: true },
      tablet: { breakpoint_key: 'tablet', min_px: 481, max_px: 1024, default_behavior: 'sidebar', is_active: true },
      desktop: { breakpoint_key: 'desktop', min_px: 1025, max_px: 9999, default_behavior: 'sidebar', is_active: true },
    };
  }
}

interface MobileBreakpointConfig {
  breakpoint_key: string;
  min_px: number;
  max_px: number;
  default_behavior: string;
  is_active: boolean;
}

interface MobileBreakpointMap {
  [key: string]: MobileBreakpointConfig;
}
