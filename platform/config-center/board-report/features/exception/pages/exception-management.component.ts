import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ExceptionApiService, ExceptionRequestDto } from '../services/exception-api.service';
import { EmptyStateComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-management',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, ModuleOverviewKitComponent, ExceptionSearchToolbarComponent, ExceptionBulkActionsComponent],
  providers: [DialogService],
  styles: [`
    .exception-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--yellow-50, #fefce8); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--yellow-600); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .toolbar { margin-bottom: 16px; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .btn-outline { background: transparent; border: 1px solid var(--surface-border); color: var(--text-color); }
    .exception-list { display: flex; flex-direction: column; gap: 10px; }
    .exc-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 18px; transition: box-shadow .15s; display: flex; align-items: flex-start; gap: 12px; }
    .exc-card:hover { box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.06); }
    .exc-checkbox { margin-top: 4px; width: 16px; height: 16px; cursor: pointer; }
    .exc-content { flex: 1; }
    .exc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
    .exc-title { font-size: 0.9375rem; font-weight: 600; margin: 0; }
    .status-badge { padding: 3px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; }
    .st-draft { background: var(--surface-100); color: var(--text-color-secondary); }
    .st-pending_approval { background: var(--yellow-50); color: var(--yellow-700); }
    .st-approved { background: var(--green-50); color: var(--green-700); }
    .st-rejected { background: var(--red-50); color: var(--red-700); }
    .st-expired { background: var(--orange-50); color: var(--orange-700); }
    .st-revoked { background: var(--surface-200); color: var(--text-color-secondary); }
    .exc-body { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); margin: 0 0 10px; }
    .exc-meta { display: flex; gap: 12px; font-size: var(--font-size-2xs); color: var(--text-color-secondary); flex-wrap: wrap; }
    .risk-badge { padding: 2px 8px; border-radius: var(--radius); font-size: 0.625rem; font-weight: 700; }
    .r-low { background: var(--green-50); color: var(--green-700); }
    .r-medium { background: var(--yellow-50); color: var(--yellow-700); }
    .r-high { background: var(--orange-50); color: var(--orange-700); }
    .r-critical { background: var(--red-50); color: var(--red-700); }
    .expiry-warning { color: var(--red-500); font-weight: 600; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; }
    .pagination .btn { padding: 6px 14px; font-size: var(--font-size-xs-plus); }
    .pagination .page-info { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .select-all-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: var(--font-size-xs-plus); }
    .select-all-bar label { cursor: pointer; display: flex; align-items: center; gap: 6px; }
  `],
  template: `
    <div class="exception-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-exclamation-triangle"></i></div>
          <div><h1>{{ i18n.translate('exception.title') }}</h1><p class="subtitle">{{ i18n.translate('exception.subtitle') }}</p></div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="exportData()"><i class="pi pi-download"></i> {{ isAr ? 'تصدير' : 'Export' }}</button>
          <button class="btn btn-primary" (click)="createException()"><i class="pi pi-plus"></i> {{ i18n.translate('exception.create') }}</button>
        </div>
      </header>

      <div class="stats-strip">
        <div class="stat-card"><div class="stat-value">{{ total() }}</div><div class="stat-label">Total</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--yellow-500)">{{ pendingCount() }}</div><div class="stat-label">Pending</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--green-500)">{{ approvedCount() }}</div><div class="stat-label">Approved</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--red-500)">{{ expiredCount() }}</div><div class="stat-label">Expired</div></div>
      </div>

      <div class="toolbar">
        <app-exception-search-toolbar (searchChange)="onAdvancedSearch($event)" />
      </div>

      <app-exception-bulk-actions [selectedIds]="selectedIds()" (completed)="onBulkComplete()" />

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (exceptions().length === 0) {
        <app-empty-state variant="default" [title]="i18n.translate('exception.empty')" description="No exceptions have been requested yet." actionLabel="Request Exception" (action)="createException()" [dir]="i18n.direction()" />
      } @else {
        <div class="select-all-bar">
          <label><input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll()" /> {{ isAr ? 'تحديد الكل' : 'Select All' }}</label>
          @if (selectedIds().length > 0) { <span>({{ selectedIds().length }})</span> }
        </div>
        <div class="exception-list">
          @for (e of exceptions(); track e.id) {
            <div class="exc-card">
              <input type="checkbox" class="exc-checkbox" [checked]="isSelected(e.id)" (change)="toggleSelect(e.id)" />
              <div class="exc-content">
                <div class="exc-header">
                  <p class="exc-title">{{ e.title }}</p>
                  <span class="status-badge" [ngClass]="'st-' + e.status">{{ e.status }}</span>
                </div>
                <p class="exc-body">{{ e.justification }}</p>
                <div class="exc-meta">
                  <span class="risk-badge" [ngClass]="'r-' + e.riskLevel">{{ e.riskLevel }} risk</span>
                  <span>Requester: {{ e.requesterName }}</span>
                  @if (e.controlRef) { <span>Control: {{ e.controlRef }}</span> }
                  @if (e.effectiveTo) {
                    <span [class.expiry-warning]="isExpiringSoon(e)">Expires: {{ e.effectiveTo | date:'mediumDate' }}</span>
                  }
                  <span>{{ e.createdAt | date:'mediumDate' }}</span>
                </div>
              </div>
            </div>
          }
        </div>
        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="btn" [disabled]="currentPage() <= 1" (click)="goToPage(currentPage() - 1)">Previous</button>
            <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <button class="btn" [disabled]="currentPage() >= totalPages()" (click)="goToPage(currentPage() + 1)">Next</button>
          </div>
        }
      }
      <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
    </div>
  `,
})
export class ExceptionManagementComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private dialogService = inject(DialogService);
  private exceptionState = inject(ExceptionState);
  i18n = inject(I18nService);

  readonly exceptionAgents: AgentInfo[] = [];

  readonly exceptionTransitions = [
    { from: 'requested', to: 'reviewing' },
    { from: 'reviewing', to: 'approved', requiresApproval: true },
    { from: 'reviewing', to: 'rejected' },
    { from: 'approved', to: 'active' },
    { from: 'active', to: 'expired' },
    { from: 'expired', to: 'requested' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'exception',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 168,
    transitions: this.exceptionTransitions,
    currentStatus: 'reviewing',
    agents: this.exceptionAgents,
    lang: this.i18n.currentLang() === 'ar' ? 'ar' : 'en',
  }));

  loading = signal(true);
  exceptions = signal<ExceptionRequestDto[]>([]);
  total = signal(0);
  searchTerm = signal('');
  statusFilter = signal('');
  currentPage = signal(1);
  pageSize = signal(20);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  selectedIds = signal<string[]>([]);
  useAdvancedSearch = signal(false);
  advancedParams = signal<ExceptionSearchParams>({});
  exporting = signal(false);

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  pendingCount = computed(() => this.exceptions().filter(e => e.status === 'pending_approval').length);
  approvedCount = computed(() => this.exceptions().filter(e => e.status === 'approved').length);
  expiredCount = computed(() => this.exceptions().filter(e => e.status === 'expired').length);
  allSelected = computed(() => this.exceptions().length > 0 && this.selectedIds().length === this.exceptions().length);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.exceptionState.setLoading(true);
    const params = this.advancedParams();
    if (params.q || params.status || params.exceptionType || params.riskLevel || params.sortBy) {
      this.api.search({ ...params, page: this.currentPage(), pageSize: this.pageSize() })
        .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (res: any) => {
            const data = res?.data || res;
            const items = data?.items || data?.data || [];
            this.exceptions.set(items);
            this.total.set(data?.total || 0);
            this.loading.set(false);
            this.syncState(items);
          },
          error: () => { this.loading.set(false); this.exceptionState.setLoading(false); this.exceptionState.setError('Failed to load exceptions'); },
        });
    } else {
      this.api.list({ page: this.currentPage(), limit: this.pageSize(), status: this.statusFilter() || undefined, search: this.searchTerm() || undefined })
        .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: res => {
            const items = res.data || [];
            this.exceptions.set(items);
            this.total.set(res.total || 0);
            this.loading.set(false);
            this.syncState(items);
          },
          error: () => { this.loading.set(false); this.exceptionState.setLoading(false); this.exceptionState.setError('Failed to load exceptions'); },
        });
    }
  }

  private syncState(items: ExceptionRequestDto[]): void {
    this.exceptionState.setExceptions(items.map(e => ({
      exceptionId: e.id, tenantId: e.tenantId, titleEn: e.title, titleAr: e.titleAr ?? null,
      exceptionType: 'policy' as const, status: e.status === 'pending_approval' ? 'submitted' as const : e.status as any,
      requestedById: e.requesterId, approverId: e.approverId ?? null,
      rationale: e.justification, riskAssessment: null,
      compensatingControlIds: [], linkedPolicyIds: [], linkedControlIds: [], linkedRiskIds: [],
      effectiveDate: e.effectiveFrom ?? null, expiryDate: e.effectiveTo ?? null,
      renewalCount: 0, lastRenewalDate: null,
      approvedAt: e.approvedAt ?? null, revokedAt: null,
      createdAt: e.createdAt, updatedAt: e.updatedAt,
    })));
    this.exceptionState.setLoading(false);
    this.exceptionState.setError(null);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.load();
  }

  onAdvancedSearch(params: ExceptionSearchParams): void {
    this.advancedParams.set(params);
    this.currentPage.set(1);
    this.selectedIds.set([]);
    this.load();
  }

  isExpiringSoon(e: ExceptionRequestDto): boolean {
    if (!e.effectiveTo) return false;
    const diff = new Date(e.effectiveTo).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  }

  toggleSelect(id: string): void {
    const current = this.selectedIds();
    this.selectedIds.set(current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  }

  isSelected(id: string): boolean { return this.selectedIds().includes(id); }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set([]);
    } else {
      this.selectedIds.set(this.exceptions().map(e => e.id));
    }
  }

  onBulkComplete(): void {
    this.selectedIds.set([]);
    this.load();
  }

  exportData(): void {
    this.exporting.set(true);
    const filters: Record<string, string> = {};
    const params = this.advancedParams();
    if (params.status) filters['status'] = params.status;
    if (params.riskLevel) filters['riskLevel'] = params.riskLevel;
    if (params.exceptionType) filters['exceptionType'] = params.exceptionType;
    this.api.export(filters).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exceptions-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  createException(): void {
    const ref = this.dialogService.open(ExceptionCreateDialogComponent, {
      header: this.i18n.translate('exception.create'),
      width: '720px',
      modal: true,
      dismissableMask: true,
    });
    ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (!result) return;
      if (result._intake) {
        this.api.intake(result).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
      } else if (result.title?.trim()) {
        this.api.create({ title: result.title, justification: result.justification, riskLevel: result.riskLevel })
          .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
      }
    });
  }
}
