import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';

/**
 * Presentational component: renders the 5x5 risk heatmap grid with
 * color-coded cells, migration arrows overlay, summary sidebar, and
 * migration statistics. Emits cell click events for drill-down.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-heatmap-canvas',
    imports: [CommonModule, TooltipModule, ButtonModule, DecimalPipe],
    template: `
    <!-- Migration legend -->
    <div *ngIf="mode === 'migration'" class="migration-legend mb-3">
      <span class="legend-item">
        <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="var(--success, #22c55e)" stroke-width="2" marker-end="url(#legendArrowGreen)" /><defs><marker id="legendArrowGreen" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="var(--success, #22c55e)" /></marker></defs></svg>
        {{ labels.migrationReduced }}
      </span>
      <span class="legend-item">
        <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="#9ca3af" stroke-width="2" marker-end="url(#legendArrowGray)" /><defs><marker id="legendArrowGray" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#9ca3af" /></marker></defs></svg>
        {{ labels.migrationNoChange }}
      </span>
      <span class="legend-item">
        <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="var(--error, #ef4444)" stroke-width="2" marker-end="url(#legendArrowRed)" /><defs><marker id="legendArrowRed" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="var(--error, #ef4444)" /></marker></defs></svg>
        {{ labels.migrationIncreased }}
      </span>
      <span class="legend-count" *ngIf="migrationData.length > 0">
        {{ migrationData.length }} {{ labels.risksTracked }}
      </span>
    </div>

    <!-- Heatmap grid + sidebar -->
    <div class="heatmap-layout">
      <div class="heatmap-container">
        <div class="heatmap-ylabel">{{ labels.impact }}</div>
        <div class="heatmap-main" style="position: relative;">
          <div *ngFor="let row of [5,4,3,2,1]" class="heatmap-row">
            <div class="heatmap-axis-label">{{ impactLabels[row - 1] || row }}</div>
            <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-cell"
              [style.background]="cellColor(row, col)"
              [class.heatmap-cell-active]="getCellCount(col, row) > 0"
              [class.heatmap-cell-empty]="getCellCount(col, row) === 0"
              (click)="cellClick.emit({ likelihood: col, impact: row })"
              [pTooltip]="getCellTooltip(col, row)">
              <span *ngIf="getCellCount(col, row) > 0" class="heatmap-count">{{ getCellCount(col, row) }}</span>
            </div>
          </div>

          <!-- SVG overlay for migration arrows -->
          <svg *ngIf="mode === 'migration' && migrationData.length > 0" class="migration-svg-overlay"
               [attr.width]="5 * 75" [attr.height]="5 * 59">
            <defs>
              <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--success, #22c55e)" />
              </marker>
              <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
              </marker>
              <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--error, #ef4444)" />
              </marker>
            </defs>
            <ng-container *ngFor="let m of migrationData">
              <line
                [attr.x1]="migrationX(m.inherent.likelihood)"
                [attr.y1]="migrationY(m.inherent.impact)"
                [attr.x2]="migrationX(m.residual.likelihood)"
                [attr.y2]="migrationY(m.residual.impact)"
                [attr.stroke]="migrationStroke(m)"
                stroke-width="2"
                [attr.marker-end]="migrationMarker(m)"
                [attr.stroke-opacity]="0.75"
                class="migration-arrow"
                (click)="riskClick.emit(m.riskId)">
                <title>{{ m.title }} | {{ labels.inherentView }}: {{ m.inherent.likelihood }}x{{ m.inherent.impact }}={{ m.inherent.likelihood * m.inherent.impact }} &rarr; {{ labels.residualView }}: {{ m.residual.likelihood }}x{{ m.residual.impact }}={{ m.residual.likelihood * m.residual.impact }}</title>
              </line>
            </ng-container>
          </svg>

          <div class="heatmap-row heatmap-xlabel-row">
            <div class="heatmap-axis-label"></div>
            <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-xlabel">{{ likelihoodLabels[col - 1] || col }}</div>
          </div>
          <div class="heatmap-xlabel-title">{{ labels.likelihood }}</div>
        </div>
      </div>

      <!-- Summary sidebar -->
      <div class="heatmap-sidebar">
        <div class="heatmap-summary">
          <div class="hm-stat"><span class="hm-stat-count danger">{{ summary.critical }}</span><span class="hm-stat-label">{{ labels.criticalRisks }}</span></div>
          <div class="hm-stat"><span class="hm-stat-count warning">{{ summary.high }}</span><span class="hm-stat-label">{{ labels.highRisks }}</span></div>
          <div class="hm-stat"><span class="hm-stat-count info">{{ summary.medium }}</span><span class="hm-stat-label">{{ labels.mediumRisks }}</span></div>
          <div class="hm-stat"><span class="hm-stat-count success">{{ summary.low }}</span><span class="hm-stat-label">{{ labels.lowRisks }}</span></div>
        </div>

        <!-- Migration summary stats -->
        <div *ngIf="mode === 'migration' && migrationData.length > 0" class="migration-summary">
          <h4 class="migration-summary-title">{{ labels.migrationSummary }}</h4>
          <div class="hm-stat"><span class="hm-stat-count success">{{ migrationStats.improved }}</span><span class="hm-stat-label">{{ labels.improved }}</span></div>
          <div class="hm-stat"><span class="hm-stat-count info">{{ migrationStats.unchanged }}</span><span class="hm-stat-label">{{ labels.unchanged }}</span></div>
          <div class="hm-stat"><span class="hm-stat-count danger">{{ migrationStats.worsened }}</span><span class="hm-stat-label">{{ labels.worsened }}</span></div>
          <div class="hm-stat" *ngIf="migrationStats.avgReduction !== 0">
            <span class="hm-stat-count" [class.success]="migrationStats.avgReduction > 0" [class.danger]="migrationStats.avgReduction < 0">
              {{ migrationStats.avgReduction > 0 ? '-' : '+' }}{{ abs(migrationStats.avgReduction) | number:'1.1-1' }}
            </span>
            <span class="hm-stat-label">{{ labels.avgReduction }}</span>
          </div>
        </div>

        <!-- Quick navigation -->
        <div class="heatmap-quick-nav">
          <p-button [label]="labels.viewRegister" icon="pi pi-list" severity="info" [outlined]="true" size="small" (onClick)="navigateRegister.emit()" styleClass="w-full mb-2" />
          <p-button [label]="labels.compareScoring" icon="pi pi-chart-line" severity="help" [outlined]="true" size="small" (onClick)="navigateScoring.emit()" styleClass="w-full" />
        </div>
      </div>
    </div>
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .mb-2 { margin-bottom: var(--space-sm, 8px); }
    .w-full { width: 100%; }
    .migration-legend { display: flex; gap: var(--space-lg, 16px); align-items: center; flex-wrap: wrap; padding: var(--space-sm, 8px) var(--space-md, 12px); background: var(--surface-card); border-radius: var(--radius-md, 6px); border: 1px solid var(--surface-border); font-size: var(--font-size-sm); }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); }
    .legend-count { margin-inline-start: auto; font-weight: 600; color: var(--text-primary); }
    .heatmap-layout { display: flex; gap: var(--space-xl, 24px); align-items: flex-start; flex-wrap: wrap; }
    .heatmap-container { display: flex; align-items: center; gap: var(--space-sm, 8px); }
    .heatmap-ylabel { writing-mode: vertical-rl; transform: rotate(180deg); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
    .heatmap-main { display: flex; flex-direction: column; gap: 3px; }
    .heatmap-row { display: flex; gap: 3px; align-items: center; }
    .heatmap-axis-label { width: 90px; text-align: end; padding-inline-end: var(--space-sm, 8px); font-size: var(--font-size-xs); font-weight: 500; color: var(--text-muted); }
    .heatmap-cell { width: 72px; height: 56px; border-radius: var(--radius-sm, 4px); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 150ms, box-shadow 150ms; border: 1px solid transparent; position: relative; }
    .heatmap-cell:hover { transform: scale(1.08); box-shadow: var(--shadow-sm); z-index: 3; }
    .heatmap-cell.heatmap-cell-active { border-color: rgba(var(--color-black-rgb), .12); }
    .heatmap-cell.heatmap-cell-empty { cursor: default; opacity: 0.7; }
    .heatmap-cell.heatmap-cell-empty:hover { transform: none; box-shadow: none; }
    .heatmap-count { font-weight: 700; font-size: var(--font-size-md); color: rgba(var(--color-black-rgb), .7); }
    .heatmap-xlabel-row { margin-top: var(--space-xs, 4px); }
    .heatmap-xlabel { width: 72px; text-align: center; font-size: var(--font-size-xs); font-weight: 500; color: var(--text-muted); }
    .heatmap-xlabel-title { text-align: center; margin-top: var(--space-xs, 4px); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; padding-inline-start: 93px; }
    .migration-svg-overlay { position: absolute; top: 0; inset-inline-start: 93px; pointer-events: none; z-index: 2; }
    .migration-svg-overlay line { pointer-events: auto; cursor: pointer; }
    .migration-svg-overlay line:hover { stroke-width: 3.5; stroke-opacity: 1; }
    .heatmap-sidebar { display: flex; flex-direction: column; gap: var(--space-lg, 16px); min-width: 180px; max-width: 220px; }
    .heatmap-summary { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .hm-stat { display: flex; align-items: center; gap: var(--space-sm, 8px); }
    .hm-stat-count { font-size: var(--font-size-2xl); font-weight: 700; min-width: 40px; text-align: center; }
    .hm-stat-count.danger { color: var(--error); }
    .hm-stat-count.warning { color: var(--warning); }
    .hm-stat-count.info { color: var(--primary); }
    .hm-stat-count.success { color: var(--success); }
    .hm-stat-label { font-size: var(--font-size-sm); color: var(--text-muted); }
    .migration-summary { display: flex; flex-direction: column; gap: var(--space-sm, 8px); padding-top: var(--space-md, 12px); border-top: 1px solid var(--surface-border); }
    .migration-summary-title { margin: 0 0 var(--space-xs, 4px) 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .migration-summary .hm-stat-count { font-size: var(--font-size-xl); }
    .heatmap-quick-nav { padding-top: var(--space-md, 12px); border-top: 1px solid var(--surface-border); }
    @media (max-width: 768px) {
      .heatmap-layout { flex-direction: column; }
      .heatmap-sidebar { flex-direction: row; flex-wrap: wrap; max-width: 100%; min-width: 0; gap: var(--space-md, 12px); }
      .heatmap-quick-nav { width: 100%; display: flex; gap: var(--space-sm, 8px); border-top: none; padding-top: 0; }
      .migration-summary { flex-direction: row; flex-wrap: wrap; border-top: none; padding-top: 0; }
    }
  `]
})
export class RiskHeatmapCanvasComponent {
  public i18n = inject(I18nService);

  /** Current heatmap mode */
  @Input() mode: 'inherent' | 'residual' | 'migration' = 'inherent';

  /** Cell data: array of { likelihood, impact, count, risks[] } */
  @Input() cells: Array<{ likelihood: number; impact: number; count: number; risks?: Array<Record<string, any>> }> = [];

  /** Impact axis labels */
  @Input() impactLabels: string[] = [];

  /** Likelihood axis labels */
  @Input() likelihoodLabels: string[] = [];

  /** Summary counts */
  @Input() summary: { critical: number; high: number; medium: number; low: number } = { critical: 0, high: 0, medium: 0, low: 0 };

  /** Migration data for arrow overlay */
  @Input() migrationData: Array<Record<string, any>> = [];

  /** Migration aggregated statistics */
  @Input() migrationStats: { improved: number; unchanged: number; worsened: number; avgReduction: number } = { improved: 0, unchanged: 0, worsened: 0, avgReduction: 0 };

  /** Localized labels bag */
  @Input() labels: Record<string, string> = {};

  /** Emitted when a cell is clicked for drill-down */
  @Output() cellClick = new EventEmitter<{ likelihood: number; impact: number }>();

  /** Emitted when a migration arrow / risk is clicked */
  @Output() riskClick = new EventEmitter<string>();

  /** Emitted to navigate to register */
  @Output() navigateRegister = new EventEmitter<void>();

  /** Emitted to navigate to scoring */
  @Output() navigateScoring = new EventEmitter<void>();

  /** Get the count for a specific cell */
  getCellCount(likelihood: number, impact: number): number {
    return this.cells.find(c => c.likelihood === likelihood && c.impact === impact)?.count || 0;
  }

  /** Get tooltip text for a cell */
  getCellTooltip(likelihood: number, impact: number): string {
    const count = this.getCellCount(likelihood, impact);
    const score = likelihood * impact;
    const band = score >= 20 ? this.labels['criticalRisks'] : score >= 15 ? this.labels['highRisks'] : score >= 10 ? this.labels['mediumRisks'] : this.labels['lowRisks'];
    return `${this.labels['likelihood']}: ${likelihood} x ${this.labels['impact']}: ${impact} = ${score} (${band}) | ${count} ${this.labels['risksInCell']}`;
  }

  /** Color for a heatmap cell */
  cellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 20) return 'rgba(var(--module-accent-red-rgb), .28)';
    if (score >= 15) return 'rgba(var(--module-accent-amber-rgb), .28)';
    if (score >= 10) return 'rgba(var(--module-accent-yellow-rgb), .22)';
    if (score >= 5) return 'rgba(var(--module-accent-green-rgb), .18)';
    return 'rgba(var(--module-accent-green-rgb), .08)';
  }

  /** Migration arrow helpers */
  migrationX(likelihood: number): number { return (likelihood - 1) * 75 + 36; }
  migrationY(impact: number): number { return (5 - impact) * 59 + 28; }

  migrationStroke(m: Record<string, any>): string {
    const reduction = m.reduction ?? ((m.inherent.likelihood * m.inherent.impact) - (m.residual.likelihood * m.residual.impact));
    if (reduction > 0) return 'var(--success, #22c55e)';
    if (reduction < 0) return 'var(--error, #ef4444)';
    return '#9ca3af';
  }

  migrationMarker(m: Record<string, any>): string {
    const reduction = m.reduction ?? ((m.inherent.likelihood * m.inherent.impact) - (m.residual.likelihood * m.residual.impact));
    if (reduction > 0) return 'url(#arrowGreen)';
    if (reduction < 0) return 'url(#arrowRed)';
    return 'url(#arrowGray)';
  }

  /** Absolute value helper for template */
  abs(n: number): number { return Math.abs(n); }
}
