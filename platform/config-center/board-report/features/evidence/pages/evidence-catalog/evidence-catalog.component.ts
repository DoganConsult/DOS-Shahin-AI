import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageService } from 'primeng/api';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';

// ── Interfaces ──────────────────────────────────────────────────────────────────

interface CatalogRecord {
  evidence_id: string;
  evidenceId?: string;
  evidence_code: string;
  title: string;
  title_ar?: string;
  evidence_type: string;
  source_type: string;
  source_system_name: string;
  owner_user_id: string;
  owner_name?: string;
  linked_count: number;
  freshness_status: string;
  quality_status: string;
  confidentiality_level: string;
  valid_to: string;
  status: string;
  reusable: boolean;
}

interface CatalogResponse {
  items: CatalogRecord[];
  total: number;
  totalCount?: number;
  count?: number;
  kpis?: {
    total: number;
    fresh: number;
    stale: number;
    expired: number;
    auditReady: number;
    reusable: number;
    expiringSoon: number;
  };
}

interface DropdownOption {
  label: string;
  value: string;
}

type ViewMode = 'table' | 'stale' | 'audit-ready';

// ── Component ───────────────────────────────────────────────────────────────────

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-catalog',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, KpiCardGridComponent,
        EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        TableModule, ButtonModule, DropdownModule, InputTextModule,
        InputSwitchModule, ToastModule, DialogModule, TagModule, ToolbarModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-catalog.component.html',
    styleUrls: ['./evidence-catalog.component.scss']
})
export class EvidenceCatalogComponent implements OnInit {
  // ── Injections ──
  readonly i18n = inject(I18nService);
  private readonly evidenceApi = inject(EvidenceApiService);
  private readonly router = inject(Router);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── i18n helpers ──
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  // ── State ──
  loading = signal(true);
  items = signal<CatalogRecord[]>([]);
  totalRecords = signal(0);
  viewMode = signal<ViewMode>('table');
  showCreateDialog = signal(false);

  // ── Pagination ──
  rows = 25;
  first = 0;

  // ── Filters ──
  searchText = '';
  filterEvidenceType = '';
  filterSourceType = '';
  filterFreshness = '';
  filterQuality = '';
  filterStatus = '';
  filterReusableOnly = false;
  filterExpiringSoon = false;

  // ── KPIs ──
  private kpiData = signal<CatalogResponse['kpis'] | null>(null);

  kpis = computed<KpiCardVM[]>(() => {
    const k = this.kpiData();
    if (!k) return [];
    return [
      { id: 'total', labelEn: 'Total Evidence', labelAr: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u062f\u0644\u0629', value: k.total || 0, icon: 'folder-open', color: 'var(--primary)', bg: 'var(--bg-0)', route: '/evidence/catalog' },
      { id: 'fresh', labelEn: 'Fresh', labelAr: '\u062d\u062f\u064a\u062b\u0629', value: k.fresh || 0, icon: 'check-circle', color: 'var(--success)', bg: 'var(--bg-0)', route: '/evidence/catalog', severity: 'success' as const },
      { id: 'stale', labelEn: 'Stale', labelAr: '\u0642\u062f\u064a\u0645\u0629', value: k.stale || 0, icon: 'exclamation-triangle', color: 'var(--warning)', bg: 'var(--bg-0)', route: '/evidence/catalog', severity: (k.stale || 0) > 0 ? 'warning' as const : 'default' as const },
      { id: 'expired', labelEn: 'Expired', labelAr: '\u0645\u0646\u062a\u0647\u064a\u0629', value: k.expired || 0, icon: 'times-circle', color: 'var(--error)', bg: 'var(--bg-0)', route: '/evidence/catalog', severity: (k.expired || 0) > 0 ? 'danger' as const : 'default' as const },
      { id: 'auditReady', labelEn: 'Audit-Ready', labelAr: '\u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629', value: k.auditReady || 0, icon: 'shield', color: 'var(--info)', bg: 'var(--bg-0)', route: '/evidence/catalog' },
      { id: 'reusable', labelEn: 'Reusable', labelAr: '\u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645', value: k.reusable || 0, icon: 'copy', color: 'var(--primary)', bg: 'var(--bg-0)', route: '/evidence/catalog' },
      { id: 'expiringSoon', labelEn: 'Expiring Soon', labelAr: '\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b', value: k.expiringSoon || 0, icon: 'clock', color: 'var(--warning)', bg: 'var(--bg-0)', route: '/evidence/catalog', severity: (k.expiringSoon || 0) > 0 ? 'warning' as const : 'default' as const },
    ];
  });

  // ── Header Actions ──
  headerActions = computed<PageHeaderAction[]>(() => [
    { id: 'create', labelEn: 'Create Evidence', labelAr: '\u0625\u0646\u0634\u0627\u0621 \u062f\u0644\u064a\u0644', icon: 'plus', primary: true },
    { id: 'export', labelEn: 'Export CSV', labelAr: '\u062a\u0635\u062f\u064a\u0631 CSV', icon: 'download' },
  ]);

  // ── Dropdown Options ──
  evidenceTypeOptions: DropdownOption[] = [
    { label: 'All Types', value: '' },
    { label: 'Document', value: 'document' },
    { label: 'Screenshot', value: 'screenshot' },
    { label: 'Log', value: 'log' },
    { label: 'Report', value: 'report' },
    { label: 'Certificate', value: 'certificate' },
    { label: 'Attestation', value: 'attestation' },
    { label: 'Configuration', value: 'configuration' },
    { label: 'Policy', value: 'policy' },
    { label: 'Procedure', value: 'procedure' },
    { label: 'Test Result', value: 'test_result' },
  ];

  sourceTypeOptions: DropdownOption[] = [
    { label: 'All Sources', value: '' },
    { label: 'Manual Upload', value: 'manual_upload' },
    { label: 'Connector Pull', value: 'connector_pull' },
    { label: 'API Integration', value: 'api_integration' },
    { label: 'Agent Collected', value: 'agent_collected' },
    { label: 'Auto-Generated', value: 'auto_generated' },
  ];

  freshnessOptions: DropdownOption[] = [
    { label: 'All Freshness', value: '' },
    { label: 'Fresh', value: 'fresh' },
    { label: 'Aging', value: 'aging' },
    { label: 'Stale', value: 'stale' },
    { label: 'Expired', value: 'expired' },
  ];

  qualityOptions: DropdownOption[] = [
    { label: 'All Quality', value: '' },
    { label: 'Tier A', value: 'A' },
    { label: 'Tier B', value: 'B' },
    { label: 'Tier C', value: 'C' },
  ];

  statusOptions: DropdownOption[] = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Collected', value: 'collected' },
    { label: 'Under Review', value: 'under_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Expired', value: 'expired' },
  ];

  viewModeOptions: DropdownOption[] = [
    { label: 'Table View', value: 'table' },
    { label: 'Stale Evidence', value: 'stale' },
    { label: 'Audit-Ready', value: 'audit-ready' },
  ];

  // ── Create Form ──
  createForm = {
    title: '',
    evidence_type: '',
    source_type: 'manual_upload',
    confidentiality_level: 'internal',
    reusable: false,
  };

  confidentialityOptions: DropdownOption[] = [
    { label: 'Public', value: 'public' },
    { label: 'Internal', value: 'internal' },
    { label: 'Confidential', value: 'confidential' },
    { label: 'Restricted', value: 'restricted' },
  ];

  // ── Lifecycle ──

  ngOnInit(): void {
    this.loadCatalog();
  }

  // ── Data Loading ──

  loadCatalog(): void {
    this.loading.set(true);
    const filters = this.buildFilters();

    this.evidenceApi.searchCatalog(filters).pipe(
      catchError(() => {
        // Fallback to getEvidence if searchCatalog endpoint not available
        return this.evidenceApi.getEvidence(filters).pipe(
          catchError(() => of({ items: [], total: 0 }))
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((res: any) => {
      const items: CatalogRecord[] = res?.items || res?.data || (Array.isArray(res) ? res : []);
      const total = res?.total || res?.totalCount || res?.count || items.length;

      this.items.set(items);
      this.totalRecords.set(total);

      // Extract or compute KPIs from response
      if (res?.kpis) {
        this.kpiData.set(res.kpis);
      } else {
        this.kpiData.set(this.computeKpisFromItems(items, total));
      }

      this.loading.set(false);
    });
  }

  // ── Filter Building ──

  private buildFilters(): Record<string, string> {
    const f: Record<string, string> = {};
    f['offset'] = String(this.first);
    f['limit'] = String(this.rows);

    if (this.searchText?.trim()) f['search'] = this.searchText.trim();
    if (this.filterEvidenceType) f['evidence_type'] = this.filterEvidenceType;
    if (this.filterSourceType) f['source_type'] = this.filterSourceType;
    if (this.filterStatus) f['status'] = this.filterStatus;
    if (this.filterReusableOnly) f['reusable'] = 'true';
    if (this.filterExpiringSoon) f['expiring_soon'] = 'true';

    // View mode pre-filters
    const mode = this.viewMode();
    if (mode === 'stale') {
      f['freshness_status'] = 'stale';
    } else if (mode === 'audit-ready') {
      f['quality_status'] = 'A';
      f['freshness_status'] = 'fresh';
    } else {
      // Normal mode: apply user-selected freshness/quality filters
      if (this.filterFreshness) f['freshness_status'] = this.filterFreshness;
      if (this.filterQuality) f['quality_status'] = this.filterQuality;
    }

    return f;
  }

  // ── KPI Computation (client-side fallback) ──

  private computeKpisFromItems(items: CatalogRecord[], total: number): CatalogResponse['kpis'] {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      total,
      fresh: items.filter(i => i.freshness_status === 'fresh').length,
      stale: items.filter(i => i.freshness_status === 'stale').length,
      expired: items.filter(i => i.freshness_status === 'expired').length,
      auditReady: items.filter(i => i.quality_status === 'A' && i.freshness_status === 'fresh').length,
      reusable: items.filter(i => i.reusable).length,
      expiringSoon: items.filter(i => {
        if (!i.valid_to) return false;
        const vt = new Date(i.valid_to);
        return vt > now && vt <= in30;
      }).length,
    };
  }

  // ── Actions ──

  onHeaderAction(id: string): void {
    if (id === 'create') {
      this.showCreateDialog.set(true);
    } else if (id === 'export') {
      this.exportCsv();
    }
  }

  onKpiClick(card: KpiCardVM): void {
    // Apply relevant filter based on KPI clicked
    if (card.id === 'fresh') { this.filterFreshness = 'fresh'; }
    else if (card.id === 'stale') { this.filterFreshness = 'stale'; }
    else if (card.id === 'expired') { this.filterFreshness = 'expired'; }
    else if (card.id === 'auditReady') { this.viewMode.set('audit-ready'); }
    else if (card.id === 'reusable') { this.filterReusableOnly = true; }
    else if (card.id === 'expiringSoon') { this.filterExpiringSoon = true; }
    this.first = 0;
    this.loadCatalog();
  }

  onRowClick(item: CatalogRecord): void {
    const id = item.evidence_id || item.evidenceId;
    if (id) {
      this.router.navigate(['/evidence/catalog', id]);
    }
  }

  onPageChange(event: any): void {
    this.first = event.first || 0;
    this.rows = event.rows || 25;
    this.loadCatalog();
  }

  onViewModeChange(): void {
    this.first = 0;
    this.loadCatalog();
  }

  applyFilters(): void {
    this.first = 0;
    this.loadCatalog();
  }

  clearFilters(): void {
    this.searchText = '';
    this.filterEvidenceType = '';
    this.filterSourceType = '';
    this.filterFreshness = '';
    this.filterQuality = '';
    this.filterStatus = '';
    this.filterReusableOnly = false;
    this.filterExpiringSoon = false;
    this.viewMode.set('table');
    this.first = 0;
    this.loadCatalog();
  }

  // ── Create Evidence ──

  submitCreate(): void {
    if (!this.createForm.title?.trim()) {
      this.msg.add({ severity: 'warn', summary: this.isAr() ? '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628' : 'Title is required', life: 3000 });
      return;
    }
    if (!this.createForm.evidence_type) {
      this.msg.add({ severity: 'warn', summary: this.isAr() ? '\u0646\u0648\u0639 \u0627\u0644\u062f\u0644\u064a\u0644 \u0645\u0637\u0644\u0648\u0628' : 'Evidence type is required', life: 3000 });
      return;
    }

    this.evidenceApi.addAttachment('evidence', '', this.createForm.evidence_type, this.createForm.title).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      if (res) {
        this.msg.add({ severity: 'success', summary: this.isAr() ? '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062f\u0644\u064a\u0644' : 'Evidence created', life: 3000 });
        this.showCreateDialog.set(false);
        this.resetCreateForm();
        this.loadCatalog();
      } else {
        this.msg.add({ severity: 'error', summary: this.isAr() ? '\u0641\u0634\u0644 \u0627\u0644\u0625\u0646\u0634\u0627\u0621' : 'Creation failed', life: 3000 });
      }
    });
  }

  cancelCreate(): void {
    this.showCreateDialog.set(false);
    this.resetCreateForm();
  }

  private resetCreateForm(): void {
    this.createForm = {
      title: '',
      evidence_type: '',
      source_type: 'manual_upload',
      confidentiality_level: 'internal',
      reusable: false,
    };
  }

  // ── Export ──

  private exportCsv(): void {
    const data = this.items();
    if (!data.length) {
      this.msg.add({ severity: 'warn', summary: this.isAr() ? '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u062a\u0635\u062f\u064a\u0631' : 'No data to export', life: 3000 });
      return;
    }

    const headers = ['Evidence Code', 'Title', 'Type', 'Source', 'Source System', 'Owner', 'Linked Objects', 'Freshness', 'Quality', 'Confidentiality', 'Valid To', 'Status', 'Reusable'];
    const rows = data.map(r => [
      r.evidence_code || '',
      `"${(r.title || '').replace(/"/g, '""')}"`,
      r.evidence_type || '',
      r.source_type || '',
      r.source_system_name || '',
      r.owner_name || r.owner_user_id || '',
      String(r.linked_count || 0),
      r.freshness_status || '',
      r.quality_status || '',
      r.confidentiality_level || '',
      r.valid_to || '',
      r.status || '',
      r.reusable ? 'Yes' : 'No',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidence-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.msg.add({ severity: 'success', summary: this.isAr() ? '\u062a\u0645 \u0627\u0644\u062a\u0635\u062f\u064a\u0631' : 'Export complete', life: 3000 });
  }

  // ── Display Helpers ──

  getFreshnessSeverity(status: string): string {
    switch (status) {
      case 'fresh': return 'success';
      case 'aging': return 'warning';
      case 'stale': return 'danger';
      case 'expired': return 'danger';
      default: return 'info';
    }
  }

  getQualitySeverity(tier: string): string {
    switch (tier) {
      case 'A': return 'success';
      case 'B': return 'warning';
      case 'C': return 'danger';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'approved': return 'success';
      case 'collected': return 'info';
      case 'under_review': return 'warning';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      case 'expired': return 'danger';
      default: return 'info';
    }
  }

  formatStatus(s: string): string {
    return s?.replace(/_/g, ' ') || '';
  }

  formatDate(d: string): string {
    if (!d) return '\u2014';
    try {
      return new Date(d).toLocaleDateString(this.isAr() ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  }

  isExpiringSoon(validTo: string): boolean {
    if (!validTo) return false;
    const vt = new Date(validTo);
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return vt > now && vt <= in30;
  }
}
