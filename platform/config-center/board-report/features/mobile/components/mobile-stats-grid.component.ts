import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Stats shape consumed by the mobile stats grid. */
export interface MobileDashStats {
  pendingControls: number;
  evidenceQueue: number;
  activePolicies: number;
  frameworks: number;
  aiInsights: number;
  openIncidents: number;
}

/**
 * Dumb component: renders the horizontally scrollable quick metric cards
 * on the mobile dashboard (controls, evidence, policies, frameworks, AI, incidents).
 */
@Component({
    selector: 'app-mobile-stats-grid',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule],
    template: `
    <div class="mob-section-header">
      <span>{{ isRtl() ? 'المقاييس الرئيسية' : 'Key Metrics' }}</span>
      <button class="mob-see-all" (click)="navigate.emit('/workspace-home')">{{ isRtl() ? 'عرض الكل' : 'See All' }}</button>
    </div>

    <div class="mob-metrics-scroll">
      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/controls')" class="mob-metric-card mob-metric-controls" (click)="navigate.emit('/controls')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.pendingControls ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'ضوابط' : 'Controls' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'معلّقة' : 'Pending' }}</div>
      </div>

      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/evidence-tasks')" class="mob-metric-card mob-metric-evidence" (click)="navigate.emit('/evidence-tasks')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.evidenceQueue ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'أدلة' : 'Evidence' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'في الانتظار' : 'In Queue' }}</div>
      </div>

      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/policies')" class="mob-metric-card mob-metric-policies" (click)="navigate.emit('/policies')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.activePolicies ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'سياسات' : 'Policies' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'نشطة' : 'Active' }}</div>
      </div>

      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/frameworks')" class="mob-metric-card mob-metric-frameworks" (click)="navigate.emit('/frameworks')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.frameworks ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'أطر' : 'Frameworks' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'مُفعّلة' : 'Active' }}</div>
      </div>

      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/ai-hub')" class="mob-metric-card mob-metric-ai" (click)="navigate.emit('/ai-hub')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.aiInsights ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'رؤى AI' : 'AI Insights' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'جديدة' : 'New' }}</div>
      </div>

      <div tabindex="0" role="button" (keyup.enter)="navigate.emit('/incidents')" class="mob-metric-card mob-metric-incidents" (click)="navigate.emit('/incidents')">
        <div class="mob-metric-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="mob-metric-val">{{ stats?.openIncidents ?? '--' }}</div>
        <div class="mob-metric-label">{{ isRtl() ? 'حوادث' : 'Incidents' }}</div>
        <div class="mob-metric-sub">{{ isRtl() ? 'مفتوحة' : 'Open' }}</div>
      </div>
    </div>
  `,
    styles: [`
    .mob-section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px 4px; margin-top: 4px;
    }
    .mob-section-header > span { font-size: var(--font-size-sm); font-weight: 600; color: rgba(var(--color-white-rgb), 0.6); text-transform: uppercase; letter-spacing: 0.05em; }
    .mob-see-all { background: none; border: none; color: var(--primary); font-size: var(--font-size-sm); cursor: pointer; padding: 4px 0; }

    .mob-metrics-scroll {
      display: flex; gap: 10px;
      padding: 8px 16px 4px; overflow-x: auto; scroll-snap-type: x mandatory;
      scrollbar-width: none; -ms-overflow-style: none;
    }
    .mob-metrics-scroll::-webkit-scrollbar { display: none; }

    .mob-metric-card {
      flex-shrink: 0; width: 100px; border-radius: var(--radius-xl); padding: 14px 12px;
      scroll-snap-align: start; cursor: pointer;
      background: rgba(var(--color-white-rgb), 0.04); border: 1px solid rgba(var(--color-white-rgb), 0.06);
      transition: transform 0.15s, background 0.2s;
      display: flex; flex-direction: column; align-items: center; text-align: center;
    }
    .mob-metric-card:active { transform: scale(0.95); background: rgba(var(--color-white-rgb), 0.08); }

    .mob-metric-icon {
      width: 36px; height: 36px; border-radius: var(--radius-md); margin-bottom: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .mob-metric-val { font-size: var(--font-size-2xl); font-weight: 800; line-height: 1; margin-bottom: 2px; }
    .mob-metric-label { font-size: var(--font-size-xs); font-weight: 600; color: rgba(var(--color-white-rgb), 0.7); }
    .mob-metric-sub { font-size: var(--font-size-xs); color: rgba(var(--color-white-rgb), 0.35); }

    .mob-metric-controls .mob-metric-icon { background: color-mix(in srgb, var(--hub-governance) 15%, transparent); color: var(--hub-governance); }
    .mob-metric-controls .mob-metric-val { color: var(--hub-governance); }
    .mob-metric-evidence .mob-metric-icon { background: color-mix(in srgb, var(--hub-compliance) 15%, transparent); color: var(--hub-compliance); }
    .mob-metric-evidence .mob-metric-val { color: var(--hub-compliance); }
    .mob-metric-policies .mob-metric-icon { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
    .mob-metric-policies .mob-metric-val { color: var(--success); }
    .mob-metric-frameworks .mob-metric-icon { background: color-mix(in srgb, var(--hub-assessment) 15%, transparent); color: var(--hub-assessment); }
    .mob-metric-frameworks .mob-metric-val { color: var(--hub-assessment); }
    .mob-metric-ai .mob-metric-icon { background: color-mix(in srgb, var(--hub-evidence) 15%, transparent); color: var(--hub-evidence); }
    .mob-metric-ai .mob-metric-val { color: var(--hub-evidence); }
    .mob-metric-incidents .mob-metric-icon { background: color-mix(in srgb, var(--hub-risk) 15%, transparent); color: var(--severity-critical); }
    .mob-metric-incidents .mob-metric-val { color: var(--severity-critical); }
  `]
})
export class MobileStatsGridComponent {
  private readonly i18n = inject(I18nService);

  @Input() stats: MobileDashStats | null = null;

  @Output() navigate = new EventEmitter<string>();

  /** Computed RTL flag based on i18n direction. */
  readonly isRtl = computed(() => this.i18n.direction() === 'rtl');
}
