import {
  Component, ChangeDetectionStrategy, signal, inject, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, of } from 'rxjs';

import { I18nService } from '../../../core/services/ui-infra/i18n.service';
import { SalesRoomPublicApiService } from './services/sales-room-public-api.service';
import { PublicAsset } from './services/sales-room-public-api.types';
import { PdfViewerComponent } from '@app/shared/pdf-viewer/pdf-viewer.component';
import { VideoPreviewComponent } from './components/video-preview.component';
import { EmptyStateComponent } from './components/empty-state.component';

type LoadState = 'loading' | 'ready' | 'not-found';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-resource-detail-page',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    PdfViewerComponent, VideoPreviewComponent, EmptyStateComponent,
  ],
  template: `
    <main class="detail" [attr.dir]="i18n.dir()">
      <a class="backlink" routerLink="/resources">
        <i class="pi pi-arrow-left" aria-hidden="true"></i>
        {{ i18n.isArabic() ? 'كل الموارد' : 'All resources' }}
      </a>

      <ng-container [ngSwitch]="state()">
        <!-- ── Loading skeleton ── -->
        <section *ngSwitchCase="'loading'" class="skeleton" aria-busy="true">
          <div class="skeleton-line skeleton-line--wide"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-viewer"></div>
        </section>

        <!-- ── Not found / not public / not active ── -->
        <section *ngSwitchCase="'not-found'">
          <sr-empty-state variant="not-found">
            <a routerLink="/resources" class="cta">
              {{ i18n.isArabic() ? 'العودة إلى الموارد' : 'Back to Resources' }}
            </a>
          </sr-empty-state>
        </section>

        <!-- ── Ready ── -->
        <section *ngSwitchCase="'ready'" class="content">
          <header class="head">
            <div class="badges">
              <span class="badge">{{ assetTypeLabel() }}</span>
              <span class="badge">{{ asset()!.language === 'ar' ? 'AR' : 'EN' }}</span>
              <span *ngIf="asset()!.require_lead_capture" class="badge badge--lead">
                {{ i18n.isArabic() ? 'بريد مطلوب' : 'Email required' }}
              </span>
            </div>
            <h1>{{ titleFor() }}</h1>
            <p *ngIf="descFor()" class="lede">{{ descFor() }}</p>
          </header>

          <div *ngIf="asset()!.tags?.length" class="tags">
            <span *ngFor="let t of asset()!.tags" class="tag">#{{ t }}</span>
          </div>

          <!-- ── Viewer ── -->
          <div class="viewer">
            <ng-container [ngSwitch]="asset()!.asset_type">
              <app-pdf-viewer *ngSwitchCase="'pdf'"
                [src]="previewUrl() || ''"
                [title]="titleFor()"
                [showToolbar]="true"
                [useExtendedViewer]="true"
                [language]="i18n.isArabic() ? 'ar' : 'en'"
                height="640px"
              ></app-pdf-viewer>

              <app-pdf-viewer *ngSwitchCase="'presentation'"
                [src]="previewUrl() || ''"
                [title]="titleFor()"
                [showToolbar]="true"
                [useExtendedViewer]="true"
                height="640px"
              ></app-pdf-viewer>

              <app-pdf-viewer *ngSwitchCase="'brochure'"
                [src]="previewUrl() || ''"
                [title]="titleFor()"
                [showToolbar]="true"
                [useExtendedViewer]="true"
                height="640px"
              ></app-pdf-viewer>

              <sr-video-preview *ngSwitchCase="'video'"
                [src]="previewUrl()"
                [loadingLabel]="i18n.isArabic() ? 'جارِ تحميل الفيديو…' : 'Loading video…'"
              ></sr-video-preview>

              <div *ngSwitchDefault class="generic-preview">
                <i class="pi pi-file-edit" aria-hidden="true"></i>
                <p>{{ i18n.isArabic() ? 'المعاينة في المتصفح غير متاحة لهذا النوع.' : 'In-browser preview is not available for this type.' }}</p>
                <p *ngIf="!asset()!.allow_download" class="muted">
                  {{ i18n.isArabic() ? 'التحميل غير مسموح به.' : 'Download is not enabled.' }}
                </p>
              </div>
            </ng-container>
          </div>

          <!-- ── Download CTA — only if allow_download=true ── -->
          <footer class="cta-row">
            <button *ngIf="asset()!.allow_download; else dlDisabled"
                    type="button"
                    class="btn btn--primary"
                    [disabled]="downloadInFlight()"
                    (click)="onDownload()">
              <i class="pi pi-download" aria-hidden="true"></i>
              {{ downloadInFlight()
                  ? (i18n.isArabic() ? 'جارٍ التحضير…' : 'Preparing…')
                  : (i18n.isArabic() ? 'تحميل الملف' : 'Download') }}
            </button>
            <ng-template #dlDisabled>
              <button type="button" class="btn btn--ghost" disabled>
                <i class="pi pi-lock" aria-hidden="true"></i>
                {{ i18n.isArabic() ? 'التحميل غير متاح' : 'Download not available' }}
              </button>
            </ng-template>
          </footer>
        </section>
      </ng-container>
    </main>
  `,
  styles: [`
    :host { display: block; min-block-size: 100vh; background: var(--dos-color-surface-muted); }
    .detail { max-inline-size: 1080px; margin-inline: auto; padding-inline: 1rem; padding-block: 1.5rem; }

    .backlink {
      display: inline-flex; align-items: center; gap: 6px;
      margin-block-end: 1rem;
      font-size: var(--dos-font-size-sm);
      color: var(--dos-color-text-muted);
      text-decoration: none;
    }
    .backlink:hover { color: var(--dos-color-primary); }

    .head { margin-block-end: 1rem; }
    .head h1 {
      font-size: var(--dos-font-size-xl);
      font-weight: var(--dos-font-weight-bold);
      color: var(--dos-color-text);
      margin: 0;
      line-height: var(--dos-line-height-tight);
    }
    @media (min-width: 768px) { .head h1 { font-size: 2rem; } }
    .lede {
      color: var(--dos-color-text-muted);
      font-size: var(--dos-font-size-md);
      max-inline-size: 70ch;
      margin-block-start: 0.5rem;
    }

    .badges { display: flex; flex-wrap: wrap; gap: 6px; margin-block-end: 0.5rem; }
    .badge {
      font-size: var(--dos-font-size-xs);
      font-weight: var(--dos-font-weight-medium);
      padding-block: 2px; padding-inline: 8px;
      border-radius:var(--dos-radius-pill);
      background: var(--dos-color-primary-soft);
      color: var(--dos-color-primary-strong);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .badge--lead { background: var(--dos-color-surface-muted); color: var(--dos-color-warning); border: 1px solid var(--dos-color-warning); }

    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-block-end: 1rem; }
    .tag { font-size: var(--dos-font-size-xs); color: var(--dos-color-text-muted); }

    .viewer {
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border);
      border-radius:var(--dos-radius-card);
      padding: 0.75rem;
      box-shadow:var(--dos-shadow-card);
      margin-block-end: 1rem;
    }
    .generic-preview {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 3rem 1rem;
      color: var(--dos-color-text-muted);
    }
    .generic-preview .pi { font-size: var(--dos-font-size-xl); transform: scale(2); color: var(--dos-color-primary); }
    .muted { font-size: var(--dos-font-size-sm); }

    .cta-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding-block: 0.7rem; padding-inline: 1.2rem;
      font-size: var(--dos-font-size-sm);
      font-weight: var(--dos-font-weight-semibold);
      border-radius:var(--dos-radius-md);
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
    }
    .btn--primary { background: var(--dos-color-primary); color: var(--dos-color-text-inverse); }
    .btn--primary:hover { background: var(--dos-color-primary-strong); }
    .btn--primary[disabled] { opacity: 0.6; cursor: progress; }
    .btn--ghost { background: transparent; color: var(--dos-color-text-muted); border-color: var(--dos-color-border-strong); cursor: not-allowed; }

    .cta {
      display: inline-block;
      margin-block-start: 0.75rem;
      padding-block: 0.6rem; padding-inline: 1rem;
      background: var(--dos-color-primary);
      color: var(--dos-color-text-inverse);
      border-radius:var(--dos-radius-md);
      font-weight: var(--dos-font-weight-semibold);
      text-decoration: none;
    }

    .skeleton { padding-block: 1.5rem; }
    .skeleton-line {
      block-size: 14px;
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border);
      border-radius:var(--dos-radius-sm);
      margin-block-end: 0.7rem;
      inline-size: 60%;
      animation: skeletonShimmer 1.4s ease-in-out infinite;
    }
    .skeleton-line--wide { inline-size: 80%; block-size: 24px; }
    .skeleton-viewer {
      block-size: 480px;
      background: var(--dos-color-surface);
      border: 1px solid var(--dos-color-border);
      border-radius:var(--dos-radius-card);
      animation: skeletonShimmer 1.4s ease-in-out infinite;
    }
    @keyframes skeletonShimmer {
      0%, 100% { opacity: 0.7; }
      50%      { opacity: 0.4; }
    }
  `],
})
export class ResourceDetailPageComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(SalesRoomPublicApiService);

  readonly state = signal<LoadState>('loading');
  readonly asset = signal<PublicAsset | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly downloadInFlight = signal<boolean>(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(p => {
        const slug = p.get('slug');
        if (!slug) return of(null);
        return this.api.getBySlug(slug);
      }),
    ).subscribe(asset => {
      if (!asset) {
        this.state.set('not-found');
        this.asset.set(null);
        this.previewUrl.set(null);
        return;
      }
      this.asset.set(asset);
      this.state.set('ready');

      // Mint preview URL only if asset is preview-allowed.
      if (asset.allow_preview) {
        this.api.mintPreviewUrl(asset.slug).subscribe(url => this.previewUrl.set(url));
      }
    });
  }

  titleFor(): string {
    const a = this.asset();
    if (!a) return '';
    return this.i18n.isArabic() && a.title_ar?.trim() ? a.title_ar : a.title_en;
  }
  descFor(): string | null {
    const a = this.asset();
    if (!a) return null;
    return this.i18n.isArabic() && a.description_ar?.trim()
      ? a.description_ar
      : (a.description_en ?? null);
  }
  assetTypeLabel(): string {
    const a = this.asset();
    if (!a) return '';
    const map: Record<string, [string, string]> = {
      video: ['Video', 'فيديو'],
      pdf: ['PDF', 'PDF'],
      presentation: ['Presentation', 'عرض تقديمي'],
      brochure: ['Brochure', 'كتيّب'],
      onepager: ['One-pager', 'صفحة واحدة'],
      legal: ['Legal', 'قانوني'],
      technical: ['Technical', 'تقني'],
      image: ['Image', 'صورة'],
    };
    const pair = map[a.asset_type] ?? [a.asset_type, a.asset_type];
    return this.i18n.isArabic() ? pair[1] : pair[0];
  }

  onDownload() {
    const a = this.asset();
    if (!a || !a.allow_download) return;
    this.downloadInFlight.set(true);
    this.api.mintDownloadUrl(a.slug).pipe(
      map(url => url),
    ).subscribe({
      next: url => {
        this.downloadInFlight.set(false);
        if (url) window.location.assign(url);
      },
      error: () => this.downloadInFlight.set(false),
    });
  }
}
