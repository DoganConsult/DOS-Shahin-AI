import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { SidebarModule } from 'primeng/drawer';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { AnomalyInfo } from '../utils/kri-sparkline.util';

/**
 * Presentational drawer: 3-tab sidebar showing KRI overview (meta, threshold,
 * trend chart, anomaly stats), breach history, and linked risks.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-kri-detail-drawer',
    imports: [CommonModule, SidebarModule, TabsModule, TagModule, StatusBadgeComponent, AppDatePipe],
    template: `
    <p-sidebar [(visible)]="visible" position="right" [style]="{width:'560px'}" [modal]="true" (onHide)="closed.emit()">
      @if (kri) {
        <ng-template pTemplate="header">
          <div class="drawer-header-row">
            <span class="drawer-title">{{ kri.name }}</span>
            <p-tag [value]="kri.status" [severity]="kriTagSeverity(kri.status)" [rounded]="true" />
            <span *ngIf="isAnomaly" class="anomaly-badge lg">
              <i class="pi pi-exclamation-triangle"></i> {{ i18n.translate('risk.anomalyBadge') }}
            </span>
          </div>
        </ng-template>

        <p-tabs>
          <!-- Tab 1: Overview & Trend Chart -->
          <p-tabPanel [header]="i18n.translate('risk.overviewTab')">
            <div class="drawer-section">
              <div class="drawer-meta-grid">
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.owner') }}</span><span>{{ kri.owner || '&mdash;' }}</span></div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.linkedRisk') }}</span>
                  <a *ngIf="kri.linkedCategory" class="category-link" (click)="categoryClick.emit({ category: kri.linkedCategory, event: $event })">{{ kri.linkedCategory }}</a>
                  <span *ngIf="!kri.linkedCategory">&mdash;</span>
                </div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.currentValue') }}</span><span class="score-pill" [class]="kriStatusClass(kri.status)">{{ kri.currentValue }}</span></div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.lastUpdated') }}</span><span>{{ kri.lastUpdated | appDate:'short' }}</span></div>
              </div>
            </div>

            <!-- Threshold History -->
            <div class="drawer-section">
              <h5 class="drawer-subtitle">{{ i18n.translate('risk.thresholdHistory') }}</h5>
              <div class="threshold-bar">
                <span class="threshold-chip green">{{ i18n.translate('risk.thresholdGreen') }}: &le; {{ kri.threshold.green }}</span>
                <span class="threshold-chip amber">{{ i18n.translate('risk.thresholdAmber') }}: &le; {{ kri.threshold.amber }}</span>
                <span class="threshold-chip red">{{ i18n.translate('risk.thresholdRed') }}: &gt; {{ kri.threshold.red }}</span>
              </div>
            </div>

            <!-- Trend Chart (SVG) -->
            <div class="drawer-section">
              <h5 class="drawer-subtitle">{{ i18n.translate('risk.trendChart') }}</h5>
              <div *ngIf="trendSvg" class="drawer-trend-chart" [innerHTML]="trendSvg"></div>
              <div *ngIf="!trendSvg" class="empty-inline">{{ i18n.translate('risk.noTrendData') }}</div>
            </div>

            <!-- Anomaly Stats -->
            <div class="drawer-section" *ngIf="anomaly">
              <h5 class="drawer-subtitle">{{ i18n.translate('risk.anomalyAnalysis') }}</h5>
              <div class="drawer-meta-grid">
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.zScore') }}</span><span [class.text-danger]="anomaly.zScore > 2">{{ anomaly.zScore.toFixed(2) }}</span></div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.mean') }}</span><span>{{ anomaly.mean.toFixed(1) }}</span></div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.stdDev') }}</span><span>{{ anomaly.stdDev.toFixed(1) }}</span></div>
                <div class="drawer-meta"><span class="drawer-meta-label">{{ i18n.translate('risk.status') }}</span>
                  <span [class.text-danger]="anomaly.isAnomaly" [class.text-success]="!anomaly.isAnomaly">
                    {{ anomaly.isAnomaly ? i18n.translate('risk.anomalyDetected') : i18n.translate('risk.noAnomaly') }}
                  </span>
                </div>
              </div>
            </div>
          </p-tabPanel>

          <!-- Tab 2: Breach History -->
          <p-tabPanel [header]="i18n.translate('risk.breachHistory')">
            <div *ngIf="breaches.length > 0">
              <div *ngFor="let b of breaches" class="breach-card">
                <div class="breach-card-header">
                  <span class="breach-date">{{ b.breachDate | appDate:'short' }}</span>
                  <app-status-badge [status]="b.status" />
                </div>
                <div class="breach-card-body">
                  <span class="text-danger font-semibold">{{ i18n.translate('risk.value') }}: {{ b.value }}</span>
                  <span class="text-muted">{{ i18n.translate('risk.threshold') }}: {{ b.threshold }}</span>
                  <span *ngIf="b.actionTaken" class="text-xs">{{ b.actionTaken }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="breaches.length === 0" class="empty-inline">{{ i18n.translate('risk.noBreaches') }}</div>
          </p-tabPanel>

          <!-- Tab 3: Linked Risks -->
          <p-tabPanel [header]="i18n.translate('risk.linkedRisks')">
            <div *ngIf="linkedRisks.length > 0">
              <div *ngFor="let risk of linkedRisks" class="correlation-risk-row" (click)="riskClick.emit(risk.riskId)">
                <span class="correlation-risk-title">{{ risk.title }}</span>
                <span class="score-pill" [class]="riskScoreClass(risk.residualScore)">{{ risk.residualScore }}</span>
                <app-status-badge [status]="risk.status" />
              </div>
            </div>
            <div *ngIf="linkedRisks.length === 0" class="empty-inline">{{ i18n.translate('risk.noLinkedRisks') }}</div>
          </p-tabPanel>
        </p-tabs>
      }
    </p-sidebar>
  `,
    styles: [`
    .drawer-header-row { display: flex; align-items: center; gap: var(--space-sm, 8px); flex-wrap: wrap; }
    .drawer-title { font-size: var(--font-size-lg); font-weight: 700; }
    .drawer-section { margin-bottom: var(--space-lg, 16px); }
    .drawer-subtitle { font-size: var(--font-size-sm); font-weight: 600; color: var(--text); margin: 0 0 var(--space-sm, 8px) 0; text-transform: uppercase; letter-spacing: .4px; }
    .drawer-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm, 8px); }
    .drawer-meta { display: flex; flex-direction: column; gap: 2px; }
    .drawer-meta-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: .3px; }
    .threshold-bar { display: flex; gap: var(--space-sm, 8px); flex-wrap: wrap; }
    .threshold-chip { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); font-weight: 600; padding: 4px 10px; border-radius: var(--radius-lg); }
    .threshold-chip.green { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success, #16a34a); }
    .threshold-chip.amber { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning, #d97706); }
    .threshold-chip.red { background: rgba(var(--module-accent-red-rgb), .12); color: var(--error, #ef4444); }
    .drawer-trend-chart { padding: var(--space-sm, 8px); background: var(--surface-ground, #f9fafb); border-radius: var(--radius-md); }
    :host .drawer-trend-chart svg { width: 100%; height: auto; }
    .breach-card { background: var(--surface-ground, #f9fafb); border-radius: var(--radius-md); padding: var(--space-sm, 8px) var(--space-md, 12px); margin-bottom: var(--space-sm, 8px); }
    .breach-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .breach-date { font-size: var(--font-size-sm); font-weight: 600; }
    .breach-card-body { display: flex; gap: var(--space-md, 12px); flex-wrap: wrap; font-size: var(--font-size-sm); }
    .correlation-risk-row { display: flex; align-items: center; gap: var(--space-sm, 8px); padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; transition: background .15s; }
    .correlation-risk-row:hover { background: var(--surface-hover, rgba(var(--color-black-rgb), .04)); }
    .correlation-risk-title { flex: 1; font-size: var(--font-size-sm); }
    .score-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; padding: 0 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 700; }
    .score-pill.score-danger { background: rgba(var(--module-accent-red-rgb), .12); color: var(--error); }
    .score-pill.score-warning { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning); }
    .score-pill.score-success { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success); }
    .score-pill.score-info { background: rgba(var(--module-accent-blue-rgb), .12); color: var(--primary); }
    .anomaly-badge { display: inline-flex; align-items: center; gap: 3px; font-size: var(--font-size-nano); font-weight: 600; color: var(--severity-high, #7c3aed); background: rgba(var(--color-violet-600-rgb), .1); padding: 2px 6px; border-radius: var(--radius-md); white-space: nowrap; }
    .anomaly-badge.lg { font-size: var(--font-size-sm); padding: 3px 8px; }
    .anomaly-badge i { font-size: var(--font-size-nano); }
    .category-link { color: var(--primary); cursor: pointer; text-decoration: none; font-weight: 500; }
    .category-link:hover { text-decoration: underline; }
    .text-danger { color: var(--error); }
    .text-success { color: var(--success); }
    .text-muted { color: var(--text-muted); }
    .text-xs { font-size: var(--font-size-sm); }
    .font-semibold { font-weight: 600; }
    .empty-inline { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: var(--space-md, 12px) 0; }
  `]
})
export class KriDetailDrawerComponent {
  public i18n = inject(I18nService);

  /** The KRI item to display in the drawer */
  @Input() kri: Record<string, any> | null = null;

  /** Drawer visibility */
  @Input() visible = false;

  /** Whether this KRI is flagged as anomalous */
  @Input() isAnomaly = false;

  /** Sanitized SVG trend chart string */
  @Input() trendSvg: string | null = null;

  /** Anomaly analysis data */
  @Input() anomaly: AnomalyInfo | null = null;

  /** Breach history for this KRI */
  @Input() breaches: Array<Record<string, any>> = [];

  /** Linked risks from correlation data */
  @Input() linkedRisks: Array<{ riskId: string; title: string; category: string; residualScore: number; status: string }> = [];

  /** Emitted when drawer is closed */
  @Output() closed = new EventEmitter<void>();

  /** Emitted when a category link is clicked */
  @Output() categoryClick = new EventEmitter<{ category: string; event: Event }>();

  /** Emitted when a linked risk row is clicked */
  @Output() riskClick = new EventEmitter<string>();

  /** CSS class for score pill based on KRI status */
  kriStatusClass(status: string): string {
    const map: Record<string, string> = { breach: 'score-danger', warning: 'score-warning', normal: 'score-success' };
    return map[status] || 'score-info';
  }

  /** PrimeNG tag severity based on KRI status */
  kriTagSeverity(status: string): 'danger' | 'warning' | 'success' | 'info' {
    const map: Record<string, 'danger' | 'warning' | 'success' | 'info'> = { breach: 'danger', warning: 'warning', normal: 'success' };
    return map[status] || 'info';
  }

  /** CSS class for risk score pill */
  riskScoreClass(score: number): string {
    if (score >= 15) return 'score-danger';
    if (score >= 8) return 'score-warning';
    return 'score-success';
  }
}
