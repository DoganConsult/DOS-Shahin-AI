import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { of, catchError } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AGRCOSService } from '@app/services/agrc-os.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ControlProcessCycleService, LinkedItems } from '../../../services/control-process-cycle.service';
import { AppDatePipe } from '@app/shared/pipes';
import { COMPLIANCE_CONTROL_STATUSES, isControlStatus, type ControlStatus } from '@shahin-ai/shared-compliance-types';
import { AiEntityContextPanelComponent } from '@app/shared/components/ai/ai-entity-context-panel.component';
import { ComplianceSettingsDto } from '../../../models/compliance.models';
import { GrcRecord } from '@app/core/models/shared.types';
import { ButtonModule, ContextMenuModule, NotificationModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

/**
 * Compliance control as returned from the API.
 * Matches the structure used throughout the component.
 */
interface ComplianceControl {
  controlId: string;
  title: string;
  description?: string;
  status: ControlStatus | string;
  testStatus?: string;
  owner?: string | null;
  frameworks?: string[];
  evidenceCount?: number;
  riskCount?: number;
  automatable?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-controls-page',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, RouterModule, AiEntityContextPanelComponent, NotificationModule, ButtonModule, ContextMenuModule],
  providers: [],
  templateUrl: './compliance-controls-page.component.html',
  styleUrls: ['./compliance-controls-page.component.scss']
})
export class ComplianceControlsPageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private agrcOs = inject(AGRCOSService);
  private cycleService = inject(ControlProcessCycleService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  loading = signal(true);
  allControls = signal<ComplianceControl[]>([]);
  totalCount = signal(0);
  page = signal(1);
  pageSize = signal(25);
  settings = signal<ComplianceSettingsDto | null>(null);
  selectedCtrl = signal<ComplianceControl | null>(null);
  linkedItems = signal<LinkedItems | null>(null);
  cycleLoading = signal(false);
  scope = signal<'my' | 'all'>('all');
  frameworkFilter = '';
  statusFilter = '';
  ownerFilter = '';
  frameworkOptions = signal<string[]>([]);
  selectedControlIds = signal<Set<string>>(new Set());
  bulkAssignOwnerId = signal<string | null>(null);
  userOptions = signal<Array<{ value: string; label: string }>>([]);
  bulkActionLoading = signal(false);
  /** Canonical assessment statuses from shared package (avoid duplicating "implemented" in the static list above). */
  readonly complianceStatusFilterOptions = COMPLIANCE_CONTROL_STATUSES.filter((st: string) => st !== 'implemented');

  // Mapping analysis (DB-driven)
  mappingAnalysis = signal<{
    unmappedCount: number; weakCount: number; coveragePct: number;
    unmapped: any[]; weakControls: any[];
  } | null>(null);

  exportMenuItems: [] = [
    { label: 'CSV', icon: '', command: () => this.exportControls('csv') },
    { label: 'Excel', icon: '', command: () => this.exportControls('xlsx') },
  ];

  exportControls(format: 'csv' | 'xlsx'): void {
    this.api.exportControls(format, this.frameworkFilter || undefined, this.scope() === 'my' ? 'my' : undefined, this.statusFilter || undefined, this.ownerFilter || undefined)
      .pipe(catchError(() => {
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('Export Failed'), detail: this.i18n.translate('Failed to export controls') });
        return of(null);
      }))
      .subscribe(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `controls-export-${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
          a.click();
          URL.revokeObjectURL(url);
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('Export Successful'), detail: this.i18n.translate('Controls exported successfully') });
        }
      });
  }

  toggleScope(): void {
    const next = this.scope() === 'my' ? 'all' : 'my';
    this.scope.set(next);
    this.page.set(1);
    this.router.navigate([], { relativeTo: this.route, queryParams: { scope: next === 'my' ? 'my' : null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.reload();
  }

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  pageStart = computed(() => this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalCount()));
  pageSizeOptions = computed(() => {
    const max = this.settings()?.paginationMaxPageSize ?? 200;
    const options = [10, 25, 50, 100];
    return options.filter(opt => opt <= max);
  });

  filtered = computed(() => {
    // Backend filtering is now used, so return all controls as-is
    return this.allControls();
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['scope'] === 'my') this.scope.set('my');
    if (qp['frameworkId']) this.frameworkFilter = qp['frameworkId'];
    if (qp['status']) this.statusFilter = qp['status'];
    this.api.getFrameworks().pipe(catchError(() => of([]))).subscribe(fws => {
      this.frameworkOptions.set((fws || []).map((f) => f.code || f.id || f.name || '').filter(Boolean));
    });
    this.api.getSettings().pipe(catchError(() => of(null))).subscribe(settings => {
      if (settings) {
        this.settings.set(settings);
        // Initialize pageSize from settings if not already set from query params
        if (!qp['pageSize']) {
          this.pageSize.set(settings.paginationDefaultPageSize);
        }
      }
      this.reload();
    });
    // Load users for bulk assign
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(users => {
      this.userOptions.set((users || []).map((u) => ({
        value: u.user_id || u.userId || u.id || '',
        label: u.name || u.display_name || u.email || u.user_id || u.userId || u.id || ''
      })).filter((opt) => opt.value));
    });

    // Load mapping analysis (DB-driven)
    this.loadMappingAnalysis();
  }

  private loadMappingAnalysis(): void {
    const fw = this.frameworkFilter || undefined;
    Promise.allSettled([
      this.api.getUnmappedObligations(fw).toPromise(),
      this.api.getWeakControls().toPromise(),
    ]).then(([unmappedR, weakR]) => {
      const unmapped = unmappedR.status === 'fulfilled' ? (unmappedR.value || []) : [];
      const weakControls = weakR.status === 'fulfilled' ? (weakR.value || []) : [];
      const total = this.allControls().length || 1;
      const mapped = total - unmapped.length;
      this.mappingAnalysis.set({
        unmappedCount: unmapped.length,
        weakCount: weakControls.length,
        coveragePct: Math.round((mapped / total) * 100),
        unmapped,
        weakControls,
      });
    });
  }

  setPageSize(size: number): void {
    const maxPageSize = this.settings()?.paginationMaxPageSize ?? 200;
    const clampedSize = Math.min(size, maxPageSize);
    this.pageSize.set(clampedSize);
    this.page.set(1);
    this.reload();
  }

  goToPage(p: number): void {
    const max = this.totalPages();
    if (p < 1 || p > max) return;
    this.page.set(p);
    this.reload();
  }

  isMonitoredView(): boolean {
    return this.route.snapshot.queryParams['monitored'] === '1';
  }

  /** Set when a load fails so we show "Failed to load" + retry instead of only empty state */
  loadError = signal<string | null>(null);

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    if (this.isMonitoredView()) {
      this.agrcOs.getMonitoredControls(100).pipe(
        catchError(() => { this.loadError.set(failMsg); return of({ controls: [], byFramework: {}, frameworkIds: [] }); })
      ).subscribe(res => {
        const list = (res?.controls ?? []).map((c) => ({
          controlId: c.control_id ?? c.controlId ?? c.id,
          title: c.title ?? c.name ?? '',
          status: c.status ?? 'not_started',
          frameworks: c.frameworks ?? (c.framework_id ? [c.framework_id] : []),
          owner: c.owner ?? null,
          evidenceCount: c.evidenceCount ?? c.evidence_count ?? 0,
          riskCount: c.riskCount ?? c.risk_count ?? 0,
          automatable: c.automatable ?? false,
          description: c.description ?? null,
          testStatus: c.testStatus ?? c.test_status ?? null,
        }));
        this.allControls.set(list);
        this.loading.set(false);
      });
    } else {
      const p = this.page();
      const ps = this.pageSize();
      const scopeParam = this.scope() === 'my' ? ('my' as const) : undefined;
      this.api.getControls(this.frameworkFilter || undefined, p, ps, scopeParam, this.statusFilter || undefined, this.ownerFilter || undefined).pipe(
        catchError(() => { this.loadError.set(failMsg); return of({ items: [], total: 0 }); })
      ).subscribe(data => {
        const items = data && typeof data === 'object' && Array.isArray((data as GrcRecord).items)
          ? (data as GrcRecord).items
          : Array.isArray(data) ? data : [];
        const total = data && typeof data === 'object' && typeof (data as GrcRecord).total === 'number' ? (data as GrcRecord).total : items.length;
        this.allControls.set(items);
        this.totalCount.set(total);
        this.loading.set(false);
      });
    }
  }

  countByStatus(status: string): number {
    return this.allControls().filter(c => c.status === status).length;
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  formatStatus(s: string): string {
    if (!s) return '';
    if (isControlStatus(s)) {
      const labels: Record<string, string> = {
        implemented: 'Implemented',
        partially: 'Partially',
        not_implemented: 'Not implemented',
        not_applicable: 'Not applicable',
      };
      return labels[s] ?? s.replace(/_/g, ' ');
    }
    return s.replace(/_/g, ' ');
  }

  openDetail(c: ComplianceControl): void {
    this.selectedCtrl.set(c);
    this.linkedItems.set(null);
    this.cycleLoading.set(true);
    this.cycleService.getLinkedItems(c.controlId).subscribe(items => {
      this.linkedItems.set(items);
      this.cycleLoading.set(false);
    });
  }

  closeDetail(): void {
    this.selectedCtrl.set(null);
    this.linkedItems.set(null);
  }

  // ═══ Selection & Bulk Actions ═══
  toggleSelectControl(controlId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.selectedControlIds());
    if (checked) {
      current.add(controlId);
    } else {
      current.delete(controlId);
    }
    this.selectedControlIds.set(current);
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      const allIds = new Set(this.filtered().map(c => c.controlId));
      this.selectedControlIds.set(allIds);
    } else {
      this.selectedControlIds.set(new Set());
    }
  }

  isAllSelected(): boolean {
    const filtered = this.filtered();
    if (filtered.length === 0) return false;
    const selected = this.selectedControlIds();
    return filtered.every(c => selected.has(c.controlId));
  }

  clearSelection(): void {
    this.selectedControlIds.set(new Set());
    this.bulkAssignOwnerId.set(null);
  }

  handleBulkAssign(): void {
    const ownerId = this.bulkAssignOwnerId();
    const controlIds = Array.from(this.selectedControlIds());
    if (!ownerId || controlIds.length === 0) return;
    this.bulkActionLoading.set(true);
    this.api.bulkAssignControls(controlIds, ownerId).pipe(
      catchError((err) => {
        console.error('Bulk assign failed:', err);
        this.messageService.add({
          severity: 'error',
          summary: this.i18n.translate('Error') || 'Error',
          detail: this.i18n.translate('Failed to assign controls') || 'Failed to assign controls'
        });
        return of({ updated: 0 });
      })
    ).subscribe(result => {
      this.bulkActionLoading.set(false);
      if (result.updated > 0) {
        this.messageService.add({
          severity: 'success',
          summary: this.i18n.translate('Success') || 'Success',
          detail: `${result.updated} ${this.i18n.translate('controls assigned') || 'controls assigned'}`
        });
        this.clearSelection();
        this.reload();
      }
    });
  }

  hasActiveTasks(): boolean {
    const items = this.linkedItems();
    if (!items) return false;
    return (items.gaps.some(g => g.taskStatus !== null) ||
            items.risks.some(r => r.taskStatus !== null) ||
            items.evidence.some(e => e.taskStatus !== null) ||
            items.auditTasks.length > 0);
  }

  launchCycle(): void {
    const c = this.selectedCtrl();
    if (!c) return;
    this.cycleLoading.set(true);
    this.cycleService.launch(c.controlId).subscribe(() => {
      this.cycleService.getLinkedItems(c.controlId).subscribe(items => {
        this.linkedItems.set(items);
        this.cycleLoading.set(false);
      });
    });
  }

  viewAuditLog(): void {
    const c = this.selectedCtrl();
    if (!c) return;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'control', entityId: c.controlId } });
  }
}
