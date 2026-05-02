// ============================================
// SoD Conflicts Management Page
// Priority 13: Full-featured SoD conflict detection, resolution, and analytics
// Orchestrator — delegates presentation to sub-components
// ============================================

import { Component, OnInit, computed, inject, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { TabViewModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcRecord } from '@app/core/models/shared.types';

import { SodFilterBarComponent } from '../../components/sod-filter-bar.component';
import { SodConflictsTableComponent, SodConflictRow } from '../../components/sod-conflicts-table.component';
import { SodAnalyticsTabComponent } from '../../components/sod-analytics-tab.component';
import { SodResolutionDialogComponent, SodResolveFormModel } from '../../components/sod-resolution-dialog.component';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

interface SoDConflict extends SodConflictRow {
  details: {
    roleA?: string;
    roleB?: string;
    authorityA?: string;
    authorityB?: string;
    moduleCode?: string;
    severityFactors?: Record<string, any>;
    riskFactors?: Record<string, any>;
  };
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sod-conflicts-page',
    imports: [
        CommonModule, PageHeaderComponent, ModuleTabsBarComponent,
        TabViewModule, ToastModule,
        SodFilterBarComponent, SodConflictsTableComponent,
        SodAnalyticsTabComponent, SodResolutionDialogComponent
    ],
    providers: [MessageService],
    template: `
    <div class="sod-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="SoD Conflict Detection"
        titleAr="\u0627\u0643\u062A\u0634\u0627\u0641 \u062A\u0639\u0627\u0631\u0636\u0627\u062A \u0641\u0635\u0644 \u0627\u0644\u0645\u0647\u0627\u0645"
        subtitleEn="Segregation of Duties conflict detection, resolution, and analytics"
        subtitleAr="\u0627\u0643\u062A\u0634\u0627\u0641 \u0648\u062D\u0644 \u062A\u0639\u0627\u0631\u0636\u0627\u062A \u0641\u0635\u0644 \u0627\u0644\u0645\u0647\u0627\u0645 \u0648\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A"
        icon="ban"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('SoD Conflicts')]"
        [actions]="headerActions"
        [isAr]="isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />
      <div class="sod-body">
        <p-toast />

        <!-- Summary Cards -->
        <div class="summary-strip">
          <div class="summary-card">
            <div class="summary-value">{{ conflicts().length }}</div>
            <div class="summary-label">{{ i18n.translate('Total Conflicts') }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--error)">{{ openCount() }}</div>
            <div class="summary-label">{{ i18n.translate('Open') }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--warning)">{{ highSeverityCount() }}</div>
            <div class="summary-label">{{ i18n.translate('High Severity') }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--success)">{{ resolvedCount() }}</div>
            <div class="summary-label">{{ i18n.translate('Resolved') }}</div>
          </div>
        </div>

        <p-tabView>
          <!-- Conflicts List -->
          <p-tabPanel [header]="i18n.translate('Conflicts')">
            <app-sod-filter-bar
              [searchTerm]="searchTerm"
              [filterSeverity]="filterSeverity"
              [filterType]="filterType"
              [detecting]="detecting()"
              [selectedCount]="selectedConflicts().length"
              [exportData]="filteredConflicts()"
              [severityOptions]="severityOptions"
              [typeOptions]="typeOptions"
              (searchTermChange)="searchTerm = $event; filterConflicts()"
              (filterSeverityChange)="filterSeverity = $event; filterConflicts()"
              (filterTypeChange)="filterType = $event; filterConflicts()"
              (runDetection)="runDetection()"
              (bulkResolve)="openBulkResolveDialog()" />

            <app-sod-conflicts-table
              [conflicts]="filteredConflicts()"
              [loading]="loading()"
              [selection]="selectedConflicts()"
              (selectionChange)="selectedConflicts.set($event)"
              (viewDetails)="viewDetails($event)"
              (loadSuggestions)="loadSuggestions($event)"
              (openResolve)="openResolveDialog($event)"
              (viewHistory)="viewHistory($event)" />
          </p-tabPanel>

          <!-- Trends & Analytics -->
          <p-tabPanel [header]="i18n.translate('Trends & Analytics')">
            <app-sod-analytics-tab
              [loadingTrends]="loadingTrends()"
              [trendDays]="trendDays"
              [trendsData]="trendsData()"
              [patterns]="patterns()"
              [trendDaysOptions]="trendDaysOptions"
              [chartOptions]="chartOptions"
              (loadTrends)="loadTrends()"
              (trendDaysChange)="trendDays = $event; loadTrends()" />
          </p-tabPanel>
        </p-tabView>
      </div>

      <app-sod-resolution-dialog
        [showDetails]="showDetailsDialog"
        (showDetailsChange)="showDetailsDialog = $event"
        [selectedConflict]="selectedConflict()"
        [showResolve]="showResolveDialog"
        (showResolveChange)="showResolveDialog = $event"
        [resolveForm]="resolveForm"
        (confirmResolve)="confirmResolve()"
        [showBulkResolve]="showBulkResolveDialog"
        (showBulkResolveChange)="showBulkResolveDialog = $event"
        [bulkResolveForm]="bulkResolveForm"
        [bulkCount]="selectedConflicts().length"
        (confirmBulkResolve)="confirmBulkResolve()"
        [resolving]="resolving()"
        [resolveStatusOptions]="resolveStatusOptions"
        [showSuggestions]="showSuggestionsDialog"
        (showSuggestionsChange)="showSuggestionsDialog = $event"
        [suggestions]="suggestions()"
        [showHistory]="showHistoryDialog"
        (showHistoryChange)="showHistoryDialog = $event"
        [history]="history()" />
    </div>
  `,
    styles: [`
    .sod-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .sod-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 12px; overflow: auto; }
    .summary-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
    .summary-card { flex: 1; min-width: 120px; text-align: center; padding: 16px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .summary-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .summary-label { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; }
  `]
})
export class SodConflictsPageComponent implements OnInit {
    private governanceSvc = inject(GrcGovernanceService);
  private cdr = inject(ChangeDetectorRef);
  public i18n = inject(I18nService);
  private messageService = inject(MessageService);

  loading = signal(false);
  detecting = signal(false);
  resolving = signal(false);
  loadingTrends = signal(false);

  conflicts = signal<SoDConflict[]>([]);
  filteredConflicts = signal<SoDConflict[]>([]);
  selectedConflicts = signal<SodConflictRow[]>([]);
  selectedConflict = signal<SoDConflict | null>(null);
  suggestions = signal<GrcRecord[]>([]);
  patterns = signal<GrcRecord[]>([]);
  trendsData = signal<GrcRecord | null>(null);
  history = signal<GrcRecord[]>([]);

  searchTerm = '';
  filterSeverity: string | null = null;
  filterType: string | null = null;
  trendDays = 30;

  showDetailsDialog = false;
  showResolveDialog = false;
  showBulkResolveDialog = false;
  showSuggestionsDialog = false;
  showHistoryDialog = false;

  resolveForm: SodResolveFormModel = { status: 'resolved', resolvedBy: '', resolutionNote: '' };
  bulkResolveForm: SodResolveFormModel = { status: 'resolved', resolvedBy: '', resolutionNote: '' };

  tabs = GOVERNANCE_TABS;
  dir = computed(() => this.i18n.direction());
  isAr = computed(() => this.i18n.isAr());

  openCount = computed(() => this.conflicts().filter(c => c.status === 'open').length);
  resolvedCount = computed(() => this.conflicts().filter(c => c.status === 'resolved' || c.status === 'mitigated' || c.status === 'accepted').length);
  highSeverityCount = computed(() => this.conflicts().filter(c => c.severity === 'high').length);

  severityOptions = [
    { label: this.i18n.translate('All'), value: null },
    { label: this.i18n.translate('High'), value: 'high' },
    { label: this.i18n.translate('Medium'), value: 'medium' },
    { label: this.i18n.translate('Low'), value: 'low' }
  ];

  typeOptions = [
    { label: this.i18n.translate('All'), value: null },
    { label: 'RACI Responsible/Accountable', value: 'raci_responsible_accountable' },
    { label: 'Authority Approve/Submit', value: 'authority_approve_submit' },
    { label: 'Authority Approve/Execute', value: 'authority_approve_execute' }
  ];

  resolveStatusOptions = [
    { label: this.i18n.translate('Resolved'), value: 'resolved' },
    { label: this.i18n.translate('Mitigated'), value: 'mitigated' },
    { label: this.i18n.translate('Accepted'), value: 'accepted' }
  ];

  trendDaysOptions = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
    { label: '180 days', value: 180 }
  ];

  chartOptions = { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } };

  headerActions: PageHeaderAction[] = [
    { id: 'export', labelEn: 'Export', labelAr: '\u062A\u0635\u062F\u064A\u0631', icon: 'pi pi-download' },
    { id: 'refresh', labelEn: 'Refresh', labelAr: '\u062A\u062D\u062F\u064A\u062B', icon: 'pi pi-refresh' }
  ];

  ngOnInit(): void { this.loadConflicts(); }

  loadConflicts(): void {
    this.loading.set(true);
    this.governanceSvc.getSoDConflicts({ limit: 1000 }).subscribe({
      next: (result) => { this.conflicts.set((result.conflicts || []) as any); this.filterConflicts(); this.loading.set(false); this.cdr.markForCheck(); },
      error: () => { this.loading.set(false); this.cdr.markForCheck(); this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to load SoD conflicts'), life: 4000 }); }
    });
  }

  filterConflicts(): void {
    let filtered = [...this.conflicts()];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => (c.userName || '').toLowerCase().includes(term) || (c.userEmail || '').toLowerCase().includes(term) || (c.scopeName || '').toLowerCase().includes(term) || c.conflictType.toLowerCase().includes(term));
    }
    if (this.filterSeverity) filtered = filtered.filter(c => c.severity === this.filterSeverity);
    if (this.filterType) filtered = filtered.filter(c => c.conflictType === this.filterType);
    this.filteredConflicts.set(filtered);
    this.cdr.markForCheck();
  }

  runDetection(): void {
    this.detecting.set(true);
    this.governanceSvc.detectSoDConflicts().subscribe({
      next: (result) => { this.detecting.set(false); this.messageService.add({ severity: 'success', summary: this.i18n.translate('Detection Complete'), detail: `${result.totalDetected || 0} ${this.i18n.translate('conflicts detected')}`, life: 4000 }); this.loadConflicts(); this.cdr.markForCheck(); },
      error: () => { this.detecting.set(false); this.cdr.markForCheck(); this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to run SoD conflict detection'), life: 4000 }); }
    });
  }

  viewDetails(conflict: SodConflictRow): void { this.selectedConflict.set(conflict as SoDConflict); this.showDetailsDialog = true; }

  loadSuggestions(conflict: SodConflictRow): void {
    this.governanceSvc.getSoDRemediationSuggestions(conflict.conflictId).subscribe({
      next: (result) => { this.suggestions.set(result.suggestions || []); this.selectedConflict.set(conflict as SoDConflict); this.showSuggestionsDialog = true; this.cdr.markForCheck(); },
      error: () => { this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to load remediation suggestions'), life: 4000 }); }
    });
  }

  openResolveDialog(conflict: SodConflictRow): void { this.selectedConflict.set(conflict as SoDConflict); this.resolveForm = { status: 'resolved', resolvedBy: '', resolutionNote: '' }; this.showResolveDialog = true; }

  confirmResolve(): void {
    const conflict = this.selectedConflict();
    if (!conflict || !this.resolveForm.resolvedBy) { this.messageService.add({ severity: 'warn', summary: this.i18n.translate('Validation Error'), detail: this.i18n.translate('Resolved By is required'), life: 4000 }); return; }
    this.resolving.set(true);
    this.governanceSvc.resolveSoDConflict(conflict.conflictId, this.resolveForm.status, this.resolveForm.resolvedBy, this.resolveForm.resolutionNote).subscribe({
      next: () => { this.resolving.set(false); this.showResolveDialog = false; this.messageService.add({ severity: 'success', summary: this.i18n.translate('Success'), detail: this.i18n.translate('Conflict resolved successfully'), life: 4000 }); this.loadConflicts(); this.cdr.markForCheck(); },
      error: () => { this.resolving.set(false); this.cdr.markForCheck(); this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to resolve conflict'), life: 4000 }); }
    });
  }

  openBulkResolveDialog(): void { if (this.selectedConflicts().length === 0) return; this.bulkResolveForm = { status: 'resolved', resolvedBy: '', resolutionNote: '' }; this.showBulkResolveDialog = true; }

  confirmBulkResolve(): void {
    if (!this.bulkResolveForm.resolvedBy) { this.messageService.add({ severity: 'warn', summary: this.i18n.translate('Validation Error'), detail: this.i18n.translate('Resolved By is required'), life: 4000 }); return; }
    const conflictIds = this.selectedConflicts().map(c => c.conflictId);
    this.resolving.set(true);
    this.governanceSvc.bulkResolveSoDConflicts(conflictIds, this.bulkResolveForm.status, this.bulkResolveForm.resolvedBy, this.bulkResolveForm.resolutionNote).subscribe({
      next: (result) => { this.resolving.set(false); this.showBulkResolveDialog = false; this.selectedConflicts.set([]); this.messageService.add({ severity: 'success', summary: this.i18n.translate('Success'), detail: `${(result as any).resolved || conflictIds.length} ${this.i18n.translate('conflicts resolved')}`, life: 4000 }); this.loadConflicts(); this.cdr.markForCheck(); },
      error: () => { this.resolving.set(false); this.cdr.markForCheck(); this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to bulk resolve conflicts'), life: 4000 }); }
    });
  }

  viewHistory(conflict: SodConflictRow): void {
    this.governanceSvc.getSoDConflictResolutionHistory(conflict.conflictId).subscribe({
      next: (result) => { this.history.set(result.history || []); this.selectedConflict.set(conflict as SoDConflict); this.showHistoryDialog = true; this.cdr.markForCheck(); },
      error: () => { this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to load resolution history'), life: 4000 }); }
    });
  }

  loadTrends(): void {
    this.loadingTrends.set(true);
    this.governanceSvc.getSoDConflictTrends(this.trendDays).subscribe({
      next: (result) => {
        const trends = result.trends || [];
        this.trendsData.set({
          labels: trends.map((t: GrcRecord) => t.date),
          datasets: [
            { label: this.i18n.translate('Detected'), data: trends.map((t: GrcRecord) => t.detected), borderColor: 'var(--error)', backgroundColor: 'rgba(var(--module-accent-red-rgb), 0.1)' },
            { label: this.i18n.translate('Resolved'), data: trends.map((t: GrcRecord) => t.resolved), borderColor: 'var(--success)', backgroundColor: 'rgba(var(--module-accent-emerald-rgb), 0.1)' },
            { label: this.i18n.translate('Open'), data: trends.map((t: GrcRecord) => t.open), borderColor: 'var(--warning)', backgroundColor: 'rgba(var(--module-accent-amber-rgb), 0.1)' }
          ]
        });
        this.loadingTrends.set(false); this.cdr.markForCheck();
      },
      error: () => { this.loadingTrends.set(false); this.cdr.markForCheck(); this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to load trends'), life: 4000 }); }
    });
    this.governanceSvc.getSoDConflictPatterns().subscribe({
      next: (result) => { this.patterns.set(result.patterns || []); this.cdr.markForCheck(); },
      error: (err) => { console.warn('Failed to load conflict patterns:', err); }
    });
  }

  onHeaderAction(action: string): void {
    if (action === 'export') {
      this.governanceSvc.exportSoDConflicts('csv').subscribe({
        next: (blob: Blob) => { const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `sod-conflicts-${Date.now()}.csv`; a.click(); window.URL.revokeObjectURL(url); },
        error: () => { this.messageService.add({ severity: 'error', summary: this.i18n.translate('Error'), detail: this.i18n.translate('Failed to export conflicts'), life: 4000 }); }
      });
    } else if (action === 'refresh') { this.loadConflicts(); }
  }
}
