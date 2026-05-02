import { Component, Input, OnInit, OnChanges, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GuidedExperienceService, PageHelp } from './guided-experience.service';
import { StorageService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-hub-help-panel',
    imports: [CommonModule, RouterLink],
    template: `
    @if (help) {
      <button class="help-trigger" (click)="toggleDrawer()" [attr.aria-expanded]="drawerOpen()"
        [attr.aria-label]="i18n.translate('hubHelp.help')" [title]="i18n.translate('hubHelp.howToUse')">
        <i class="pi pi-question-circle"></i>
      </button>

      @if (drawerOpen()) {
        <div tabindex="0" role="button" (keyup.enter)="drawerOpen.set(false)" class="help-backdrop" (click)="drawerOpen.set(false)"></div>
        <aside class="help-drawer" [attr.dir]="i18n.direction()" role="dialog"
          [attr.aria-label]="i18n.translate('hubHelp.pageHelp')">

          <div class="hd-header">
            <div class="hd-title-row">
              <i class="pi pi-question-circle"></i>
              <span class="hd-title">{{ i18n.translate('hubHelp.howToUse') }}</span>
            </div>
            <button class="hd-close" (click)="drawerOpen.set(false)" [attr.aria-label]="i18n.translate('common.close')">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <p class="hd-purpose">{{ i18n.localize(help.purpose, help.purposeAr) }}</p>

          @if (help.howToUse.length) {
            <div class="hd-section">
              <h4 class="hd-section-title">{{ i18n.translate('hubHelp.steps') }}</h4>
              <ol class="hd-steps">
                @for (step of (i18n.currentLang() === 'ar' ? help.howToUseAr : help.howToUse); track step) {
                  <li>{{ step }}</li>
                }
              </ol>
            </div>
          }

          @if (help.commonActions.length) {
            <div class="hd-section">
              <h4 class="hd-section-title">{{ i18n.translate('hubHelp.quickActions') }}</h4>
              <div class="hd-actions">
                @for (action of help.commonActions; track action.label) {
                  @if (action.route) {
                    <a [routerLink]="action.route" class="hd-action" (click)="drawerOpen.set(false)">
                      <span class="hd-action-label">{{ i18n.localize(action.label, action.labelAr) }}</span>
                      <span class="hd-action-desc">{{ i18n.localize(action.description, action.descriptionAr) }}</span>
                      <i class="pi pi-chevron-right hd-action-arrow"></i>
                    </a>
                  } @else {
                    <div class="hd-action">
                      <span class="hd-action-label">{{ i18n.localize(action.label, action.labelAr) }}</span>
                      <span class="hd-action-desc">{{ i18n.localize(action.description, action.descriptionAr) }}</span>
                    </div>
                  }
                }
              </div>
            </div>
          }

          @if (help.faq.length) {
            <div class="hd-section">
              <h4 class="hd-section-title">{{ i18n.translate('hubHelp.faq') }}</h4>
              @for (faq of help.faq; track faq.question) {
                <div class="hd-faq">
                  <button class="hd-faq-q" (click)="toggleFaq(faq)">
                    <i class="pi" [ngClass]="expandedFaq === faq ? 'pi-chevron-down' : 'pi-chevron-right'"></i>
                    <span>{{ i18n.localize(faq.question, faq.questionAr) }}</span>
                  </button>
                  @if (expandedFaq === faq) {
                    <div class="hd-faq-a">{{ i18n.localize(faq.answer, faq.answerAr) }}</div>
                  }
                </div>
              }
            </div>
          }

          @if (help.relatedPages.length) {
            <div class="hd-section">
              <h4 class="hd-section-title">{{ i18n.translate('hubHelp.related') }}</h4>
              <div class="hd-related">
                @for (page of help.relatedPages; track page.route) {
                  <a [routerLink]="page.route" class="hd-related-link" (click)="drawerOpen.set(false)">
                    <i class="pi pi-chevron-right"></i>
                    {{ i18n.localize(page.label, page.labelAr) }}
                  </a>
                }
              </div>
            </div>
          }

          <div class="hd-footer">
            <button class="hd-dont-show" (click)="dismissForRoute()">
              {{ i18n.translate('hubHelp.dontShowAgain') }}
            </button>
          </div>
        </aside>
      }
    }
  `,
    styles: [`
    :host { display: contents; }

    .help-trigger {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: var(--radius-pill);
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-200, var(--border-subtle));
      color: var(--text-muted, var(--text-muted)); cursor: pointer;
      transition: background .15s, color .15s, border-color .15s;
      flex-shrink: 0;
    }
    .help-trigger:hover { background: var(--primary-50, #eff6ff); color: var(--primary-600, #2563eb); border-color: var(--primary-200, #bfdbfe); }
    .help-trigger:focus-visible { box-shadow: 0 0 0 2px var(--primary-200, #bfdbfe); outline: none; }
    .help-trigger .pi { font-size: var(--font-size-base); }

    .help-backdrop {
      position: fixed; inset: 0; z-index: var(--z-modal-backdrop);
      background: rgba(var(--color-black-rgb), .18);
      animation: fadeIn .15s ease-out;
    }

    .help-drawer {
      position: fixed; top: 0; inset-inline-end: 0;
      width: 340px; max-width: 90vw; height: 100vh;
      background: var(--surface-card, #fff);
      box-shadow: -4px 0 24px rgba(var(--color-black-rgb), .12);
      z-index: var(--z-modal); overflow-y: auto;
      padding: 20px; display: flex; flex-direction: column; gap: 14px;
      animation: drawerSlide .2s ease-out;
    }
    :host-context([dir="rtl"]) .help-drawer { box-shadow: 4px 0 24px rgba(var(--color-black-rgb), .12); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes drawerSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
    :host-context([dir="rtl"]) .help-drawer { animation-name: drawerSlideRtl; }
    @keyframes drawerSlideRtl { from { transform: translateX(-100%); } to { transform: translateX(0); } }

    .hd-header { display: flex; justify-content: space-between; align-items: center; }
    .hd-title-row { display: flex; align-items: center; gap: 8px; }
    .hd-title-row .pi { font-size: var(--font-size-lg); color: var(--primary); }
    .hd-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, #0c4a6e); }
    .hd-close { background: none; border: none; color: var(--text-muted, var(--text-muted)); cursor: pointer; padding: 6px; border-radius: var(--radius-sm); }
    .hd-close:hover { background: var(--surface-100, var(--surface-ice)); color: var(--text-heading, var(--text-heading)); }

    .hd-purpose { font-size: var(--font-size-sm); color: var(--text-body, #475569); line-height: 1.5; margin: 0; }

    .hd-section { display: flex; flex-direction: column; gap: 6px; }
    .hd-section-title { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .06em; margin: 0; }

    .hd-steps { margin: 0; padding-inline-start: 20px; font-size: var(--font-size-sm); color: var(--text-body, #475569); line-height: 1.6; list-style-type: decimal; }

    .hd-actions { display: flex; flex-direction: column; gap: 6px; }
    .hd-action {
      padding: 8px 12px; border-radius: var(--radius-sm); background: var(--surface-50, var(--status-info-bg, #edf5ff)); border: 1px solid var(--surface-200, #e0f2fe);
      display: flex; flex-direction: column; gap: 2px; text-decoration: none; position: relative; transition: background .15s, border-color .15s;
    }
    a.hd-action:hover { background: #dbeafe; border-color: #93c5fd; }
    .hd-action-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-700, #1e40af); }
    .hd-action-desc { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }
    .hd-action-arrow { position: absolute; top: 50%; inset-inline-end: 10px; transform: translateY(-50%); font-size: var(--font-size-xs); color: #93c5fd; }
    :host-context([dir="rtl"]) .hd-action-arrow { transform: translateY(-50%) scaleX(-1); }

    .hd-faq { margin-bottom: 4px; }
    .hd-faq-q {
      display: flex; align-items: center; gap: 6px; width: 100%; text-align: start;
      background: none; border: none; cursor: pointer; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, #334155);
      padding: 6px 8px; border-radius: var(--radius-sm); transition: background .15s;
    }
    .hd-faq-q:hover { background: var(--surface-50, var(--status-info-bg, #edf5ff)); }
    .hd-faq-q .pi { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); flex-shrink: 0; }
    .hd-faq-a { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); line-height: 1.5; padding: 6px 8px 6px 24px; background: var(--surface-50, var(--surface-ice)); border-radius: var(--radius-sm); margin-top: 2px; }

    .hd-related { display: flex; flex-wrap: wrap; gap: 6px; }
    .hd-related-link {
      display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); font-weight: 500;
      color: var(--primary); text-decoration: none; padding: 4px 10px; border-radius: var(--radius-sm);
      border: 1px solid #e0f2fe; transition: all .15s;
    }
    .hd-related-link:hover { background: var(--status-info-bg, #edf5ff); border-color: var(--primary); }
    .hd-related-link .pi { font-size: var(--font-size-xs); }
    :host-context([dir="rtl"]) .hd-related-link .pi { transform: scaleX(-1); }

    .hd-footer { margin-top: auto; padding-top: 12px; border-top: 1px solid var(--surface-200, var(--border-subtle)); }
    .hd-dont-show {
      background: none; border: none; cursor: pointer; font-size: var(--font-size-xs); font-weight: 500;
      color: var(--text-muted, var(--text-muted)); padding: 4px 0; transition: color .15s;
    }
    .hd-dont-show:hover { color: var(--text-heading, var(--text-heading)); }

    @media (max-width: 480px) {
      .help-drawer { width: 100vw; max-width: 100vw; border-radius: var(--radius-xl) 16px 0 0; top: auto; bottom: 0; height: auto; max-height: 85vh; animation-name: drawerSlideUp; }
      @keyframes drawerSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    }
  `]
})
export class HubHelpPanelComponent implements OnInit, OnChanges {
  @Input() hubRoute = '';

  i18n = inject(I18nService);
  private guided = inject(GuidedExperienceService);
  private _storage = inject(StorageService);

  help: PageHelp | null = null;
  drawerOpen = signal(false);
  expandedFaq: GrcRecord | null = null;

  ngOnInit(): void { this.loadHelp(); }
  ngOnChanges(): void { this.loadHelp(); }

  private loadHelp(): void {
    if (!this.hubRoute) return;
    const dismissKey = 'hub_help_dismissed_' + this.hubRoute.replace(/\//g, '_');
    if (this._storage.get(dismissKey) === '1') {
      this.guided.getPageHelp(this.hubRoute).subscribe(h => { this.help = h; });
      return;
    }
    this.guided.getPageHelp(this.hubRoute).subscribe(h => { this.help = h; });
  }

  toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  toggleFaq(faq: GrcRecord): void {
    this.expandedFaq = this.expandedFaq === faq ? null : faq;
  }

  dismissForRoute(): void {
    const dismissKey = 'hub_help_dismissed_' + this.hubRoute.replace(/\//g, '_');
    this._storage.set(dismissKey, '1');
    this.drawerOpen.set(false);
  }
}
