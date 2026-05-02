import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy,
  computed, signal, inject, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from './icon.component';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  describeFreshness,
  shouldDisplayHealthTag,
} from './module-masthead.labels';

export type ModuleHealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface MastheadConfig {
  moduleCode: string;
  moduleName: { en: string; ar: string };
  moduleIcon: string;
  moduleAccentToken: string;
  purposeLine: { en: string; ar: string };
  healthLevel: ModuleHealthLevel;
  dataFreshnessIso?: string;
  primaryAiAction: { id: string; label: { en: string; ar: string }; icon: string };
  breadcrumbs?: Array<{ label: string; route?: string }>;
  lang: 'en' | 'ar';
}

@Component({
    selector: 'app-module-masthead',
    imports: [CommonModule, RouterLink, TooltipModule, TagModule, ButtonModule, BadgeModule, IconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="mh" [attr.dir]="config.lang === 'ar' ? 'rtl' : 'ltr'"
         [style.--mh-accent]="config.moduleAccentToken">
      <nav class="mh-breadcrumbs" *ngIf="config.breadcrumbs?.length">
        <ng-container *ngFor="let crumb of config.breadcrumbs; let last = last">
          <a *ngIf="crumb.route && !last" [routerLink]="crumb.route" class="mh-crumb">{{ crumb.label }}</a>
          <span *ngIf="!crumb.route || last" class="mh-crumb" [class.mh-crumb--active]="last">{{ crumb.label }}</span>
          <i *ngIf="!last" class="pi pi-chevron-right mh-sep" aria-hidden="true"></i>
        </ng-container>
      </nav>

      <div class="mh-main">
        <div class="mh-identity">
          <div class="mh-icon-wrap" [style.background]="'var(--' + config.moduleAccentToken + '-10, var(--primary-50))'">
            <app-icon [name]="config.moduleIcon" type="route" size="lg" />
          </div>
          <div class="mh-text">
            <h1 class="mh-title">{{ config.lang === 'ar' ? config.moduleName.ar : config.moduleName.en }}</h1>
            <p class="mh-purpose">{{ config.lang === 'ar' ? config.purposeLine.ar : config.purposeLine.en }}</p>
          </div>
        </div>

        <div class="mh-badges">
          @if (showHealthTag()) {
            <p-tag [value]="healthLabel" [severity]="healthSeverity" [rounded]="true"
                   [pTooltip]="healthTooltip()" tooltipPosition="bottom" />
          }
          <span class="mh-freshness" *ngIf="config.dataFreshnessIso" [pTooltip]="freshTooltip()">
            <i class="pi pi-sync"></i>
            {{ freshLabel() }}
          </span>
        </div>

        <div class="mh-actions">
          <button pButton [label]="config.lang === 'ar' ? config.primaryAiAction.label.ar : config.primaryAiAction.label.en"
                  [icon]="'pi pi-' + config.primaryAiAction.icon" severity="secondary" size="small"
                  (click)="aiAction.emit(config.primaryAiAction.id)"></button>
          <ng-content select="[mastheadActions]"></ng-content>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .mh { padding: var(--cds-spacing-05) var(--cds-spacing-06) 0; background: var(--shell-card-bg); border-bottom: 1px solid var(--shell-card-border); }
    .mh-breadcrumbs { display: flex; align-items: center; gap: var(--cds-spacing-02); margin-bottom: calc(var(--cds-spacing-03) + var(--cds-spacing-01)); flex-wrap: wrap; }
    .mh-crumb { font-size: var(--font-size-caption); font-weight: 500; color: var(--text-muted); text-decoration: none; }
    .mh-crumb:hover:not(.mh-crumb--active) { text-decoration: underline; }
    .mh-crumb--active { color: var(--text-body); font-weight: 600; }
    .mh-sep { font-size: var(--font-size-xs); color: var(--text-muted); }
    [dir="rtl"] .mh-sep { transform: scaleX(-1); }
    .mh-main { display: flex; align-items: center; gap: var(--cds-spacing-05); padding-bottom: var(--cds-spacing-05); flex-wrap: wrap; }
    .mh-identity { display: flex; align-items: center; gap: var(--cds-spacing-04); flex: 1; min-width: 0; }
    .mh-icon-wrap { width: var(--cds-spacing-09); height: var(--cds-spacing-09); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mh-text { min-width: 0; }
    .mh-title { margin: 0; font-size: var(--cds-heading-03-size); font-weight: 700; color: var(--text-heading); line-height: 1.3; }
    .mh-purpose { margin: var(--cds-spacing-01) 0 0; font-size: var(--font-size-caption); color: var(--text-muted); }
    .mh-badges { display: flex; align-items: center; gap: var(--cds-spacing-03); flex-shrink: 0; }
    .mh-freshness { display: inline-flex; align-items: center; gap: var(--cds-spacing-02); font-size: var(--font-size-sm); color: var(--text-muted); padding: var(--cds-spacing-01) var(--cds-spacing-03); border-radius: var(--radius-lg); background: var(--cds-layer-01); border: 1px solid var(--shell-card-border); cursor: default; }
    .mh-freshness .pi { font-size: var(--font-size-xs); }
    .mh-actions { display: flex; align-items: center; gap: var(--cds-spacing-03); flex-shrink: 0; }
    @media (max-width: 768px) {
      .mh { padding: var(--cds-spacing-04) var(--cds-spacing-04) 0; }
      .mh-main { flex-direction: column; align-items: flex-start; }
      .mh-actions { width: 100%; }
    }
  `]
})
export class ModuleMastheadComponent implements OnInit {
  @Input() config!: MastheadConfig;
  @Output() aiAction = new EventEmitter<string>();

  private destroyRef = inject(DestroyRef);
  private i18n = inject(I18nService);
  private now = signal(Date.now());

  readonly showHealthTag = computed(() => shouldDisplayHealthTag(this.config?.healthLevel));
  readonly freshnessDescriptor = computed(() => describeFreshness(this.now(), this.config?.dataFreshnessIso));

  get healthLabel(): string {
    const key: Record<ModuleHealthLevel, string> = { healthy: 'common.healthy', warning: 'common.warning', critical: 'common.critical', unknown: 'common.unknown' };
    return this.i18n.translate(key[this.config.healthLevel] || 'common.unknown');
  }

  get healthSeverity(): 'success' | 'warning' | 'danger' | 'info' {
    const map: Record<ModuleHealthLevel, 'success' | 'warning' | 'danger' | 'info'> = { healthy: 'success', warning: 'warning', critical: 'danger', unknown: 'info' };
    return map[this.config.healthLevel] || 'info';
  }

  readonly healthTooltip = computed(() =>
    this.i18n.translate('moduleChrome.healthTooltip', { status: this.healthLabel }),
  );

  freshLabel = computed(() => {
    const freshness = this.freshnessDescriptor();
    if (!freshness) return '';

    switch (freshness.unit) {
      case 'just-now':
        return this.i18n.translate('moduleChrome.freshness.justNow');
      case 'minutes':
        return this.i18n.translate('moduleChrome.freshness.minutesAgo', { count: freshness.count ?? 0 });
      case 'hours':
        return this.i18n.translate('moduleChrome.freshness.hoursAgo', { count: freshness.count ?? 0 });
      case 'days':
        return this.i18n.translate('moduleChrome.freshness.daysAgo', { count: freshness.count ?? 0 });
    }
  });

  freshTooltip = computed(() => {
    if (!this.config?.dataFreshnessIso) return '';
    const locale = this.config.lang === 'ar' ? 'ar-SA' : 'en-US';
    return this.i18n.translate('moduleChrome.freshness.lastSync', {
      timestamp: new Date(this.config.dataFreshnessIso).toLocaleString(locale),
    });
  });

  ngOnInit() {
    interval(60000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.now.set(Date.now()));
  }
}
