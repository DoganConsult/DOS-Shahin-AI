/**
 * Compliance Gaps Page — Orchestrator
 * Delegates presentation to sub-components: filter bar, summary cards, data table.
 * Retains the detail drawer and gap analysis dashboard inline (tightly coupled to parent state).
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ListPaginationBarComponent } from '@app/shared/components/tables-data/list-pagination-bar.component';
import { ComplianceGapDto, GapDetailDto, FrameworkSummaryDto } from '../../../models/compliance.models';
import { GrcRecord } from '@app/core/models/shared.types';
import { DropdownModule, ProgressIndicatorModule, TableModule, TilesModule } from 'carbon-components-angular';

import { ComplianceGapsFilterBarComponent } from '../../../components/gaps/compliance-gaps-filter-bar.component';
import { ComplianceGapsTableComponent } from '../../../components/gaps/compliance-gaps-table.component';
import { ComplianceGapsBulkActionsComponent } from '../../../components/gaps/compliance-gaps-bulk-actions.component';

// -- Status Lifecycle --
const GAP_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'accepted', 'closed'],
  in_progress: ['awaiting_validation', 'open', 'closed'],
  awaiting_validation: ['closed', 'in_progress'],
  closed: [],
  accepted: ['open'],
};

/** Gap analysis dashboard summary from /api/knowledge-hub/gap-analysis */
interface GapAnalysisSummary {
  requiredControlCount: number;
  actualControlCount: number;
  assessedControlCount: number;
  compliantControlCount: number;
  gap: number;
  complianceRate: number;
  assessmentRate: number;
  frameworks: GapAnalysisFramework[];
}

interface GapAnalysisFramework {
  code: string;
  name: string;
  total: number;
  assessed: number;
  compliant: number;
  complianceRate: number;
}

interface UserOption { label: string; value: string; email?: string; department?: string }
interface TeamOption { label: string; value: string }
interface StatusHistoryEntry { fromStatus: string; toStatus: string; actor: string; timestamp: string; reason?: string }
interface OwnerProfile { name: string; email: string; team?: string; department?: string; businessUnit?: string }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-gaps-page',
    imports: [
        CommonModule, FormsModule, RouterModule,
        ListPaginationBarComponent, DropdownModule, TilesModule, TableModule, ProgressIndicatorModule,
        ComplianceGapsFilterBarComponent, ComplianceGapsTableComponent, ComplianceGapsBulkActionsComponent,
    ],
    template: `
    <div class="gaps-page" [dir]="i18n.direction()">
      <!-- Gap Analysis Dashboard -->
      @if (gapAnalysisLoading()) {
        <div class="loading-state" aria-live="polite"><i class=" pi-spinner"></i> {{ i18n.translate('common.loading') }}</div>
      }
      @if (!gapAnalysisLoading() && gapAnalysis()) {
        <div class="gap-analysis-dashboard">
          <h2 class="dashboard-title">{{ i18n.translate('common.gapAnalysisDashboard') || 'Gap Analysis Dashboard' }}</h2>
          <div class="dashboard-cards">
            <cds-tile styleClass="dashboard-card"><div class="card-inner"><span class="card-num">{{ gapAnalysis()!.requiredControlCount }}</span><span class="card-label">{{ i18n.translate('common.requiredControls') || 'Required Controls' }}</span></div></cds-tile>
            <cds-tile styleClass="dashboard-card"><div class="card-inner"><span class="card-num">{{ gapAnalysis()!.actualControlCount }}</span><span class="card-label">{{ i18n.translate('common.actualControls') || 'Actual Controls' }}</span></div></cds-tile>
            <cds-tile styleClass="dashboard-card gap-card"><div class="card-inner"><span class="card-num">{{ gapAnalysis()!.gap }}</span><span class="card-label">{{ i18n.translate('common.gap') || 'Gap' }}</span></div></cds-tile>
            <cds-tile styleClass="dashboard-card"><div class="card-inner"><span class="card-num">{{ gapAnalysis()!.complianceRate }}%</span><span class="card-label">{{ i18n.translate('common.complianceRate') || 'Compliance Rate' }}</span><cds-progress-bar [value]="gapAnalysis()!.complianceRate" [showValue]="false" styleClass="dashboard-progress"></cds-progress-bar></div></cds-tile>
            <cds-tile styleClass="dashboard-card"><div class="card-inner"><span class="card-num">{{ gapAnalysis()!.assessmentRate }}%</span><span class="card-label">{{ i18n.translate('common.assessmentRate') || 'Assessment Rate' }}</span><cds-progress-bar [value]="gapAnalysis()!.assessmentRate" [showValue]="false" styleClass="dashboard-progress"></cds-progress-bar></div></cds-tile>
          </div>
          @if (gapAnalysis()!.frameworks.length > 0) {
            <h3 class="fw-breakdown-title">{{ i18n.translate('common.frameworkBreakdown') || 'Framework Breakdown' }}</h3>
            <table cdsTable aria-label="Framework gap analysis breakdown" [value]="gapAnalysis()!.frameworks" [paginator]="gapAnalysis()!.frameworks.length > 10" [rows]="10" styleClass="p-datatable-striped p-datatable-sm">
              <ng-template pTemplate="header"><tr><th>{{ i18n.translate('common.code') || 'Code' }}</th><th>{{ i18n.translate('common.frameworkName') || 'Framework' }}</th><th>{{ i18n.translate('common.totalControls') || 'Total Controls' }}</th><th>{{ i18n.translate('common.assessed') || 'Assessed' }}</th><th>{{ i18n.translate('common.compliant') || 'Compliant' }}</th><th>{{ i18n.translate('common.complianceRate') || 'Compliance Rate' }}</th></tr></ng-template>
              <ng-template pTemplate="body" let-fw><tr><td><span class="fw-code-badge">{{ fw.code }}</span></td><td>{{ fw.name }}</td><td>{{ fw.total }}</td><td>{{ fw.assessed }}</td><td>{{ fw.compliant }}</td><td><div class="compliance-rate-cell"><cds-progress-bar [value]="fw.complianceRate" [showValue]="false" styleClass="table-progress"></cds-progress-bar><span class="rate-value">{{ fw.complianceRate }}%</span></div></td></tr></ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="empty-state">{{ i18n.translate('common.noFrameworkData') || 'No framework data available.' }}</td></tr></ng-template>
            </table>
          }
        </div>
      }

      <!-- Filter Bar -->
      <app-compliance-gaps-filter-bar
        [scope]="scope()"
        [frameworkFilter]="frameworkFilter"
        [severityFilter]="severityFilter"
        [statusFilter]="statusFilter"
        [overdueOnly]="overdueOnly"
        [totalGaps]="totalGaps()"
        [frameworks]="frameworks()"
        [exportData]="filtered()"
        (toggleScope)="toggleScope()"
        (frameworkFilterChange)="frameworkFilter = $event; applyFilters()"
        (severityFilterChange)="severityFilter = $event; applyFilters()"
        (statusFilterChange)="statusFilter = $event; applyFilters()"
        (overdueOnlyChange)="overdueOnly = $event; applyFilters()" />

      @if (!loading() && !loadError() && totalGaps() > 0) {
        <app-list-pagination-bar
          [totalCount]="totalGaps()"
          [page]="page()"
          [pageSize]="pageSize()"
          [totalPages]="totalPages()"
          [pageStart]="pageStart()"
          [pageEnd]="pageEnd()"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)" />
      }

      <!-- Summary Cards -->
      <app-compliance-gaps-bulk-actions
        [criticalCount]="countBySeverity('critical')"
        [highCount]="countBySeverity('high')"
        [mediumCount]="countBySeverity('medium')"
        [lowCount]="countBySeverity('low')"
        [overdueCount]="overdueCount()" />

      <!-- Gaps Table -->
      <app-compliance-gaps-table
        [gaps]="filtered()"
        [loading]="loading()"
        [loadError]="loadError()"
        (rowClick)="openDetail($event)"
        (retry)="loadError.set(null); load()" />

      <!-- Detail Drawer (inline — tightly coupled to parent state) -->
      @if (selectedGap()) {
        <div tabindex="0" role="button" (keyup.enter)="closeDetail()" class="drawer-overlay" (click)="closeDetail()"></div>
        <aside class="detail-drawer" [dir]="i18n.direction()">
          <div class="drawer-header">
            <h3>{{ i18n.translate('common.gapDetail') }}</h3>
            <button aria-label="Close" class="close-btn" (click)="closeDetail()"><i class=""></i></button>
          </div>
          <div class="drawer-body">
            <div class="detail-section"><label>{{ i18n.translate('common.title') }}</label><p>{{ selectedGap()!.gap.title }}</p></div>
            @if (selectedGap()!.gap.description) { <div class="detail-section"><label>{{ i18n.translate('common.description') }}</label><p>{{ selectedGap()!.gap.description }}</p></div> }
            <div class="detail-row">
              <div class="detail-section half"><label>{{ i18n.translate('common.severity') }}</label><span class="severity-badge" [attr.data-severity]="selectedGap()!.gap.severity">{{ selectedGap()!.gap.severity }}</span></div>
              <div class="detail-section half"><label>{{ i18n.translate('common.status') }}</label><span class="status-badge" [attr.data-status]="selectedGap()!.gap.status">{{ formatStatus(selectedGap()!.gap.status) }}</span></div>
            </div>
            <!-- Owner Dropdown -->
            <div class="detail-section"><label><i class=""></i> {{ i18n.translate('common.owner') }}</label><cds-dropdown [options]="userOptions()" [(ngModel)]="selectedOwnerId" [filter]="true" filterBy="label" [showClear]="true" placeholder="Select owner..." styleClass="w-full" (onChange)="onOwnerChange($event.value)"></cds-dropdown></div>
            <!-- Team Dropdown -->
            <div class="detail-section"><label><i class=""></i> {{ i18n.translate('common.team') || 'Team' }}</label><cds-dropdown [options]="teamOptions()" [(ngModel)]="selectedTeamId" [filter]="true" filterBy="label" [showClear]="true" placeholder="Select team..." styleClass="w-full" (onChange)="onTeamChange($event.value)"></cds-dropdown></div>
            <!-- Owner Context -->
            @if (ownerProfile()) {
              <div class="detail-section owner-context"><label>{{ i18n.translate('common.ownerDetails') || 'Owner Details' }}</label>
                <div class="owner-card">
                  <div class="owner-row"><i class=""></i><span>{{ ownerProfile()!.name }}</span></div>
                  <div class="owner-row"><i class=""></i><span>{{ ownerProfile()!.email }}</span></div>
                  @if (ownerProfile()!.team) { <div class="owner-row"><i class=""></i><span>{{ ownerProfile()!.team }}</span></div> }
                  @if (ownerProfile()!.department) { <div class="owner-row"><i class=""></i><span>{{ ownerProfile()!.department }}</span></div> }
                  @if (ownerProfile()!.businessUnit) { <div class="owner-row"><i class=""></i><span>{{ ownerProfile()!.businessUnit }}</span></div> }
                </div>
              </div>
            }
            <!-- Status Lifecycle -->
            @if (availableTransitions().length > 0) {
              <div class="detail-section"><label><i class=""></i> {{ i18n.translate('common.changeStatus') || 'Change Status' }}</label><cds-dropdown [options]="availableTransitions()" [(ngModel)]="pendingStatusChange" placeholder="Transition to..." styleClass="w-full" (onChange)="onStatusTransition($event.value)"></cds-dropdown></div>
            }
            <!-- Status Timeline -->
            @if (statusHistory().length > 0) {
              <div class="detail-section"><label><i class=""></i> {{ i18n.translate('common.statusHistory') || 'Status History' }}</label>
                <div class="status-timeline">
                  @for (entry of statusHistory(); track $index) {
                    <div class="timeline-entry"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-statuses"><span class="status-badge" [attr.data-status]="entry.fromStatus">{{ formatStatus(entry.fromStatus) }}</span><i class=" timeline-arrow"></i><span class="status-badge" [attr.data-status]="entry.toStatus">{{ formatStatus(entry.toStatus) }}</span></div><div class="timeline-meta">{{ entry.actor }} &middot; {{ entry.timestamp | date:'medium' }}</div>@if (entry.reason) { <div class="timeline-reason">{{ entry.reason }}</div> }</div></div>
                  }
                </div>
              </div>
            }
            @if (selectedGap()!.gap.cause) { <div class="detail-section"><label>{{ i18n.translate('common.rootCause') }}</label><p>{{ selectedGap()!.gap.cause }}</p></div> }
            @if (selectedGap()!.gap.impact) { <div class="detail-section"><label>{{ i18n.translate('common.impact') }}</label><p>{{ selectedGap()!.gap.impact }}</p></div> }
            @if (selectedGap()!.gap.remediationPlan) { <div class="detail-section"><label>{{ i18n.translate('common.remediationPlan') }}</label><p>{{ selectedGap()!.gap.remediationPlan }}</p></div> }
            <div class="detail-section">
              <label>{{ i18n.translate('common.remediationTasks') }} ({{ selectedGap()!.remediationTasks?.length || 0 }})</label>
              @if (selectedGap()!.remediationTasks?.length) {
                <ul class="linked-list">@for (t of selectedGap()!.remediationTasks; track t.task_id || $index) { <li>{{ t.title }} &mdash; <span class="status-badge" [attr.data-status]="t.status">{{ t.status }}</span></li> }</ul>
              } @else { <p class="muted">{{ i18n.translate('common.noRemediationTasks') }}</p> }
            </div>
            <div class="drawer-actions">
              @if (selectedGap()!.gap.status === 'open' || selectedGap()!.gap.status === 'in_progress') {
                <button class="action-btn primary" (click)="createRemediation()"><i class=""></i> {{ i18n.translate('common.createRemediationTask') }}</button>
              }
              @if (selectedGap()!.gap.frameworkId) {
                <a class="action-link" [routerLink]="['/compliance/controls']" [queryParams]="{ frameworkId: selectedGap()!.gap.frameworkId }" (click)="closeDetail()"><i class=""></i> {{ i18n.translate('Framework Controls') }}</a>
                <a class="action-link" [routerLink]="['/compliance/obligations']" [queryParams]="{ frameworkId: selectedGap()!.gap.frameworkId }" (click)="closeDetail()"><i class=""></i> {{ i18n.translate('Obligations') }}</a>
              }
              <a class="action-link" [routerLink]="['/foundation/evidence']" (click)="closeDetail()"><i class=""></i> {{ i18n.translate('Evidence Repository') }}</a>
              <a class="action-link" [routerLink]="['/risk']" (click)="closeDetail()"><i class=""></i> {{ i18n.translate('Risk Register') }}</a>
              <a class="action-link" (click)="viewAuditLog()"><i class=""></i> {{ i18n.translate('common.auditLog') }}</a>
            </div>
          </div>
        </aside>
      }
      @if (promptDialogVisible) {
        <div tabindex="0" role="button" (keyup.enter)="promptDialogVisible = false" class="drawer-overlay" (click)="promptDialogVisible = false"></div>
        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index: var(--z-modal);background:var(--surface-card,#fff);border-radius:var(--radius-lg);padding:24px;width:400px;max-width:90vw;box-shadow: var(--shadow-xl)">
          <h4 style="margin:0 0 12px;font-size: var(--font-size-base);font-weight:600">{{ promptTitle }}</h4>
          <input class="filter-select" style="width:100%;box-sizing:border-box;padding:8px 12px" [(ngModel)]="promptValue" (keyup.enter)="submitPrompt()" />
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
            <button class="action-btn secondary" (click)="promptDialogVisible = false">{{ i18n.translate('common.cancel') || 'Cancel' }}</button>
            <button class="action-btn primary" [disabled]="!promptValue.trim()" (click)="submitPrompt()">{{ i18n.translate('common.confirm') || 'OK' }}</button>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .gaps-page { padding: 20px 28px; }
    .loading-state, .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary, var(--text-muted)); }
    .empty-state i { font-size: 40px; margin-bottom: 12px; display: block; opacity: .4; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .severity-badge[data-severity="critical"] { background: #fee2e2; color: #991b1b; }
    .severity-badge[data-severity="high"] { background: #ffedd5; color: #9a3412; }
    .severity-badge[data-severity="medium"] { background: #fef9c3; color: #854d0e; }
    .severity-badge[data-severity="low"] { background: #dcfce7; color: #166534; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .status-badge[data-status="open"] { background: #fee2e2; color: #b91c1c; }
    .status-badge[data-status="in_progress"] { background: #dbeafe; color: #1d4ed8; }
    .status-badge[data-status="awaiting_validation"] { background: #fef9c3; color: #a16207; }
    .status-badge[data-status="closed"] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status="accepted"] { background: var(--surface-200); color: var(--text-color-secondary); }
    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .3); z-index: var(--z-modal-backdrop); }
    .detail-drawer { position: fixed; top: 0; right: 0; width: 560px; max-width: 90vw; height: 100vh; background: var(--surface-card, #fff); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), .15); overflow-y: auto; }
    [dir="rtl"] .detail-drawer { right: auto; left: 0; box-shadow: 4px 0 20px rgba(var(--color-black-rgb), .15); }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border); }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; font-size: var(--font-size-lg); color: var(--text-color-secondary); }
    .drawer-body { padding: 20px; }
    .detail-section { margin-bottom: 16px; }
    .detail-section.half { flex: 1; }
    .detail-row { display: flex; gap: 16px; }
    .detail-section label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-bottom: 4px; }
    .detail-section label i { font-size: var(--font-size-xs); }
    .detail-section p { margin: 0; font-size: var(--font-size-base); line-height: 1.5; }
    .linked-list { list-style: none; padding: 0; margin: 0; }
    .linked-list li { padding: 6px 0; border-bottom: 1px solid var(--surface-50); font-size: var(--font-size-sm); }
    .muted { color: var(--text-color-secondary); font-size: var(--font-size-sm); font-style: italic; }
    .w-full { width: 100%; }
    .owner-card { background: var(--surface-50, #f9fafb); border-radius: var(--radius-sm); padding: 10px 14px; }
    .owner-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: var(--font-size-sm); }
    .owner-row i { color: var(--text-color-secondary); width: 16px; text-align: center; font-size: var(--font-size-xs); }
    .status-timeline { position: relative; padding-left: 20px; }
    .timeline-entry { position: relative; padding-bottom: 14px; }
    .timeline-entry:not(:last-child)::before { content: ''; position: absolute; left: -14px; top: 12px; bottom: 0; width: 2px; background: var(--surface-300, #d1d5db); }
    .timeline-dot { position: absolute; left: -18px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-500, var(--primary)); border: 2px solid var(--surface-card, #fff); }
    .timeline-content { font-size: var(--font-size-sm); }
    .timeline-statuses { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .timeline-arrow { font-size: var(--font-size-nano); color: var(--text-color-secondary); }
    .timeline-meta { color: var(--text-color-secondary); font-size: var(--font-size-xs); margin-top: 2px; }
    .timeline-reason { color: var(--text-color-secondary); font-size: var(--font-size-xs); font-style: italic; margin-top: 2px; }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .action-btn.primary { background: var(--primary-500, var(--primary)); color: #fff; }
    .action-btn.primary:hover { background: var(--primary-600, #2563eb); }
    .action-btn.secondary { background: var(--surface-200, var(--border-subtle)); color: var(--text-color); }
    .action-btn.secondary:hover { background: var(--surface-300, var(--border-subtle)); }
    .action-link { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; }
    .action-link:hover { text-decoration: underline; }
    .gap-analysis-dashboard { margin-bottom: 28px; padding-bottom: 24px; border-bottom: 2px solid var(--surface-200, var(--border-subtle)); }
    .dashboard-title { margin: 0 0 16px; font-size: var(--font-size-lg); font-weight: 600; }
    .dashboard-cards { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .dashboard-card { flex: 1; min-width: 160px; }
    .dashboard-card .p-card-body { padding: 16px; }
    .dashboard-card .p-card-content { padding: 0; }
    .card-inner { text-align: center; }
    .card-inner .card-num { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading, #111); }
    .card-inner .card-label { display: block; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-top: 4px; }
    .gap-card .p-card { border-color: #fca5a5; background: var(--status-danger-bg, #fff1f1); }
    .gap-card .card-num { color: #b91c1c; }
    .dashboard-progress { height: 6px; margin-top: 8px; border-radius: var(--radius-xs); }
    .fw-breakdown-title { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }
    .fw-code-badge { font-family: monospace; font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-sm); background: var(--surface-100, var(--surface-ice)); color: var(--text-color-secondary); }
    .compliance-rate-cell { display: flex; align-items: center; gap: 8px; min-width: 140px; }
    .table-progress { flex: 1; height: 6px; border-radius: var(--radius-xs); }
    .rate-value { font-size: var(--font-size-sm); font-weight: 600; min-width: 40px; text-align: end; }
  `]
})
export class ComplianceGapsPageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly isAr = computed(() => this.i18n.currentLang() === 'ar');
  loading = signal(true);
  gaps = signal<ComplianceGapDto[]>([]);
  frameworks = signal<FrameworkSummaryDto[]>([]);
  selectedGap = signal<GapDetailDto | null>(null);

  gapAnalysisLoading = signal(false);
  gapAnalysis = signal<GapAnalysisSummary | null>(null);

  userOptions = signal<UserOption[]>([]);
  teamOptions = signal<TeamOption[]>([]);
  ownerProfile = signal<OwnerProfile | null>(null);
  statusHistory = signal<StatusHistoryEntry[]>([]);
  availableTransitions = signal<{ label: string; value: string }[]>([]);

  selectedOwnerId: string | null = null;
  selectedTeamId: string | null = null;
  pendingStatusChange: string | null = null;

  frameworkFilter = '';
  severityFilter = '';
  statusFilter = '';
  overdueOnly = false;

  filtered = computed(() => {
    let list = this.gaps();
    if (this.statusFilter) list = list.filter(g => g.status === this.statusFilter);
    if (this.overdueOnly) list = list.filter(g => this.isOverdue(g));
    return list;
  });

  overdueCount = computed(() => this.gaps().filter(g => this.isOverdue(g)).length);
  scope = signal<'my' | 'all'>('all');
  page = signal(1);
  pageSize = signal(50);
  totalGaps = signal(0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalGaps() / this.pageSize())));
  pageStart = computed(() => (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalGaps()));
  loadError = signal<string | null>(null);

  promptDialogVisible = false;
  promptTitle = '';
  promptValue = '';

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['scope'] === 'my') this.scope.set('my');
    if (qp['frameworkId']) this.frameworkFilter = qp['frameworkId'];
    if (qp['severity']) this.severityFilter = qp['severity'];
    if (qp['status']) this.statusFilter = qp['status'];
    if (qp['overdue'] === '1') this.overdueOnly = true;
    const p = parseInt(qp['page'], 10);
    if (!Number.isNaN(p) && p >= 1) this.page.set(p);
    const ps = parseInt(qp['pageSize'] || qp['page_size'], 10);
    if (!Number.isNaN(ps) && ps >= 1) this.pageSize.set(Math.min(200, ps));
    this.load();
    this.loadLookups();
    this.loadGapAnalysis();
  }

  toggleScope(): void {
    const next = this.scope() === 'my' ? 'all' : 'my';
    this.scope.set(next);
    this.router.navigate([], { relativeTo: this.route, queryParams: { scope: next === 'my' ? 'my' : null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    const scopeParam = this.scope() === 'my' ? 'my' : undefined;
    forkJoin({
      gaps: this.api.getGaps(this.frameworkFilter || undefined, this.severityFilter || undefined, scopeParam, this.page(), this.pageSize()).pipe(catchError(() => { this.loadError.set(failMsg); return of({ items: [], total: 0 }); })),
      frameworks: this.api.getFrameworks().pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
    }).subscribe(res => {
      this.gaps.set(Array.isArray(res.gaps?.items) ? res.gaps.items : []);
      this.totalGaps.set(typeof res.gaps?.total === 'number' ? res.gaps.total : 0);
      this.frameworks.set(Array.isArray(res.frameworks) ? res.frameworks : []);
      this.loading.set(false);
    });
  }

  onPageChange(p: number): void { this.page.set(p); this.syncPaginationQueryParams(); this.load(); }
  onPageSizeChange(ps: number): void { this.pageSize.set(ps); this.page.set(1); this.syncPaginationQueryParams(); this.load(); }

  private syncPaginationQueryParams(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: this.page() > 1 ? this.page() : null, pageSize: this.pageSize() !== 50 ? this.pageSize() : null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  loadLookups(): void {
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(users => {
      this.userOptions.set((Array.isArray(users) ? users : []).map((u) => ({ label: `${u.full_name || u.name || u.email} (${u.email || ''})${u.department_name ? ' \u2014 ' + u.department_name : ''}`, value: u.user_id || u.id, email: u.email, department: u.department_name })));
    });
    this.api.getFoundationTeams().pipe(catchError(() => of([]))).subscribe(teams => {
      this.teamOptions.set((Array.isArray(teams) ? teams : []).map((t) => ({ label: `${t.team_name || t.name} (${t.team_code || t.code || ''})`, value: t.team_id || t.id })));
    });
  }

  loadGapAnalysis(): void {
    this.gapAnalysisLoading.set(true);
    this.api.getKnowledgeHubGapAnalysis().pipe(catchError(() => of(null))).subscribe(data => {
      if (data) {
        const d = data as any;
        this.gapAnalysis.set({ requiredControlCount: d.requiredControlCount ?? 0, actualControlCount: d.actualControlCount ?? 0, assessedControlCount: d.assessedControlCount ?? 0, compliantControlCount: d.compliantControlCount ?? 0, gap: d.gap ?? 0, complianceRate: d.complianceRate ?? 0, assessmentRate: d.assessmentRate ?? 0, frameworks: Array.isArray(d.frameworks) ? d.frameworks : [] });
      }
      this.gapAnalysisLoading.set(false);
    });
  }

  applyFilters(): void {
    this.page.set(1);
    this.router.navigate([], { relativeTo: this.route, queryParams: { scope: this.scope() === 'my' ? 'my' : null, frameworkId: this.frameworkFilter || null, severity: this.severityFilter || null, status: this.statusFilter || null, overdue: this.overdueOnly ? '1' : null, page: null }, queryParamsHandling: 'merge' });
    this.load();
  }

  countBySeverity(sev: string): number { return this.gaps().filter(g => g.severity === sev && g.status !== 'closed').length; }
  isOverdue(g: ComplianceGapDto): boolean { if (!g.dueDate || g.status === 'closed') return false; return new Date(g.dueDate) < new Date(); }
  formatStatus(s: string): string { return s?.replace(/_/g, ' ') || ''; }

  openDetail(g: ComplianceGapDto): void {
    this.api.getGapDetail(g.gapId).pipe(catchError(() => of(null))).subscribe(detail => {
      if (!detail) return;
      this.selectedGap.set(detail);
      this.selectedOwnerId = (detail.gap as GrcRecord).ownerId || null;
      this.selectedTeamId = (detail.gap as GrcRecord).teamId || null;
      this.pendingStatusChange = null;
      const currentStatus = detail.gap.status || 'open';
      const transitions = GAP_TRANSITIONS[currentStatus] || [];
      this.availableTransitions.set(transitions.map(s => ({ label: this.formatStatus(s), value: s })));
      this.ownerProfile.set(null);
      const ownerId = (detail.gap as GrcRecord).ownerId;
      if (ownerId) {
        this.api.getFoundationUserDetail(ownerId).pipe(catchError(() => of(null))).subscribe(u => {
          if (u) { const uu = u as any; this.ownerProfile.set({ name: uu.full_name || uu.name || uu.email, email: uu.email, team: uu.team_name, department: uu.department_name, businessUnit: uu.business_unit_name }); }
        });
      }
      this.statusHistory.set([]);
      this.api.getGapHistory(g.gapId).pipe(catchError(() => of([]))).subscribe(history => {
        this.statusHistory.set((Array.isArray(history) ? history : []).map((h) => ({ fromStatus: h.from_status || h.fromStatus || '', toStatus: h.to_status || h.toStatus || '', actor: h.actor_name || h.actor || h.changed_by || 'System', timestamp: h.changed_at || h.timestamp || h.created_at, reason: h.reason || h.notes || '' })));
      });
    });
  }

  closeDetail(): void { this.selectedGap.set(null); this.ownerProfile.set(null); this.statusHistory.set([]); this.availableTransitions.set([]); }

  onOwnerChange(userId: string | null): void { const gap = this.selectedGap()?.gap; if (!gap || !userId) return; this.api.updateGap(gap.gapId, { owner: userId }).subscribe(() => { this.openDetail(gap); this.load(); }); }
  onTeamChange(teamId: string | null): void { const gap = this.selectedGap()?.gap; if (!gap || !teamId) return; this.api.updateGap(gap.gapId, { teamId }).subscribe(() => { this.openDetail(gap); this.load(); }); }
  onStatusTransition(newStatus: string | null): void { if (!newStatus) return; const gap = this.selectedGap()?.gap; if (!gap) return; this.api.updateGap(gap.gapId, { status: newStatus }).subscribe(() => { this.pendingStatusChange = null; this.openDetail(gap); this.load(); }); }

  createRemediation(): void { const gap = this.selectedGap()?.gap; if (!gap) return; this.promptTitle = this.i18n.translate('common.remediationTaskTitlePrompt') || 'Remediation task title'; this.promptValue = ''; this.promptDialogVisible = true; }
  submitPrompt(): void { if (!this.promptValue.trim()) return; const gap = this.selectedGap()?.gap; if (!gap) return; this.promptDialogVisible = false; this.api.createGapRemediation(gap.gapId, { title: this.promptValue.trim() }).subscribe(() => { this.openDetail(gap); this.load(); }); }
  viewAuditLog(): void { const gap = this.selectedGap()?.gap; if (!gap) return; this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'gap', entityId: gap.gapId } }); }
}
