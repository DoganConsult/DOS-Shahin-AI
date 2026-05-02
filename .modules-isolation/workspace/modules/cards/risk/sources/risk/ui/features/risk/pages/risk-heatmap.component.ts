import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { RiskHeatmapDto, RiskRegisterItemDto } from './risk-workspace/risk-workspace.models';
import { forkJoin } from 'rxjs';

interface MigrationEntry {
  riskId?: string;
  title?: string;
  category?: string;
  reduction?: number;
  inherent: { likelihood: number; impact: number };
  residual: { likelihood: number; impact: number };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-heatmap-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, ModuleTabsBarComponent, StatusBadgeComponent, SkeletonModule, ButtonModule, TableModule, DialogModule, TooltipModule, ToastModule, DropdownModule, TagModule],
  providers: [MessageService],
  template: `
    <div class="rh-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Risk Heatmap"
        titleAr="خريطة حرارة المخاطر"
        subtitleEn="5x5 risk heatmap — inherent/residual/migration toggle with cell drill-down"
        subtitleAr="خريطة حرارة ٥×٥ — تبديل كامن/متبقي/هجرة مع التنقل في الخلايا"
        icon="th-large"
        [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().heatmap]"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        [actions]="headerActions"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="rh-body">
      <p-toast />

      <!-- Controls bar -->
      <div class="heatmap-controls mb-3">
        <p-dropdown
          [options]="categoryOptions()"
          [(ngModel)]="selectedCategory"
          [placeholder]="L().allCategories"
          [showClear]="true"
          (onChange)="onCategoryChange()"
          styleClass="me-2 category-dropdown" />

        <div class="mode-toggle">
          <p-button
            [label]="L().inherentView"
            [severity]="mode === 'inherent' ? 'primary' : 'secondary'"
            [outlined]="mode !== 'inherent'"
            (onClick)="switchMode('inherent')"
            size="small"
            styleClass="me-1" />
          <p-button
            [label]="L().residualView"
            [severity]="mode === 'residual' ? 'primary' : 'secondary'"
            [outlined]="mode !== 'residual'"
            (onClick)="switchMode('residual')"
            size="small"
            styleClass="me-1" />
          <p-button
            [label]="L().migrationView"
            [severity]="mode === 'migration' ? 'primary' : 'secondary'"
            [outlined]="mode !== 'migration'"
            (onClick)="switchMode('migration')"
            size="small"
            icon="pi pi-arrows-h"
            [pTooltip]="L().migrationTooltip" />
        </div>

        <span class="controls-spacer"></span>

        <p-button
          [label]="L().viewRegister"
          icon="pi pi-list"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="navigateToRegister()" />
        <p-button
          [label]="L().compareScoring"
          icon="pi pi-chart-line"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="navigateToScoring()" />
      </div>

      <!-- Migration legend -->
      <div *ngIf="mode === 'migration'" class="migration-legend mb-3">
        <span class="legend-item">
          <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="#22c55e" stroke-width="2" marker-end="url(#legendArrowGreen)" /><defs><marker id="legendArrowGreen" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#22c55e" /></marker></defs></svg>
          {{ L().migrationReduced }}
        </span>
        <span class="legend-item">
          <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="#9ca3af" stroke-width="2" marker-end="url(#legendArrowGray)" /><defs><marker id="legendArrowGray" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#9ca3af" /></marker></defs></svg>
          {{ L().migrationNoChange }}
        </span>
        <span class="legend-item">
          <svg width="24" height="12"><line x1="0" y1="6" x2="18" y2="6" stroke="#ef4444" stroke-width="2" marker-end="url(#legendArrowRed)" /><defs><marker id="legendArrowRed" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#ef4444" /></marker></defs></svg>
          {{ L().migrationIncreased }}
        </span>
        <span class="legend-count" *ngIf="migrationData().length > 0">
          {{ migrationData().length }} {{ L().risksTracked }}
        </span>
      </div>

      <!-- Skeleton while loading -->
      <div *ngIf="loading()" class="heatmap-skeleton">
        <p-skeleton width="465px" height="320px" />
      </div>

      <!-- Heatmap grid -->
      <div class="heatmap-layout" *ngIf="data() && !loading()">
        <div class="heatmap-container">
          <div class="heatmap-ylabel">{{ L().impact }}</div>
          <div class="heatmap-main" style="position: relative;">
            <div *ngFor="let row of [5,4,3,2,1]" class="heatmap-row">
              <div class="heatmap-axis-label">{{ data()!.labels.impact[row - 1] || row }}</div>
              <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-cell"
                [style.background]="cellColor(row, col)"
                [class.heatmap-cell-active]="cellCount(col, row) > 0"
                [class.heatmap-cell-empty]="cellCount(col, row) === 0"
                (click)="openCell(col, row)"
                [pTooltip]="cellTooltip(col, row)">
                <span *ngIf="cellCount(col, row) > 0" class="heatmap-count">{{ cellCount(col, row) }}</span>
              </div>
            </div>

            <!-- SVG overlay for migration arrows -->
            <svg *ngIf="mode === 'migration' && filteredMigrationData().length > 0" class="migration-svg-overlay"
                 [attr.width]="5 * 75" [attr.height]="5 * 59">
              <defs>
                <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
                </marker>
                <marker id="arrowGray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
                </marker>
                <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
              </defs>
              <ng-container *ngFor="let m of filteredMigrationData(); let i = index">
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
                  (click)="navigateToRisk(m.riskId)">
                  <title>{{ m.title }} | {{ L().inherentView }}: {{ m.inherent.likelihood }}x{{ m.inherent.impact }}={{ m.inherent.likelihood * m.inherent.impact }} → {{ L().residualView }}: {{ m.residual.likelihood }}x{{ m.residual.impact }}={{ m.residual.likelihood * m.residual.impact }} ({{ migrationLabel(m) }})</title>
                </line>
              </ng-container>
            </svg>

            <div class="heatmap-row heatmap-xlabel-row">
              <div class="heatmap-axis-label"></div>
              <div *ngFor="let col of [1,2,3,4,5]" class="heatmap-xlabel">{{ data()!.labels.likelihood[col - 1] || col }}</div>
            </div>
            <div class="heatmap-xlabel-title">{{ L().likelihood }}</div>
          </div>
        </div>

        <!-- Summary sidebar -->
        <div class="heatmap-sidebar">
          <div class="heatmap-summary">
            <div class="hm-stat"><span class="hm-stat-count danger">{{ data()!.summary.critical }}</span><span class="hm-stat-label">{{ L().criticalRisks }}</span></div>
            <div class="hm-stat"><span class="hm-stat-count warning">{{ data()!.summary.high }}</span><span class="hm-stat-label">{{ L().highRisks }}</span></div>
            <div class="hm-stat"><span class="hm-stat-count info">{{ data()!.summary.medium }}</span><span class="hm-stat-label">{{ L().mediumRisks }}</span></div>
            <div class="hm-stat"><span class="hm-stat-count success">{{ data()!.summary.low }}</span><span class="hm-stat-label">{{ L().lowRisks }}</span></div>
          </div>

          <!-- Migration summary stats -->
          <div *ngIf="mode === 'migration' && migrationData().length > 0" class="migration-summary">
            <h4 class="migration-summary-title">{{ L().migrationSummary }}</h4>
            <div class="hm-stat"><span class="hm-stat-count success">{{ migrationStats().improved }}</span><span class="hm-stat-label">{{ L().improved }}</span></div>
            <div class="hm-stat"><span class="hm-stat-count info">{{ migrationStats().unchanged }}</span><span class="hm-stat-label">{{ L().unchanged }}</span></div>
            <div class="hm-stat"><span class="hm-stat-count danger">{{ migrationStats().worsened }}</span><span class="hm-stat-label">{{ L().worsened }}</span></div>
            <div class="hm-stat" *ngIf="migrationStats().avgReduction !== 0">
              <span class="hm-stat-count" [class.success]="migrationStats().avgReduction > 0" [class.danger]="migrationStats().avgReduction < 0">
                {{ migrationStats().avgReduction > 0 ? '-' : '+' }}{{ absVal(migrationStats().avgReduction) | number:'1.1-1' }}
              </span>
              <span class="hm-stat-label">{{ L().avgReduction }}</span>
            </div>
          </div>

          <!-- Quick navigation -->
          <div class="heatmap-quick-nav">
            <p-button
              [label]="L().viewRegister"
              icon="pi pi-list"
              severity="info"
              [outlined]="true"
              size="small"
              (onClick)="navigateToRegister()"
              styleClass="w-full mb-2" />
            <p-button
              [label]="L().compareScoring"
              icon="pi pi-chart-line"
              severity="help"
              [outlined]="true"
              size="small"
              (onClick)="navigateToScoring()"
              styleClass="w-full" />
          </div>
        </div>
      </div>

      <!-- Cell detail dialog -->
      <p-dialog
        [header]="cellDialogHeader()"
        [(visible)]="cellDetailVisible"
        [modal]="true"
        [style]="{width:'850px', maxWidth:'95vw'}"
        [draggable]="true"
        [resizable]="false">
        <div class="cell-detail-header" *ngIf="cellDetailMeta">
          <span class="cell-score-badge" [style.background]="cellColor(cellDetailMeta.impact, cellDetailMeta.likelihood)">
            {{ L().score }}: {{ cellDetailMeta.impact * cellDetailMeta.likelihood }}
          </span>
          <span class="cell-coord">{{ L().likelihood }}: {{ cellDetailMeta.likelihood }} | {{ L().impact }}: {{ cellDetailMeta.impact }}</span>
          <span class="cell-risk-count">{{ cellDetailRisks.length }} {{ L().risksInCell }}</span>
        </div>

        <p-table
          [paginator]="cellDetailRisks.length > 10"
          [rows]="10"
          [rowsPerPageOptions]="[10,20,50]"
          aria-label="Cell Detail Risks table"
          [value]="cellDetailRisks"
          styleClass="p-datatable-sm p-datatable-striped"
          *ngIf="cellDetailRisks.length > 0">
          <ng-template pTemplate="header">
            <tr>
              <th style="min-width:200px">{{ L().title }}</th>
              <th>{{ L().score }}</th>
              <th>{{ L().owner }}</th>
              <th>{{ L().category }}</th>
              <th>{{ L().treatmentStatus }}</th>
              <th>{{ L().status }}</th>
              <th style="width:48px"></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-r>
            <tr class="cell-detail-row" (click)="navigateToRisk(r.riskId)">
              <td class="font-semibold risk-title-cell">
                <span class="risk-title-text">{{ r.title }}</span>
              </td>
              <td>
                <span class="score-chip" [class]="scoreClass(r.residualScore ?? r.inherentScore)">
                  {{ r.residualScore != null ? r.residualScore : (r.inherentScore != null ? r.inherentScore : '—') }}
                </span>
              </td>
              <td>{{ r.owner || '—' }}</td>
              <td>
                <p-tag *ngIf="r.category" [value]="r.category" [rounded]="true" severity="info" />
                <span *ngIf="!r.category">—</span>
              </td>
              <td>
                <span *ngIf="r.treatmentStatus" class="treatment-chip" [class]="treatmentClass(r.treatmentStatus)">
                  {{ r.treatmentStatus }}
                </span>
                <span *ngIf="!r.treatmentStatus">—</span>
              </td>
              <td><app-status-badge [status]="r.status" /></td>
              <td>
                <p-button
                  icon="pi pi-external-link"
                  [rounded]="true"
                  [text]="true"
                  severity="info"
                  [pTooltip]="L().viewInRegister"
                  (onClick)="navigateToRisk(r.riskId); $event.stopPropagation()" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr><td [attr.colspan]="7" class="text-center text-muted py-md">{{ L().noData }}</td></tr>
          </ng-template>
        </p-table>

        <div *ngIf="cellDetailRisks.length === 0" class="text-center text-muted py-md">{{ L().noData }}</div>

        <ng-template pTemplate="footer">
          <div class="cell-dialog-footer">
            <p-button
              [label]="L().viewAllInRegister"
              icon="pi pi-external-link"
              severity="info"
              size="small"
              (onClick)="navigateToCellInRegister()" />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Empty state -->
      <div *ngIf="!data() && !loading()" class="empty-section">
        <i class="pi pi-th-large"></i>
        <p>{{ L().emptyHeatmap }}</p>
        <p-button
          [label]="L().goToRegister"
          icon="pi pi-plus"
          severity="primary"
          [outlined]="true"
          (onClick)="navigateToRegister()"
          styleClass="mt-3" />
      </div>

      </div>
    </div>
  `,
  styles: [`
    .rh-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }
    .rh-body { flex: 1; padding: 20px 28px 32px; display: flex; flex-direction: column; gap: 16px; }

    /* Controls bar */
    .heatmap-controls { display: flex; gap: var(--space-sm, 8px); align-items: center; flex-wrap: wrap; }
    .mode-toggle { display: inline-flex; gap: 2px; align-items: center; background: var(--surface-card); border-radius: var(--radius-md, 6px); padding: 2px; }
    .controls-spacer { flex: 1; }
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .mb-2 { margin-bottom: var(--space-sm, 8px); }
    .me-1 { margin-inline-end: 2px; }
    .me-2 { margin-inline-end: var(--space-sm, 8px); }
    .mt-3 { margin-top: var(--space-md, 12px); }

    /* Migration legend */
    .migration-legend {
      display: flex; gap: var(--space-lg, 16px); align-items: center; flex-wrap: wrap;
      padding: var(--space-sm, 8px) var(--space-md, 12px);
      background: var(--surface-card); border-radius: var(--radius-md, 6px);
      border: 1px solid var(--surface-border);
      font-size: var(--font-size-sm);
    }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary); }
    .legend-count { margin-inline-start: auto; font-weight: 600; color: var(--text-primary); }

    /* Heatmap layout */
    .heatmap-layout { display: flex; gap: var(--space-xl, 24px); align-items: flex-start; flex-wrap: wrap; }
    .heatmap-container { display: flex; align-items: center; gap: var(--space-sm, 8px); }
    .heatmap-ylabel { writing-mode: vertical-rl; transform: rotate(180deg); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
    .heatmap-main { display: flex; flex-direction: column; gap: 3px; }
    .heatmap-row { display: flex; gap: 3px; align-items: center; }
    .heatmap-axis-label { width: 90px; text-align: end; padding-inline-end: var(--space-sm, 8px); font-size: var(--font-size-xs); font-weight: 500; color: var(--text-muted); }
    .heatmap-cell {
      width: 72px; height: 56px; border-radius: var(--radius-sm, 4px);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform 150ms, box-shadow 150ms;
      border: 1px solid transparent; position: relative;
    }
    .heatmap-cell:hover { transform: scale(1.08); box-shadow: var(--shadow-sm); z-index: 3; }
    .heatmap-cell.heatmap-cell-active { border-color: rgba(0,0,0,.12); }
    .heatmap-cell.heatmap-cell-empty { cursor: default; opacity: 0.7; }
    .heatmap-cell.heatmap-cell-empty:hover { transform: none; box-shadow: none; }
    .heatmap-count { font-weight: 700; font-size: var(--font-size-md); color: rgba(0,0,0,.7); }
    .heatmap-xlabel-row { margin-top: var(--space-xs, 4px); }
    .heatmap-xlabel { width: 72px; text-align: center; font-size: var(--font-size-xs); font-weight: 500; color: var(--text-muted); }
    .heatmap-xlabel-title { text-align: center; margin-top: var(--space-xs, 4px); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; padding-inline-start: 93px; }

    /* Migration SVG overlay */
    .migration-svg-overlay { position: absolute; top: 0; inset-inline-start: 93px; pointer-events: none; z-index: 2; }
    .migration-svg-overlay line { pointer-events: auto; cursor: pointer; }
    .migration-svg-overlay line:hover { stroke-width: 3.5; stroke-opacity: 1 !important; }

    /* Sidebar */
    .heatmap-sidebar { display: flex; flex-direction: column; gap: var(--space-lg, 16px); min-width: 180px; max-width: 220px; }
    .heatmap-summary { display: flex; flex-direction: column; gap: var(--space-md, 12px); }
    .hm-stat { display: flex; align-items: center; gap: var(--space-sm, 8px); }
    .hm-stat-count { font-size: var(--font-size-2xl); font-weight: 700; min-width: 40px; text-align: center; }
    .hm-stat-count.danger { color: var(--error, #ef4444); }
    .hm-stat-count.warning { color: var(--warning, #f59e0b); }
    .hm-stat-count.info { color: var(--primary, #3b82f6); }
    .hm-stat-count.success { color: var(--success, #22c55e); }
    .hm-stat-label { font-size: var(--font-size-sm); color: var(--text-muted); }

    /* Migration summary */
    .migration-summary {
      display: flex; flex-direction: column; gap: var(--space-sm, 8px);
      padding-top: var(--space-md, 12px);
      border-top: 1px solid var(--surface-border);
    }
    .migration-summary-title { margin: 0 0 var(--space-xs, 4px) 0; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .migration-summary .hm-stat-count { font-size: var(--font-size-xl); }

    /* Quick nav */
    .heatmap-quick-nav {
      padding-top: var(--space-md, 12px);
      border-top: 1px solid var(--surface-border);
    }

    /* Cell detail dialog */
    .cell-detail-header {
      display: flex; align-items: center; gap: var(--space-md, 12px); flex-wrap: wrap;
      margin-bottom: var(--space-md, 12px);
      padding-bottom: var(--space-sm, 8px);
      border-bottom: 1px solid var(--surface-border);
    }
    .cell-score-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 4px 12px; border-radius: var(--radius-md, 6px);
      font-weight: 700; font-size: var(--font-size-sm);
      color: rgba(0,0,0,.75);
    }
    .cell-coord { font-size: var(--font-size-sm); color: var(--text-secondary); }
    .cell-risk-count { font-size: var(--font-size-sm); color: var(--text-muted); margin-inline-start: auto; }

    .cell-detail-row { cursor: pointer; transition: background 150ms; }
    .cell-detail-row:hover { background: var(--surface-hover) !important; }
    .risk-title-cell { max-width: 250px; }
    .risk-title-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }

    .score-chip {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 32px; padding: 2px 8px; border-radius: 12px;
      font-weight: 600; font-size: var(--font-size-sm);
    }
    .score-chip.score-critical { background: rgba(239,68,68,.15); color: #dc2626; }
    .score-chip.score-high { background: rgba(245,158,11,.15); color: #d97706; }
    .score-chip.score-medium { background: rgba(234,179,8,.15); color: #a16207; }
    .score-chip.score-low { background: rgba(34,197,94,.15); color: #16a34a; }

    .treatment-chip {
      display: inline-flex; padding: 2px 8px; border-radius: 12px;
      font-size: var(--font-size-xs); font-weight: 500;
    }
    .treatment-chip.treatment-open { background: rgba(245,158,11,.12); color: #d97706; }
    .treatment-chip.treatment-in_progress { background: rgba(59,130,246,.12); color: #2563eb; }
    .treatment-chip.treatment-completed { background: rgba(34,197,94,.12); color: #16a34a; }
    .treatment-chip.treatment-not_required { background: rgba(156,163,175,.12); color: #6b7280; }

    .cell-dialog-footer { display: flex; justify-content: flex-end; }

    /* Utility */
    .font-semibold { font-weight: 600; }
    .text-center { text-align: center; }
    .text-muted { color: var(--text-muted); }
    .py-md { padding: var(--space-md, 12px) 0; }
    .w-full { width: 100%; }

    /* Empty state */
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: 2.5rem; color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); }

    /* Skeleton */
    .heatmap-skeleton { padding: var(--space-xl, 24px) 0; }

    /* Category dropdown */
    :host ::ng-deep .category-dropdown { min-width: 180px; }

    /* Responsive */
    @media (max-width: 768px) {
      .heatmap-layout { flex-direction: column; }
      .heatmap-sidebar { flex-direction: row; flex-wrap: wrap; max-width: 100%; min-width: 0; gap: var(--space-md, 12px); }
      .heatmap-quick-nav { width: 100%; display: flex; gap: var(--space-sm, 8px); border-top: none; padding-top: 0; }
      .heatmap-quick-nav :host ::ng-deep .p-button { flex: 1; }
      .migration-summary { flex-direction: row; flex-wrap: wrap; border-top: none; padding-top: 0; }
    }
  `]
})
export class RiskHeatmapPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private msg = inject(MessageService);
  private router = inject(Router);
  public i18n = inject(I18nService);

  loading = signal(true);
  data = signal<RiskHeatmapDto | null>(null);
  migrationData = signal<MigrationEntry[]>([]);
  mode: 'inherent' | 'residual' | 'migration' = 'inherent';
  selectedCategory: string | null = null;
  cellDetailVisible = false;
  cellDetailRisks: RiskRegisterItemDto[] = [];
  cellDetailMeta: { likelihood: number; impact: number } | null = null;

  headerActions = [
    { id: 'export', labelEn: 'Export', labelAr: 'تصدير', icon: 'download' },
  ];

  /** Category options derived from migration data or heatmap risks */
  categoryOptions = computed(() => {
    const cats = new Set<string>();
    const mig = this.migrationData();
    if (mig.length > 0) {
      mig.forEach((m) => { if (m.category) cats.add(m.category); });
    }
    const hm = this.data();
    if (hm) {
      hm.cells.forEach(c => c.risks?.forEach((r: any) => {
        if (r.category) cats.add(r.category as string);
      }));
    }
    return Array.from(cats).sort().map(c => ({ label: c, value: c }));
  });

  /** Filtered migration data respecting selected category */
  filteredMigrationData = computed(() => {
    const all = this.migrationData();
    if (!this.selectedCategory) return all;
    return all.filter((m) => m.category === this.selectedCategory);
  });

  /** Aggregated migration statistics */
  migrationStats = computed(() => {
    const migs = this.filteredMigrationData();
    let improved = 0, unchanged = 0, worsened = 0, totalReduction = 0;
    for (const m of migs) {
      const iScore = m.inherent.likelihood * m.inherent.impact;
      const rScore = m.residual.likelihood * m.residual.impact;
      const reduction = m.reduction ?? (iScore - rScore);
      if (reduction > 0) improved++;
      else if (reduction < 0) worsened++;
      else unchanged++;
      totalReduction += reduction;
    }
    return {
      improved,
      unchanged,
      worsened,
      avgReduction: migs.length > 0 ? totalReduction / migs.length : 0,
    };
  });

  tabs = RISK_TABS;
  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');
  L = computed(() => this.i18n.isAr() ? AR : EN);

  ngOnInit(): void {
    this.load();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.selectedCategory) params['category'] = this.selectedCategory;

    if (this.mode === 'migration') {
      // Load inherent heatmap as base layer + migration data in parallel
      forkJoin({
        heatmap: this.api.getHeatmap('inherent', params),
        migration: this.api.getHeatmapMigration(),
      }).subscribe({
        next: ({ heatmap, migration }) => {
          this.data.set(heatmap);
          this.migrationData.set((migration.migrations || []).map((entry: any) => this.normalizeMigrationEntry(entry)));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.migrationData.set([]);
          this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().loadError, life: 3000 });
        },
      });
    } else {
      this.migrationData.set([]);
      this.api.getHeatmap(this.mode, params).subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => {
          this.loading.set(false);
          this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.L().loadError, life: 3000 });
        },
      });
    }
  }

  switchMode(m: 'inherent' | 'residual' | 'migration'): void {
    if (this.mode === m) return;
    this.mode = m;
    this.load();
  }

  onCategoryChange(): void { this.load(); }

  onHeaderAction(id: string): void {
    if (id === 'export') {
      this.api.exportRegister().subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'risk-register-export.xlsx';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.exportFailed'), life: 3000 }),
      });
    }
  }

  cellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 20) return 'rgba(239,68,68,.28)';
    if (score >= 15) return 'rgba(245,158,11,.28)';
    if (score >= 10) return 'rgba(234,179,8,.22)';
    if (score >= 5) return 'rgba(34,197,94,.18)';
    return 'rgba(34,197,94,.08)';
  }

  cellCount(likelihood: number, impact: number): number {
    const hm = this.data();
    if (!hm) return 0;
    return hm.cells.find(c => c.likelihood === likelihood && c.impact === impact)?.count || 0;
  }

  cellTooltip(likelihood: number, impact: number): string {
    const count = this.cellCount(likelihood, impact);
    const score = likelihood * impact;
    const L = this.L();
    const band = score >= 20 ? L.criticalRisks : score >= 15 ? L.highRisks : score >= 10 ? L.mediumRisks : L.lowRisks;
    return `${L.likelihood}: ${likelihood} x ${L.impact}: ${impact} = ${score} (${band}) | ${count} ${L.risksInCell}`;
  }

  openCell(likelihood: number, impact: number): void {
    const hm = this.data();
    if (!hm) return;
    const cell = hm.cells.find(c => c.likelihood === likelihood && c.impact === impact);
    const risks = (cell?.risks || []).map((risk: any) => this.normalizeCellRisk(risk, likelihood, impact));
    if (risks.length === 0 && (cell?.count || 0) === 0) return;
    this.cellDetailRisks = risks;
    this.cellDetailMeta = { likelihood, impact };
    this.cellDetailVisible = true;
  }

  /** Dynamic dialog header based on cell coordinates */
  cellDialogHeader(): string {
    if (!this.cellDetailMeta) return this.L().cellDetail;
    const { likelihood, impact } = this.cellDetailMeta;
    return `${this.L().cellDetail} — ${this.L().likelihood} ${likelihood} x ${this.L().impact} ${impact} (${this.L().score}: ${likelihood * impact})`;
  }

  /** Convert likelihood (1-5) to SVG x coordinate within the grid overlay */
  migrationX(likelihood: number): number {
    // Each cell is 72px + 3px gap = 75px stride; center of cell = (col-1)*75 + 36
    return (likelihood - 1) * 75 + 36;
  }

  /** Convert impact (1-5) to SVG y coordinate within the grid overlay (impact 5 = top row) */
  migrationY(impact: number): number {
    // Rows go 5,4,3,2,1 from top. Each row is 56px + 3px gap = 59px stride; center = rowIdx*59 + 28
    const rowIdx = 5 - impact;
    return rowIdx * 59 + 28;
  }

  /** Determine arrow stroke color: green=improved, gray=unchanged, red=worsened */
  migrationStroke(m: MigrationEntry): string {
    const reduction = m.reduction ?? ((m.inherent.likelihood * m.inherent.impact) - (m.residual.likelihood * m.residual.impact));
    if (reduction > 0) return '#22c55e';
    if (reduction < 0) return '#ef4444';
    return '#9ca3af';
  }

  /** Determine arrow marker based on migration direction */
  migrationMarker(m: MigrationEntry): string {
    const reduction = m.reduction ?? ((m.inherent.likelihood * m.inherent.impact) - (m.residual.likelihood * m.residual.impact));
    if (reduction > 0) return 'url(#arrowGreen)';
    if (reduction < 0) return 'url(#arrowRed)';
    return 'url(#arrowGray)';
  }

  /** Human-readable migration label */
  migrationLabel(m: MigrationEntry): string {
    const reduction = m.reduction ?? ((m.inherent.likelihood * m.inherent.impact) - (m.residual.likelihood * m.residual.impact));
    if (reduction > 0) return `-${reduction}`;
    if (reduction < 0) return `+${Math.abs(reduction)}`;
    return this.L().noChange;
  }

  /** Score CSS class for the drill-down table */
  scoreClass(score: number | null | undefined): string {
    if (score == null) return 'score-chip';
    if (score >= 20) return 'score-chip score-critical';
    if (score >= 15) return 'score-chip score-high';
    if (score >= 10) return 'score-chip score-medium';
    return 'score-chip score-low';
  }

  /** Treatment status CSS class */
  treatmentClass(status: string): string {
    const normalized = (status || '').toLowerCase().replace(/\s+/g, '_');
    return `treatment-chip treatment-${normalized}`;
  }

  /** Absolute value helper for template */
  absVal(n: number): number {
    return Math.abs(n);
  }

  /** Navigate to the risk register with the risk ID as query param */
  navigateToRisk(riskId: string): void {
    this.cellDetailVisible = false;
    this.router.navigate(['/risk/register'], { queryParams: { id: riskId } });
  }

  /** Navigate to register filtered by current cell's risks */
  navigateToCellInRegister(): void {
    this.cellDetailVisible = false;
    const ids = this.cellDetailRisks.map((r) => r.riskId).filter(Boolean);
    if (ids.length > 0) {
      this.router.navigate(['/risk/register'], { queryParams: { ids: ids.join(',') } });
    } else {
      this.router.navigate(['/risk/register']);
    }
  }

  /** Navigate to the risk register page */
  navigateToRegister(): void {
    this.router.navigate(['/risk/register']);
  }

  /** Navigate to the risk scoring/methodology page */
  navigateToScoring(): void {
    this.router.navigate(['/risk/scoring']);
  }

  private normalizeMigrationEntry(entry: any): MigrationEntry {
    return {
      riskId: entry?.riskId,
      title: entry?.title,
      category: entry?.category,
      reduction: typeof entry?.reduction === 'number' ? entry.reduction : undefined,
      inherent: entry?.fromCell ?? entry?.inherent ?? { likelihood: 0, impact: 0 },
      residual: entry?.toCell ?? entry?.residual ?? { likelihood: 0, impact: 0 },
    };
  }

  private normalizeCellRisk(risk: { riskId: string; title: string; status: string; owner?: string }, likelihood: number, impact: number): RiskRegisterItemDto {
    return {
      riskId: risk.riskId,
      title: risk.title,
      category: '',
      owner: risk.owner,
      status: risk.status,
      likelihood,
      impact,
      inherentScore: likelihood * impact,
      residualScore: likelihood * impact,
    };
  }
}

// ────────────────────────────────────────────────────────
// EN / AR translation constants
// ────────────────────────────────────────────────────────

const EN = {
  heatmap: 'Risk Heatmap',
  heatmapSubtitle: '5x5 risk heatmap — inherent/residual/migration toggle with cell drill-down',
  inherentView: 'Inherent',
  residualView: 'Residual',
  migrationView: 'Migration',
  migrationTooltip: 'Show arrows from inherent to residual position per risk',
  impact: 'Impact',
  likelihood: 'Likelihood',
  score: 'Score',
  criticalRisks: 'Critical',
  highRisks: 'High',
  mediumRisks: 'Medium',
  lowRisks: 'Low',
  cellDetail: 'Cell Detail',
  title: 'Title',
  owner: 'Owner',
  status: 'Status',
  category: 'Category',
  residualScore: 'Residual Score',
  treatmentStatus: 'Treatment',
  viewInRegister: 'View in Register',
  viewAllInRegister: 'View All in Register',
  allCategories: 'All Categories',
  noChange: 'No change',
  noData: 'No data available',
  emptyHeatmap: 'Heatmap will appear after risks are created and assessed.',
  goToRegister: 'Go to Risk Register',
  viewRegister: 'View Register',
  compareScoring: 'Compare Scoring',
  risksInCell: 'risks',
  risksTracked: 'risks tracked',
  loadError: 'Failed to load heatmap',
  migrationSummary: 'Migration Summary',
  migrationReduced: 'Reduced',
  migrationNoChange: 'Unchanged',
  migrationIncreased: 'Increased',
  improved: 'Improved',
  unchanged: 'Unchanged',
  worsened: 'Worsened',
  avgReduction: 'Avg. Reduction',
};

const AR: typeof EN = {
  heatmap: 'خريطة حرارة المخاطر',
  heatmapSubtitle: 'خريطة حرارة ٥×٥ — تبديل كامن/متبقي/هجرة مع التنقل في الخلايا',
  inherentView: 'كامن',
  residualView: 'متبقي',
  migrationView: 'الهجرة',
  migrationTooltip: 'عرض الأسهم من الموقع الكامن إلى المتبقي لكل خطر',
  impact: 'التأثير',
  likelihood: 'الاحتمالية',
  score: 'الدرجة',
  criticalRisks: 'حرج',
  highRisks: 'عالي',
  mediumRisks: 'متوسط',
  lowRisks: 'منخفض',
  cellDetail: 'تفاصيل الخلية',
  title: 'العنوان',
  owner: 'المسؤول',
  status: 'الحالة',
  category: 'الفئة',
  residualScore: 'الدرجة المتبقية',
  treatmentStatus: 'المعالجة',
  viewInRegister: 'عرض في السجل',
  viewAllInRegister: 'عرض الكل في السجل',
  allCategories: 'جميع الفئات',
  noChange: 'لا تغيير',
  noData: 'لا توجد بيانات',
  emptyHeatmap: 'ستظهر خريطة الحرارة بعد إنشاء المخاطر وتقييمها.',
  goToRegister: 'الذهاب لسجل المخاطر',
  viewRegister: 'عرض السجل',
  compareScoring: 'مقارنة التسجيل',
  risksInCell: 'مخاطر',
  risksTracked: 'مخاطر متتبعة',
  loadError: 'فشل تحميل خريطة الحرارة',
  migrationSummary: 'ملخص الهجرة',
  migrationReduced: 'انخفض',
  migrationNoChange: 'دون تغيير',
  migrationIncreased: 'ازداد',
  improved: 'تحسن',
  unchanged: 'دون تغيير',
  worsened: 'تدهور',
  avgReduction: 'متوسط الانخفاض',
};
