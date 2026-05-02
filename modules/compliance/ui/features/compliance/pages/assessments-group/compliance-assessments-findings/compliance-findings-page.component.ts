import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { ButtonModule, ContextMenuModule, NotificationModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-findings-page',
    imports: [CommonModule, AppDatePipe, FormsModule, RouterModule, NotificationModule, ButtonModule, ContextMenuModule, GrcFormFieldComponent],
    providers: [],
    templateUrl: './compliance-findings-page.component.html',
    styleUrls: ['./compliance-findings-page.component.scss']
})
export class ComplianceFindingsPageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private msg = inject(MessageService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  loading = signal(true);
  loadError = signal<string | null>(null);
  allFindings = signal<GrcRecord[]>([]);
  totalCount = signal(0);
  page = signal(1);
  pageSize = signal(25);
  selectedFinding = signal<GrcRecord | null>(null);
  foundationUsers = signal<GrcRecord[]>([]);
  frameworkOptions = signal<string[]>([]);
  scope = signal<'my' | 'all'>('all');
  frameworkFilter = '';
  severityFilter = '';
  statusFilter = '';
  assignedToFilter = '';
  showCreateDialog = false;
  reassignUserId = '';
  newFinding = { title: '', description: '', severity: 'medium', assignedTo: '', dueDate: '' };

  exportMenuItems: [] = [
    { label: 'CSV', icon: '', command: () => this.exportFindings('csv') },
    { label: 'Excel', icon: '', command: () => this.exportFindings('xlsx') },
  ];

  exportFindings(format: 'csv' | 'xlsx'): void {
    this.api.exportFindings(format, this.frameworkFilter || undefined, this.severityFilter || undefined, this.scope() === 'my' ? 'my' : undefined, this.statusFilter || undefined, this.assignedToFilter || undefined)
      .pipe(catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('Export Failed'), detail: this.i18n.translate('Failed to export findings') });
        return of(null);
      }))
      .subscribe(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `findings-export-${new Date().toISOString().split('T')[0]}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
          a.click();
          URL.revokeObjectURL(url);
          this.msg.add({ severity: 'success', summary: this.i18n.translate('Export Successful'), detail: this.i18n.translate('Findings exported successfully') });
        }
      });
  }

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.pageSize())));
  pageStart = computed(() => this.totalCount() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalCount()));

  filtered = computed(() => {
    // Backend filtering is now used, so return all findings as-is
    return this.allFindings();
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['scope'] === 'my') this.scope.set('my');
    if (qp['severity']) this.severityFilter = qp['severity'];
    if (qp['status']) this.statusFilter = qp['status'];
    this.api.getFoundationUsers().pipe(catchError(() => of([]))).subscribe(u => this.foundationUsers.set(u));
    this.reload();
  }

  toggleScope(): void {
    const next = this.scope() === 'my' ? 'all' : 'my';
    this.scope.set(next);
    this.page.set(1);
    this.router.navigate([], { relativeTo: this.route, queryParams: { scope: next === 'my' ? 'my' : null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.reload();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.reload();
  }

  goToPage(p: number): void {
    const max = this.totalPages();
    if (p < 1 || p > max) return;
    this.page.set(p);
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    this.api.getFindings({ frameworkId: this.frameworkFilter || undefined, severity: this.severityFilter || undefined, scope: this.scope() === 'my' ? 'my' : undefined, status: this.statusFilter || undefined, assignedTo: this.assignedToFilter || undefined }, this.page(), this.pageSize()).pipe(catchError(() => {
      this.loadError.set(failMsg);
      return of({ items: [], total: 0 });
    })).subscribe(data => {
      const items = data && typeof data === 'object' && Array.isArray((data as GrcRecord).items)
        ? (data as GrcRecord).items
        : Array.isArray(data) ? data : [];
      const total = data && typeof data === 'object' && typeof (data as GrcRecord).total === 'number' ? (data as GrcRecord).total : items.length;
      this.allFindings.set(items);
      this.totalCount.set(total);
      this.loading.set(false);
    });
  }

  countBySeverity(sev: string): number {
    return this.allFindings().filter(f => f.severity === sev).length;
  }

  countByStatus(status: string): number {
    return this.allFindings().filter(f => f.status === status).length;
  }

  filterBySeverity(sev: string): void {
    this.severityFilter = this.severityFilter === sev ? '' : sev;
    this.reload();
  }

  filterByStatus(status: string): void {
    this.statusFilter = this.statusFilter === status ? '' : status;
  }

  applyFilters(): void {
    this.page.set(1);
    this.reload();
  }

  isOverdue(f: GrcRecord): boolean {
    if (!f.dueDate || f.status === 'closed' || f.status === 'resolved') return false;
    return new Date(f.dueDate) < new Date();
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  openDetail(f: GrcRecord): void { this.selectedFinding.set(f); }
  closeDetail(): void { this.selectedFinding.set(null); }

  createNewFinding(): void {
    if (!this.newFinding.title) return;
    this.api.createFinding(this.newFinding).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateFinding') }); return of(null); })
    ).subscribe(result => {
      if (result) {
        this.showCreateDialog = false;
        this.newFinding = { title: '', description: '', severity: 'medium', assignedTo: '', dueDate: '' };
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.created'), detail: this.i18n.translate('common.findingCreated') });
        this.reload();
      }
    });
  }

  updateStatus(finding: GrcRecord, status: string): void {
    const id = finding.findingId || finding.finding_id;
    if (!id) return;
    this.api.updateFinding(id, { status }).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.statusUpdateFailed') }); return of(null); })
    ).subscribe(result => {
      if (result) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.updated'), detail: this.i18n.translate('common.statusTo', { status: status.replace('_', ' ') }) });
        this.closeDetail();
        this.reload();
      }
    });
  }

  reassignOwner(): void {
    const f = this.selectedFinding();
    if (!f || !this.reassignUserId) return;
    const id = f.findingId || f.finding_id;
    this.api.updateFinding(id, { assignedTo: this.reassignUserId }).pipe(
      catchError(() => { this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.reassignmentFailed') }); return of(null); })
    ).subscribe(result => {
      if (result) {
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.reassigned'), detail: this.i18n.translate('common.ownerUpdatedShort') });
        this.reassignUserId = '';
        this.closeDetail();
        this.reload();
      }
    });
  }

  viewAuditLog(): void {
    const f = this.selectedFinding();
    if (!f) return;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'finding', entityId: f.findingId } });
  }
}
