import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  Input,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import type { DosBrandCode } from '@dos/design-tokens';
import {
  DosCarbonBreadcrumbComponent,
  type DosCarbonBreadcrumbItem,
} from '../carbon/dos-carbon-breadcrumb.component';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import {
  DosCarbonButtonComponent,
  type DosCarbonButtonKind,
} from '../carbon/dos-carbon-button.component';
import {
  DosCarbonNotificationComponent,
  type DosCarbonNotificationKind,
} from '../carbon/dos-carbon-notification.component';
import { DosCarbonInlineLoadingComponent } from '../carbon/dos-carbon-inline-loading.component';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';
import {
  DosCarbonGridComponent,
  DosCarbonRowComponent,
  DosCarbonColComponent,
} from '../carbon/dos-carbon-grid.component';
import {
  DosDownloadKitCardComponent,
  DosGatedDownloadModalComponent,
  DosDownloadSuccessComponent,
} from './download-kit.components';
import type { MarketingAsset, MarketingDownloadEvent } from './download-kit.contract';

type PublicLocale = 'en' | 'ar';
type MarketingCopy = string | { en?: string; ar?: string } | null | undefined;

interface MarketingBreadcrumbInput {
  label?: MarketingCopy;
  href?: string;
  current?: boolean;
}

interface MarketingTileInput {
  id?: string;
  title?: MarketingCopy;
  body?: MarketingCopy;
  tag?: MarketingCopy;
}

interface MarketingActionInput {
  id?: string;
  label?: MarketingCopy;
  href?: string;
  kind?: DosCarbonButtonKind;
}

interface MarketingNoticeInput {
  title?: MarketingCopy;
  body?: MarketingCopy;
  kind?: DosCarbonNotificationKind;
}

interface MarketingTileView {
  id: string;
  title: string;
  body: string;
  tag: string;
}

interface MarketingActionView {
  id: string;
  label: string;
  href: string;
  kind: DosCarbonButtonKind;
}

const SHARED_STYLES = `
  :host {
    display: block;
    min-block-size: 100vh;
    background: var(--cds-background, #ffffff);
    color: var(--cds-text-primary, #161616);
  }

  .dos-mp-page {
    padding-block: clamp(1rem, 4vw, 3rem) 3rem;
  }

  .dos-mp-section {
    margin-block-end: 2rem;
  }

  .dos-mp-stack {
    display: grid;
    gap: 1rem;
  }

  .dos-mp-title,
  .dos-mp-tile-title {
    margin: 0;
    color: var(--cds-text-primary, #161616);
  }

  .dos-mp-title {
    font: 600 clamp(2rem, 5vw, 3.5rem) / 1.05 var(--cds-productive-heading-06-font-family, 'IBM Plex Sans', system-ui, sans-serif);
  }

  .dos-mp-subtitle,
  .dos-mp-tile-body {
    margin: 0;
    max-inline-size: 64ch;
    color: var(--cds-text-secondary, #525252);
  }

  .dos-mp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .dos-mp-actions dos-carbon-button {
    display: inline-flex;
  }

  .dos-mp-actions dos-carbon-button ::ng-deep .cds--btn {
    min-inline-size: 11rem;
  }

  .dos-mp-tile {
    display: block;
    min-block-size: 100%;
  }

  .dos-mp-tile-stack {
    display: grid;
    gap: 0.75rem;
  }

  .dos-mp-footer {
    padding-block-start: 1.5rem;
    border-block-start: 1px solid var(--cds-border-subtle-00, #e0e0e0);
  }

  .dos-mp-footer small {
    color: var(--cds-text-secondary, #525252);
  }

  @media (max-width: 768px) {
    .dos-mp-actions dos-carbon-button {
      flex: 1 1 100%;
    }

    .dos-mp-actions dos-carbon-button ::ng-deep .cds--btn {
      inline-size: 100%;
    }
  }
`;

const PUBLIC_PAGE_TEMPLATE = `
  <main class="dos-mp-page" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" [attr.data-page-id]="pageId">
    <section class="dos-mp-section" data-section-id="hero">
      <dos-carbon-grid [narrow]="true">
        <dos-carbon-row>
          <dos-carbon-col [columnNumbers]="heroColumns">
            <div class="dos-mp-stack">
              @if (breadcrumbItems().length) {
                <dos-carbon-breadcrumb [items]="breadcrumbItems()"></dos-carbon-breadcrumb>
              }
              <dos-brand-eagle
                [brandCode]="brandCode"
                [locale]="locale"
                [direction]="locale === 'ar' ? 'rtl' : 'ltr'"
                [size]="48"
              ></dos-brand-eagle>
              @if (eyebrowLabel()) {
                <dos-carbon-tag type="cool-gray" size="md">{{ eyebrowLabel() }}</dos-carbon-tag>
              }
              @if (title) {
                <h1 class="dos-mp-title">{{ title }}</h1>
              }
              @if (subtitle) {
                <p class="dos-mp-subtitle">{{ subtitle }}</p>
              }
              @if (actionsView().length) {
                <div class="dos-mp-actions">
                  @for (action of actionsView(); track action.id) {
                    <dos-carbon-button [kind]="action.kind" size="lg" (clicked)="openRoute(action.href)">
                      {{ action.label }}
                    </dos-carbon-button>
                  }
                </div>
              }
            </div>
          </dos-carbon-col>
        </dos-carbon-row>
      </dos-carbon-grid>
    </section>

    @if (tilesView().length) {
      <section class="dos-mp-section" data-section-id="tiles">
        <dos-carbon-grid [narrow]="true">
          <dos-carbon-row>
            @for (tile of tilesView(); track tile.id) {
              <dos-carbon-col [columnNumbers]="tileColumns">
                <dos-carbon-tile class="dos-mp-tile">
                  <div class="dos-mp-tile-stack">
                    @if (tile.tag) {
                      <dos-carbon-tag type="warm-gray" size="sm">{{ tile.tag }}</dos-carbon-tag>
                    }
                    @if (tile.title) {
                      <h2 class="dos-mp-tile-title">{{ tile.title }}</h2>
                    }
                    @if (tile.body) {
                      <p class="dos-mp-tile-body">{{ tile.body }}</p>
                    }
                  </div>
                </dos-carbon-tile>
              </dos-carbon-col>
            }
          </dos-carbon-row>
        </dos-carbon-grid>
      </section>
    }

    <section class="dos-mp-section dos-mp-footer" data-section-id="footer">
      <dos-carbon-grid [narrow]="true">
        <dos-carbon-row>
          <dos-carbon-col [columnNumbers]="heroColumns">
            <small>{{ footerLabel() }}</small>
          </dos-carbon-col>
        </dos-carbon-row>
      </dos-carbon-grid>
    </section>
  </main>
`;

@Directive()
abstract class MarketingPublicPageBase {
  private readonly document = inject(DOCUMENT);

  @Input() brandCode!: DosBrandCode;
  @Input() brandLabel: MarketingCopy = '';
  @Input() locale: PublicLocale = this.detectLocale();
  @Input() title = '';
  @Input() subtitle = '';
  @Input() eyebrow: MarketingCopy = '';
  @Input() breadcrumb: ReadonlyArray<MarketingBreadcrumbInput> | null = [];
  @Input() tiles: ReadonlyArray<MarketingTileInput> | null = [];
  @Input() actions: ReadonlyArray<MarketingActionInput> | null = [];

  readonly year = new Date().getFullYear();
  readonly heroColumns = { sm: 4, md: 8, lg: 16 };
  readonly tileColumns = { sm: 4, md: 4, lg: 5 };

  abstract readonly pageId: string;

  breadcrumbItems(): ReadonlyArray<DosCarbonBreadcrumbItem> {
    return (this.breadcrumb ?? [])
      .map((item) => ({
        label: this.resolveCopy(item.label),
        href: item.href,
        current: item.current,
      }))
      .filter((item) => item.label);
  }

  eyebrowLabel(): string {
    return this.resolveCopy(this.eyebrow);
  }

  tilesView(): ReadonlyArray<MarketingTileView> {
    return (this.tiles ?? [])
      .map((tile, index) => ({
        id: tile.id || `${this.pageId}-tile-${index + 1}`,
        title: this.resolveCopy(tile.title),
        body: this.resolveCopy(tile.body),
        tag: this.resolveCopy(tile.tag),
      }))
      .filter((tile) => tile.title || tile.body || tile.tag);
  }

  actionsView(): ReadonlyArray<MarketingActionView> {
    return (this.actions ?? [])
      .map((action, index) => ({
        id: action.id || `${this.pageId}-action-${index + 1}`,
        label: this.resolveCopy(action.label),
        href: action.href ?? '',
        kind: this.normalizeButtonKind(action.kind),
      }))
      .filter((action) => action.label && action.href);
  }

  footerLabel(): string {
    return `© ${this.year} ${this.resolveCopy(this.brandLabel) || this.brandCode || ''}`.trim();
  }

  resolveCopy(value: MarketingCopy): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return this.locale === 'ar' ? (value.ar ?? value.en ?? '') : (value.en ?? value.ar ?? '');
  }

  resolveList(values: ReadonlyArray<MarketingCopy>): ReadonlyArray<string> {
    return values.map((value) => this.resolveCopy(value)).filter(Boolean);
  }

  openRoute(href: string): void {
    if (!href || typeof window === 'undefined') return;
    window.location.assign(href);
  }

  private detectLocale(): PublicLocale {
    const lang = this.document?.documentElement?.lang?.toLowerCase() ?? '';
    const dir = this.document?.documentElement?.dir?.toLowerCase() ?? '';
    return lang.startsWith('ar') || dir === 'rtl' ? 'ar' : 'en';
  }

  private normalizeButtonKind(kind?: DosCarbonButtonKind): DosCarbonButtonKind {
    switch (kind) {
      case 'secondary':
      case 'tertiary':
      case 'ghost':
      case 'danger':
      case 'danger-tertiary':
      case 'danger-ghost':
        return kind;
      default:
        return 'primary';
    }
  }
}

const PUBLIC_IMPORTS = [
  DosBrandEagleComponent,
  DosCarbonBreadcrumbComponent,
  DosCarbonTileComponent,
  DosCarbonButtonComponent,
  DosCarbonTagComponent,
  DosCarbonGridComponent,
  DosCarbonRowComponent,
  DosCarbonColComponent,
] as const;

@Component({
  selector: 'dos-marketing-pricing',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingPricingPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.pricing.page';
}

@Component({
  selector: 'dos-marketing-trust',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingTrustPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.trust.page';
}

@Component({
  selector: 'dos-marketing-security',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingSecurityPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.security.page';
}

@Component({
  selector: 'dos-marketing-contact',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingContactPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.contact.page';
}

@Component({
  selector: 'dos-marketing-about',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingAboutPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.about.page';
}

@Component({
  selector: 'dos-marketing-legal',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingLegalPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.legal.page';
}

@Component({
  selector: 'dos-marketing-platform',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingPlatformPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.platform.page';
}

@Component({
  selector: 'dos-marketing-resources',
  standalone: true,
  imports: [...PUBLIC_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: PUBLIC_PAGE_TEMPLATE,
  styles: [SHARED_STYLES],
})
export class DosMarketingResourcesPageComponent extends MarketingPublicPageBase {
  readonly pageId = 'marketing.resources.page';
}

@Component({
  selector: 'dos-marketing-executive-kit-page',
  standalone: true,
  imports: [
    ...PUBLIC_IMPORTS,
    DosCarbonNotificationComponent,
    DosCarbonInlineLoadingComponent,
    DosDownloadKitCardComponent,
    DosGatedDownloadModalComponent,
    DosDownloadSuccessComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="dos-mp-page" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'" [attr.data-page-id]="pageId">
      <section class="dos-mp-section" data-section-id="hero">
        <dos-carbon-grid [narrow]="true">
          <dos-carbon-row>
            <dos-carbon-col [columnNumbers]="heroColumns">
              <div class="dos-mp-stack">
                @if (breadcrumbItems().length) {
                  <dos-carbon-breadcrumb [items]="breadcrumbItems()"></dos-carbon-breadcrumb>
                }
                <dos-brand-eagle
                  [brandCode]="brandCode"
                  [locale]="locale"
                  [direction]="locale === 'ar' ? 'rtl' : 'ltr'"
                  [size]="48"
                ></dos-brand-eagle>
                @if (eyebrowLabel()) {
                  <dos-carbon-tag type="cool-gray" size="md">{{ eyebrowLabel() }}</dos-carbon-tag>
                }
                @if (title) {
                  <h1 class="dos-mp-title">{{ title }}</h1>
                }
                @if (subtitle) {
                  <p class="dos-mp-subtitle">{{ subtitle }}</p>
                }
                @if (actionsView().length) {
                  <div class="dos-mp-actions">
                    @for (action of actionsView(); track action.id) {
                      <dos-carbon-button [kind]="action.kind" size="lg" (clicked)="openRoute(action.href)">
                        {{ action.label }}
                      </dos-carbon-button>
                    }
                  </div>
                }
              </div>
            </dos-carbon-col>
          </dos-carbon-row>
        </dos-carbon-grid>
      </section>

      @if (noticeTitle() || noticeBody()) {
        <section class="dos-mp-section" data-section-id="notice">
          <dos-carbon-grid [narrow]="true">
            <dos-carbon-row>
              <dos-carbon-col [columnNumbers]="heroColumns">
                <dos-carbon-notification
                  variant="inline"
                  [kind]="noticeKind()"
                  [title]="noticeTitle()"
                  [subtitle]="noticeBody()"
                  [hideClose]="true"
                ></dos-carbon-notification>
              </dos-carbon-col>
            </dos-carbon-row>
          </dos-carbon-grid>
        </section>
      }

      <section class="dos-mp-section" data-section-id="kit-flow">
        <dos-carbon-grid [narrow]="true">
          <dos-carbon-row>
            <dos-carbon-col [columnNumbers]="featureColumns">
              @if (featuredAsset(); as asset) {
                <dos-download-kit-card
                  [asset]="asset"
                  [ctaLabel]="resolveCopy(downloadCtaLabel)"
                  [gatedLabel]="resolveCopy(gatedLabel)"
                  [openLabel]="resolveCopy(openLabel)"
                  (event)="onDownloadEvent($event)"
                ></dos-download-kit-card>
              } @else {
                <dos-carbon-inline-loading state="active" [loadingText]="resolveCopy(loadingCopy)"></dos-carbon-inline-loading>
              }
            </dos-carbon-col>

            @if (reasonTiles().length) {
              <dos-carbon-col [columnNumbers]="featureColumns">
                <div class="dos-mp-stack">
                  @for (tile of reasonTiles(); track tile.id) {
                    <dos-carbon-tile class="dos-mp-tile">
                      <div class="dos-mp-tile-stack">
                        @if (tile.tag) {
                          <dos-carbon-tag type="warm-gray" size="sm">{{ tile.tag }}</dos-carbon-tag>
                        }
                        @if (tile.title) {
                          <h2 class="dos-mp-tile-title">{{ tile.title }}</h2>
                        }
                        @if (tile.body) {
                          <p class="dos-mp-tile-body">{{ tile.body }}</p>
                        }
                      </div>
                    </dos-carbon-tile>
                  }
                </div>
              </dos-carbon-col>
            }
          </dos-carbon-row>
        </dos-carbon-grid>
      </section>

      @if (downloadSuccess()) {
        <section class="dos-mp-section" data-section-id="success">
          <dos-carbon-grid [narrow]="true">
            <dos-carbon-row>
              <dos-carbon-col [columnNumbers]="heroColumns">
                <dos-download-success
                  [asset]="featuredAsset()"
                  [successHeading]="resolveCopy(successHeading)"
                  [successBody]="resolveCopy(successBody)"
                  [downloadNowLabel]="resolveCopy(downloadNowLabel)"
                  [emailLabel]="resolveCopy(emailLabel)"
                  [bookDemoLabel]="resolveCopy(bookDemoLabel)"
                  [bookDemoHref]="bookDemoHref"
                  [exploreLabel]="resolveCopy(exploreLabel)"
                  [exploreHref]="exploreHref"
                  [followupBody]="resolveCopy(followupBody)"
                  (event)="onDownloadEvent($event)"
                ></dos-download-success>
              </dos-carbon-col>
            </dos-carbon-row>
          </dos-carbon-grid>
        </section>
      }

      @if (modalOpen()) {
        <dos-gated-download-modal
          [asset]="featuredAsset()"
          [open]="true"
          [title]="resolveCopy(modalTitle)"
          [labelName]="resolveCopy(labelName)"
          [labelEmail]="resolveCopy(labelEmail)"
          [labelCompany]="resolveCopy(labelCompany)"
          [labelJobTitle]="resolveCopy(labelJobTitle)"
          [labelCountry]="resolveCopy(labelCountry)"
          [labelInterest]="resolveCopy(labelInterest)"
          [labelConsent]="resolveCopy(labelConsent)"
          [submitLabel]="resolveCopy(submitLabel)"
          [cancelLabel]="resolveCopy(cancelLabel)"
          [submittingLabel]="resolveCopy(submittingLabel)"
          [countries]="resolveList(countries)"
          [interestAreas]="resolveList(interestAreas)"
          (event)="onDownloadEvent($event)"
          (closed)="onModalClosed()"
        ></dos-gated-download-modal>
      }

      <section class="dos-mp-section dos-mp-footer" data-section-id="footer">
        <dos-carbon-grid [narrow]="true">
          <dos-carbon-row>
            <dos-carbon-col [columnNumbers]="heroColumns">
              <small>{{ footerLabel() }}</small>
            </dos-carbon-col>
          </dos-carbon-row>
        </dos-carbon-grid>
      </section>
    </main>
  `,
  styles: [SHARED_STYLES],
})
export class DosMarketingExecutiveKitPageComponent extends MarketingPublicPageBase implements OnInit {
  readonly pageId = 'marketing.executive-kit.page';
  readonly featureColumns = { sm: 4, md: 4, lg: 8 };

  @Input() notice: MarketingNoticeInput | null = null;
  @Input() reasons: ReadonlyArray<MarketingTileInput> | null = [];
  @Input() featuredAssetKey = '';
  @Input() downloadCtaLabel: MarketingCopy = '';
  @Input() gatedLabel: MarketingCopy = '';
  @Input() openLabel: MarketingCopy = '';
  @Input() loadingCopy: MarketingCopy = '';
  @Input() modalTitle: MarketingCopy = '';
  @Input() labelName: MarketingCopy = '';
  @Input() labelEmail: MarketingCopy = '';
  @Input() labelCompany: MarketingCopy = '';
  @Input() labelJobTitle: MarketingCopy = '';
  @Input() labelCountry: MarketingCopy = '';
  @Input() labelInterest: MarketingCopy = '';
  @Input() labelConsent: MarketingCopy = '';
  @Input() submitLabel: MarketingCopy = '';
  @Input() cancelLabel: MarketingCopy = '';
  @Input() submittingLabel: MarketingCopy = '';
  @Input() countries: ReadonlyArray<MarketingCopy> = [];
  @Input() interestAreas: ReadonlyArray<MarketingCopy> = [];
  @Input() successHeading: MarketingCopy = '';
  @Input() successBody: MarketingCopy = '';
  @Input() downloadNowLabel: MarketingCopy = '';
  @Input() emailLabel: MarketingCopy = '';
  @Input() bookDemoLabel: MarketingCopy = '';
  @Input() bookDemoHref = '';
  @Input() exploreLabel: MarketingCopy = '';
  @Input() exploreHref = '';
  @Input() followupBody: MarketingCopy = '';
  @Input() failureMessage: MarketingCopy = '';

  @ViewChild(DosGatedDownloadModalComponent)
  private readonly gatedDownloadModal?: DosGatedDownloadModalComponent;

  readonly modalOpen = signal(false);
  readonly downloadSuccess = signal(false);
  readonly downloadAssets = signal<readonly MarketingAsset[]>([]);

  async ngOnInit(): Promise<void> {
    const response = await fetch(`/api/ui-os/marketing/assets?brand=${this.brandCode}&locale=${this.locale}`, {
      credentials: 'omit',
      headers: { Accept: 'application/json' },
    }).catch((): null => null);
    if (!response?.ok) return;
    const payload = await response.json().catch(() => ({ assets: [] as MarketingAsset[] }));
    this.downloadAssets.set((payload as { assets?: MarketingAsset[] }).assets ?? []);
  }

  noticeTitle(): string {
    return this.resolveCopy(this.notice?.title);
  }

  noticeBody(): string {
    return this.resolveCopy(this.notice?.body);
  }

  noticeKind(): DosCarbonNotificationKind {
    switch (this.notice?.kind) {
      case 'error':
      case 'info-square':
      case 'success':
      case 'warning':
      case 'warning-alt':
        return this.notice.kind;
      default:
        return 'info';
    }
  }

  reasonTiles(): ReadonlyArray<MarketingTileView> {
    return (this.reasons ?? [])
      .map((tile, index) => ({
        id: tile.id || `${this.pageId}-reason-${index + 1}`,
        title: this.resolveCopy(tile.title),
        body: this.resolveCopy(tile.body),
        tag: this.resolveCopy(tile.tag),
      }))
      .filter((tile) => tile.title || tile.body || tile.tag);
  }

  featuredAsset(): MarketingAsset | null {
    const key = this.featuredAssetKey;
    if (!key) return null;
    const assets = this.downloadAssets();
    return assets.find((asset) => asset.assetKey === key && asset.locale === this.locale)
      ?? assets.find((asset) => asset.assetKey === key)
      ?? null;
  }

  async onDownloadEvent(event: MarketingDownloadEvent): Promise<void> {
    if (event.key === 'marketing.download.opened') {
      const asset = this.featuredAsset();
      if (asset?.isGated) {
        this.modalOpen.set(true);
      } else if (asset?.fileUrl && typeof window !== 'undefined') {
        window.open(asset.fileUrl, '_blank', 'noopener');
        this.downloadSuccess.set(true);
      }
    }

    if (event.key === 'marketing.download.submitted') {
      await this.submitMarketingDownload(event);
    }

    if (event.key === 'marketing.download.completed') {
      this.modalOpen.set(false);
      this.downloadSuccess.set(true);
    }
  }

  onModalClosed(): void {
    this.modalOpen.set(false);
  }

  private async submitMarketingDownload(event: MarketingDownloadEvent): Promise<void> {
    const response = await fetch('/api/ui-os/marketing/downloads', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(event),
    }).catch((error: unknown) => {
      throw new Error((error as Error)?.message || 'download_submit_failed');
    });

    if (response.ok) {
      this.gatedDownloadModal?.markCompleted();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : this.resolveCopy(this.failureMessage);
    this.gatedDownloadModal?.markFailed(message);
  }
}

export const MARKETING_PUBLIC_PAGE_KEYS = [
  'marketing.pricing.page',
  'marketing.trust.page',
  'marketing.security.page',
  'marketing.contact.page',
  'marketing.about.page',
  'marketing.legal.page',
  'marketing.platform.page',
  'marketing.resources.page',
  'marketing.executive-kit.page',
] as const;

export type MarketingPublicPageKey = (typeof MARKETING_PUBLIC_PAGE_KEYS)[number];