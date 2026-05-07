/**
 * <dos-brand-eagle> — Phase M0 brand asset renderer.
 *
 * Single source for the eagle (Shahin / Dogan) brand mark. The eagle is
 * NOT a Carbon icon — it is resolved as a brand asset via
 * `BrandResolverService`. This component:
 *
 *   - validates the requested brand against the M0 seed,
 *   - picks the narrowest-matching asset (theme + locale + direction),
 *   - renders inline SVG (preferred) or <img> fallback,
 *   - emits `dos-empty-state`-friendly null when no asset row exists,
 *   - sets accessible label from the asset's `altEn`/`altAr`.
 *
 * Use only on marketing surfaces and the workspace header. Never inline
 * the eagle SVG anywhere else — it must always come through the resolver
 * so brand updates land everywhere on a single DB write.
 *
 * ZERO_LEGACY: there is NO static brandCode→PNG map and NO localized
 * "Shahin-AI+" / "Dogan AI OS" string fallback. Pre-resolve render uses
 * the `iconUrl` and `brandName` already supplied by tenantRuntime
 * (BrandRuntimeService). Empty tenantRuntime => no eagle. Tenant
 * branding is the only source.
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import type { DosBrandCode } from '@dos/design-tokens';
import { BrandResolverService } from './brand-resolver.service';
import type { DosBrandAssetTheme } from './brand-asset.contract';

// ZERO_LEGACY: deleted STATIC_EAGLE_FALLBACK and STATIC_EAGLE_ALT.
// Pre-resolve render is done via tenantRuntime.branding.iconUrl /
// brandName supplied through @Input() preIconUrl + preIconAlt — both
// resolved by the parent shell from UI-OS, never invented here.

@Component({
  selector: 'dos-brand-eagle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (asset(); as a) {
      @if (a.source.kind === 'svg') {
        <span
          class="dos-brand-eagle"
          role="img"
          [attr.aria-label]="locale === 'ar' ? a.altAr : a.altEn"
          [style.inline-size.px]="renderWidth()"
          [style.block-size.px]="renderHeight()"
          [innerHTML]="svgHtml()"
        ></span>
      } @else {
        <img
          class="dos-brand-eagle"
          [src]="a.source.url"
          [width]="renderWidth()"
          [height]="renderHeight()"
          [alt]="locale === 'ar' ? a.altAr : a.altEn"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
      }
    } @else if (preIconUrl) {
      <!-- Pre-resolve render: tenantRuntime.branding.iconUrl piped in by
           the parent shell. Empty preIconUrl => no eagle rendered. -->
      <img
        class="dos-brand-eagle dos-brand-eagle--pre"
        [src]="preIconUrl"
        [width]="size"
        [height]="size"
        [alt]="preIconAlt"
        loading="eager"
        decoding="async"
        fetchpriority="high"
      />
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .dos-brand-eagle { display: inline-block; line-height: 0; }
    .dos-brand-eagle :where(svg) { inline-size: 100%; block-size: 100%; }
    /* Pre-resolve render: aspect-ratio keeps the supplied iconUrl
       at the same square footprint regardless of intrinsic size. */
    .dos-brand-eagle--pre { block-size: auto; aspect-ratio: 1 / 1; object-fit: contain; }
  `],
})
export class DosBrandEagleComponent {
  private readonly resolver = inject(BrandResolverService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input() brandCode!: DosBrandCode;
  @Input() theme: DosBrandAssetTheme = 'light';
  @Input() locale: 'en' | 'ar' = 'en';
  @Input() direction: 'ltr' | 'rtl' = 'ltr';
  /** Render at a target block size (px). Width derived from intrinsic ratio. */
  @Input() size: number = 32;

  /**
   * UI-OS pre-resolve render. Parent shell passes
   * `tenantRuntime.branding.iconUrl` (and `brandName` as alt) so the
   * eagle paints on first frame without any local brandCode→PNG map.
   * Empty preIconUrl => the @else if branch in the template renders
   * nothing; once `BrandResolverService.asset(...)` returns the SVG
   * record, the @if (asset()) branch takes over.
   */
  @Input() preIconUrl = '';
  @Input() preIconAlt = '';

  readonly asset = computed(() =>
    this.resolver.asset({
      brandCode: this.brandCode,
      assetKind: 'logo-eagle',
      theme: this.theme,
      locale: this.locale,
      direction: this.direction,
    }),
  );

  readonly renderHeight = computed(() => this.size);
  readonly renderWidth = computed(() => {
    const a = this.asset();
    if (!a) return this.size;
    return Math.round(this.size * (a.width / a.height));
  });

  readonly svgHtml = computed<SafeHtml | null>(() => {
    const a = this.asset();
    if (!a || a.source.kind !== 'svg') return null;
    // Source comes from server-side dos.marketing_brand_assets, written by
    // platform admins only — sanitiser bypass is an acceptable trust call
    // here. Inputs are not user-editable on this surface.
    return this.sanitizer.bypassSecurityTrustHtml(a.source.svg);
  });
}
