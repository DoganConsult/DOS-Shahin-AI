/**
 * Governance KPI Strip — Dumb sub-component
 * Renders the policy lifecycle band (draft/review/approved/retired counts)
 * and the readiness progress bar for the governance overview.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Lifecycle state counts */
export interface LifecycleStates {
  draft: number;
  review: number;
  approved: number;
  retired: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-kpi-strip',
    imports: [CommonModule],
    template: `
    <div class="lifecycle-band">
      <div tabindex="0" role="button" (keyup.enter)="pillClick.emit('draft')" class="lc-pill lc-draft" (click)="pillClick.emit('draft')">
        <span class="lc-count">{{ lifecycleStates.draft }}</span>
        <span class="lc-label">{{ i18n.translate('Draft') }}</span>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="pillClick.emit('review')" class="lc-pill lc-review" (click)="pillClick.emit('review')">
        <span class="lc-count">{{ lifecycleStates.review }}</span>
        <span class="lc-label">{{ i18n.translate('In Review') }}</span>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="pillClick.emit('approved')" class="lc-pill lc-approved" (click)="pillClick.emit('approved')">
        <span class="lc-count">{{ lifecycleStates.approved }}</span>
        <span class="lc-label">{{ i18n.translate('Approved') }}</span>
      </div>
      <div tabindex="0" role="button" (keyup.enter)="pillClick.emit('retired')" class="lc-pill lc-retired" (click)="pillClick.emit('retired')">
        <span class="lc-count">{{ lifecycleStates.retired }}</span>
        <span class="lc-label">{{ i18n.translate('Retired') }}</span>
      </div>
      <div class="lc-divider"></div>
      <div class="lc-readiness">
        <span class="lc-rl">{{ i18n.translate('Readiness') }}</span>
        <div class="lc-track">
          <div class="lc-fill"
               [style.width.%]="readinessScore"
               [class.lc-fill-low]="readinessScore < 50"
               [class.lc-fill-high]="readinessScore >= 80"></div>
        </div>
        <span class="lc-pct">{{ readinessScore }}%</span>
      </div>
    </div>
  `,
    styles: [`
    .lifecycle-band {
      display: flex; align-items: center; gap: 0; padding: 12px 16px;
      background: var(--surface-card, #fff); border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md); flex-wrap: wrap; gap: 4px;
    }
    .lc-pill {
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 16px; border-radius: var(--radius); cursor: pointer;
      transition: filter 150ms; min-width: 72px; gap: 2px;
    }
    .lc-pill:hover { filter: brightness(0.93); }
    .lc-draft    { background: var(--surface-ice); }
    .lc-review   { background: var(--status-warning-bg, #fcf4d6); }
    .lc-approved { background: #d1fae5; }
    .lc-retired  { background: var(--surface-ice); }
    .lc-count { font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .lc-review   .lc-count { color: var(--warning); }
    .lc-approved .lc-count { color: var(--success); }
    .lc-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); font-weight: 500; }
    .lc-divider { width: 1px; height: 40px; background: var(--border-subtle, var(--border-subtle)); margin: 0 12px; }
    .lc-readiness { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; }
    .lc-rl { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, var(--text-muted)); white-space: nowrap; }
    .lc-track { flex: 1; height: 8px; background: var(--surface-100, var(--surface-ice)); border-radius: var(--radius-xs); overflow: hidden; }
    .lc-fill { height: 100%; background: var(--primary-500, var(--primary)); border-radius: var(--radius-xs); transition: width 400ms ease; }
    .lc-fill-low  { background: var(--warning); }
    .lc-fill-high { background: var(--success); }
    .lc-pct { font-size: var(--font-size-sm); font-weight: 700; min-width: 34px; color: var(--text-heading, var(--text-heading)); }

    @media (max-width: 768px) {
      .lifecycle-band { gap: 8px; }
      .lc-divider { display: none; }
      .lc-readiness { min-width: 100%; }
    }
  `]
})
export class GovernanceKpiStripComponent {
  readonly i18n = inject(I18nService);

  @Input() lifecycleStates: LifecycleStates = { draft: 0, review: 0, approved: 0, retired: 0 };
  @Input() readinessScore = 0;

  /** Emits the lifecycle status slug that was clicked */
  @Output() pillClick = new EventEmitter<string>();
}
