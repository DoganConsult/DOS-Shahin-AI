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
 * Static eager fallback (added M3.2): `STATIC_EAGLE_FALLBACK` maps
 * brandCode → the official master PNG path so the logo renders on first
 * paint before the async BrandResolverService bundle returns from the API.
 * Once the bundle resolves, the @if (asset()) branch takes over.
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

// ─── Static eager fallback ────────────────────────────────────────────────────
// Paths are relative to the Angular app's base-href (/assets/…).
// These PNGs are bundled via the angular.json shahin_agent_assets_crop glob
// and served at /assets/shahin-kit/… with HTTP 200 from product-shell.
const STATIC_EAGLE_FALLBACK: Readonly<Partial<Record<string, string>>> = {
  'shahin-ai':   'assets/shahin-kit/master_logo/master_shahin_ai_original.png',
  'dogan-ai-os': 'assets/shahin-kit/master_logo/master_shahin_ai_original.png',
};

const STATIC_EAGLE_ALT: Readonly<Partial<Record<string, { en: string; ar: string }>>> = {
  'shahin-ai':   { en: 'Shahin-AI+ — Agentic GRC Platform', ar: 'شاهين AI+ — منصة الحوكمة الذكية' },
  'dogan-ai-os': { en: 'Dogan AI OS', ar: 'دوغان AI' },
};

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
    } @else if (staticSrc()) {
      <!-- Static fallback: official master PNG shown before async bundle resolves -->
      <img
        class="dos-brand-eagle dos-brand-eagle--static"
        [src]="staticSrc()!"
        [width]="size"
        [height]="size"
        [alt]="staticAlt()"
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
    /* Static fallback: aspect-ratio keeps the 1:1 master PNG at any given size */
    .dos-brand-eagle--static { block-size: auto; aspect-ratio: 1 / 1; object-fit: contain; }
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

  /** Static fallback URL — renders immediately before the async bundle resolves. */
  readonly staticSrc = computed((): string | null =>
    STATIC_EAGLE_FALLBACK[this.brandCode as string] ?? null,
  );

  readonly staticAlt = computed((): string => {
    const entry = STATIC_EAGLE_ALT[this.brandCode as string];
    return entry ? (this.locale === 'ar' ? entry.ar : entry.en) : 'Shahin-AI+';
  });

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
