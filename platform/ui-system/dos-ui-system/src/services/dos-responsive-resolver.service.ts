import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DosMobileTokensService } from './dos-mobile-tokens.service';
import { MobileComponentProps } from '@dos/ui-contracts';

/**
 * @dos/ui-system Responsive Resolver Service
 *
 * Resolves mobile component variants and props based on current breakpoint.
 * Loads mobile variant configurations from dos.mobile_component_variants.
 */
@Injectable({
  providedIn: 'root',
})
export class DosResponsiveResolverService {
  private variants = new BehaviorSubject<Map<string, MobileComponentVariant>>(new Map());
  private currentBreakpoint = new BehaviorSubject<string>('desktop');

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private http: HttpClient,
    private mobileTokensService: DosMobileTokensService
  ) {
    this.init();
  }

  private init(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadVariants();
      this.detectBreakpoint();
      window.addEventListener('resize', () => this.detectBreakpoint());
    }
  }

  /**
   * Load mobile component variants from DB
   */
  loadVariants(): Observable<void> {
    return this.http
      .get<{ data: MobileComponentVariant[] }>('/api/ui-os/mobile-component-variants')
      .pipe(
        map((response) => {
          const variantMap = new Map<string, MobileComponentVariant>();
          for (const variant of response.data) {
            const key = `${variant.component_key}:${variant.breakpoint}`;
            variantMap.set(key, variant);
          }
          this.variants.next(variantMap);
        }),
        catchError(() => of(void 0))
      );
  }

  /**
   * Detect current breakpoint based on viewport width
   */
  detectBreakpoint(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const viewportWidth = window.innerWidth;
    const breakpoint = this.mobileTokensService.getCurrentBreakpoint(viewportWidth);
    this.currentBreakpoint.next(breakpoint);
  }

  /**
   * Get mobile props for a component at current breakpoint
   */
  getMobileProps(componentKey: string): MobileComponentProps {
    const breakpoint = this.currentBreakpoint.value;
    const variantMap = this.variants.value;
    const key = `${componentKey}:${breakpoint}`;
    const variant = variantMap.get(key);

    if (variant) {
      return variant.props_override;
    }

    // Check for default variant
    const defaultKey = `${componentKey}:mobile`;
    const defaultVariant = variantMap.get(defaultKey);
    if (defaultVariant) {
      return defaultVariant.props_override;
    }

    return {};
  }

  /**
   * Apply mobile variant to a component
   */
  applyVariant(componentKey: string, breakpoint?: string): MobileComponentProps {
    const bp = breakpoint || this.currentBreakpoint.value;
    const variantMap = this.variants.value;
    const key = `${componentKey}:${bp}`;
    const variant = variantMap.get(key);

    if (variant) {
      return variant.props_override;
    }

    return {};
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): string {
    return this.currentBreakpoint.value;
  }

  /**
   * Check if currently on mobile breakpoint
   */
  isMobile(): boolean {
    return this.currentBreakpoint.value === 'mobile';
  }

  /**
   * Check if currently on tablet breakpoint
   */
  isTablet(): boolean {
    return this.currentBreakpoint.value === 'tablet';
  }

  /**
   * Check if currently on desktop breakpoint
   */
  isDesktop(): boolean {
    return this.currentBreakpoint.value === 'desktop';
  }
}

interface MobileComponentVariant {
  component_key: string;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  props_override: MobileComponentProps;
  layout_override: Record<string, unknown> | null;
  is_default: boolean;
}
