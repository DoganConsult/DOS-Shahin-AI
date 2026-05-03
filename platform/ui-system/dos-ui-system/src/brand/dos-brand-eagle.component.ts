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
        />
      }
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .dos-brand-eagle { display: inline-block; line-height: 0; }
    .dos-brand-eagle :where(svg) { inline-size: 100%; block-size: 100%; }
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
