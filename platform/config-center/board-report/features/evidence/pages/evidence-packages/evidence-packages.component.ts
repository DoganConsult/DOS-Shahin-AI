/**
 * Evidence Packages & Exports -- Audit-ready evidence packaging.
 *
 * Features:
 *   - KPI strip: Total Packages, Draft, Finalized, Exported
 *   - Filterable p-table: name, type badge, framework, status badge, item count, created date, actions
 *   - Create Package dialog: name, description, type, framework, scope dates
 *   - Package detail drawer: item list, add/remove evidence, finalize, export
 *   - Export format selector (ZIP, PDF, JSON)
 *
 * API endpoints (via EvidenceApiService):
 *   GET    /api/evidence/packages
 *   POST   /api/evidence/packages
 *   GET    /api/evidence/packages/:id
 *   POST   /api/evidence/packages/:id/items
 *   DELETE /api/evidence/packages/:id/items/:itemId
 *   POST   /api/evidence/packages/:id/export
 */

import {
  Component, OnInit, inject, signal, computed,
  ChangeDetectionStrategy, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EvidenceApiService } from '../../services/evidence-api.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';
import { MessageService } from 'primeng/api';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { DialogModule } from 'primeng/dialog';
import { SidebarModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextarea } from 'primeng/textarea';
import { CalendarModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';

/** Evidence package row */
interface EvidencePackage {
  id: string;
  package_code: string;
  name: string;
  package_type: string;
  framework?: string;
  status: string;
  item_count: number;
  created_by: string;
  created_at: string;
  description?: string;
  scope_type?: string;
  scope_id?: string;
}

/** Package detail with items */
interface PackageDetail {
  id: string;
  name: string;
  package_type: string;
  framework?: string;
  status: string;
  description?: string;
  item_count: number;
  items: PackageItem[];
  created_by: string;
  created_at: string;
  finalized_at?: string;
  exported_at?: string;
}

/** Single item within a package */
interface PackageItem {
  id: string;
  evidence_id: string;
  title: string;
  type: string;
  status: string;
  added_at: string;
}

/** Create package form model */
interface CreatePackageForm {
  name: string;
  packageType: string;
  description: string;
  framework: string;
  scopeStartDate: Date | null;
  scopeEndDate: Date | null;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-evidence-packages',
    imports: [
        CommonModule, FormsModule,
        PageHeaderComponent, KpiCardGridComponent,
        SkeletonLoaderComponent, EmptyStateComponent, StatusBadgeComponent,
        GrcDataTableComponent, GrcFormFieldComponent,
        DialogModule, SidebarModule, ButtonModule, InputTextModule,
        DropdownModule, CardModule, TableModule, ToastModule,
        TooltipModule, InputTextarea, CalendarModule, SkeletonModule,
    ],
    providers: [MessageService],
    templateUrl: './evidence-packages.component.html',
    styleUrls: ['./evidence-packages.component.scss']
})
export class EvidencePackagesComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly api = inject(EvidenceApiService);
  private readonly msg = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // ── Computed i18n helpers ──
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction());

  // ── State ──
  loading = signal(true);
  packages = signal<EvidencePackage[]>([]);
  totalCount = signal(0);

  // ── KPI strip ──
  kpis = computed<KpiCardVM[]>(() => {
    const pkgs = this.packages();
    const total = pkgs.length;
    const draft = pkgs.filter(p => p.status === 'draft').length;
    const finalized = pkgs.filter(p => p.status === 'finalized' || p.status === 'ready').length;
    const exported = pkgs.filter(p => p.status === 'exported').length;
    return [
      {
        id: 'total', labelEn: 'Total Packages', labelAr: 'إجمالي الحزم',
        value: total, icon: 'box', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
      {
        id: 'draft', labelEn: 'Draft', labelAr: 'مسودة',
        value: draft, icon: 'pencil', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)',
        route: '', severity: 'warning' as const,
      },
      {
        id: 'finalized', labelEn: 'Finalized', labelAr: 'نهائي',
        value: finalized, icon: 'check-circle', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 12%, transparent)',
        route: '', severity: 'success' as const,
      },
      {
        id: 'exported', labelEn: 'Exported', labelAr: 'مُصَدَّر',
        value: exported, icon: 'download', color: 'var(--info)', bg: 'color-mix(in srgb, var(--info) 12%, transparent)',
        route: '', severity: 'default' as const,
      },
    ];
  });

  // ── Header actions ──
  readonly headerActions: PageHeaderAction[] = [
    { id: 'create', labelEn: 'Create Package', labelAr: 'إنشاء حزمة', icon: 'plus', primary: true },
  ];

  // ── Filters ──
  filterType = signal<string | null>(null);
  filterStatus = signal<string | null>(null);

  readonly typeOptions = [
    { label: 'Audit', labelAr: 'تدقيق', value: 'audit' },
    { label: 'Regulator', labelAr: 'جهة تنظيمية', value: 'regulator' },
    { label: 'Framework', labelAr: 'إطار عمل', value: 'framework' },
    { label: 'Remediation', labelAr: 'معالجة', value: 'remediation' },
  ];

  readonly statusOptions = [
    { label: 'Draft', labelAr: 'مسودة', value: 'draft' },
    { label: 'Finalized', labelAr: 'نهائي', value: 'finalized' },
    { label: 'Exported', labelAr: 'مُصَدَّر', value: 'exported' },
  ];

  typeDropdownOptions = computed(() =>
    this.typeOptions.map(o => ({ label: this.isAr() ? o.labelAr : o.label, value: o.value }))
  );

  statusDropdownOptions = computed(() =>
    this.statusOptions.map(o => ({ label: this.isAr() ? o.labelAr : o.label, value: o.value }))
  );

  // ── Framework options (loaded from API) ──
  frameworkOptions = signal<{ label: string; value: string }[]>([]);

  // ── Create Dialog ──
  showCreateDialog = signal(false);
  createForm = signal<CreatePackageForm>({
    name: '', packageType: 'audit', description: '',
    framework: '', scopeStartDate: null, scopeEndDate: null,
  });
  creating = signal(false);

  // ── Detail Drawer ──
  showDrawer = signal(false);
  drawerLoading = signal(false);
  drawerDetail = signal<PackageDetail | null>(null);

  // ── Export format ──
  readonly exportFormatOptions = [
    { label: 'ZIP', value: 'zip' },
    { label: 'PDF', value: 'pdf' },
    { label: 'JSON', value: 'json' },
  ];
  selectedExportFormat = signal('zip');

  ngOnInit(): void {
    this.loadPackages();
    this.loadFrameworks();
  }

  /** Load all packages with current filters */
  loadPackages(): void {
    this.loading.set(true);
    const filters: Record<string, string> = {};
    if (this.filterType()) filters['type'] = this.filterType()!;
    if (this.filterStatus()) filters['status'] = this.filterStatus()!;

    this.api.listPackages(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, any>) => {
          const items = Array.isArray((res as Record<string, any>)?.['items'])
            ? (res as Record<string, any>)['items'] as EvidencePackage[]
            : Array.isArray(res)
              ? res as unknown as EvidencePackage[]
              : [];
          this.packages.set(items);
          this.totalCount.set((res?.['count'] as number) ?? items.length);
          this.loading.set(false);
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل تحميل الحزم' : 'Failed to load packages' });
          this.loading.set(false);
        },
      });
  }

  /** Load framework options for the create dialog */
  private loadFrameworks(): void {
    this.api.getFrameworks()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (frameworks) => {
          const opts = (frameworks || []).map(f => ({
            label: this.isAr() ? (f.titleAr || f.title) : f.title,
            value: f.key || f.id,
          }));
          this.frameworkOptions.set(opts);
        },
        error: () => { /* non-critical, framework dropdown will be empty */ },
      });
  }

  // ── Header action handler ──
  onHeaderAction(actionId: string): void {
    if (actionId === 'create') this.openCreateDialog();
  }

  // ── Filter ──
  onFilterChange(): void {
    this.loadPackages();
  }

  // ── Create Dialog ──
  openCreateDialog(): void {
    this.createForm.set({
      name: '', packageType: 'audit', description: '',
      framework: '', scopeStartDate: null, scopeEndDate: null,
    });
    this.showCreateDialog.set(true);
  }

  onCreatePackage(): void {
    const form = this.createForm();
    if (!form.name.trim()) {
      this.msg.add({ severity: 'warn', summary: this.isAr() ? 'تنبيه' : 'Warning', detail: this.isAr() ? 'الاسم مطلوب' : 'Name is required' });
      return;
    }
    this.creating.set(true);
    this.api.createPackage({
      name: form.name.trim(),
      packageType: form.packageType,
      description: form.description.trim() || undefined,
      scopeType: form.framework || undefined,
      scopeId: form.framework || undefined,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Success', detail: this.isAr() ? 'تم إنشاء الحزمة' : 'Package created' });
          this.showCreateDialog.set(false);
          this.creating.set(false);
          this.loadPackages();
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل إنشاء الحزمة' : 'Failed to create package' });
          this.creating.set(false);
        },
      });
  }

  /** Update a field in the create form */
  updateForm(field: keyof CreatePackageForm, value: any): void {
    this.createForm.update(f => ({ ...f, [field]: value }));
  }

  // ── Row click: open detail drawer ──
  onRowClick(pkg: EvidencePackage): void {
    this.showDrawer.set(true);
    this.drawerLoading.set(true);
    this.drawerDetail.set(null);

    this.api.getPackage(pkg.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, any>) => {
          const detail: PackageDetail = {
            id: (res['id'] as string) || pkg.id,
            name: (res['name'] as string) || pkg.name,
            package_type: (res['package_type'] as string) || pkg.package_type,
            framework: (res['framework'] as string) || pkg.framework,
            status: (res['status'] as string) || pkg.status,
            description: (res['description'] as string) || pkg.description,
            item_count: (res['item_count'] as number) ?? pkg.item_count,
            items: Array.isArray(res['items']) ? (res['items'] as PackageItem[]) : [],
            created_by: (res['created_by'] as string) || pkg.created_by,
            created_at: (res['created_at'] as string) || pkg.created_at,
            finalized_at: res['finalized_at'] as string,
            exported_at: res['exported_at'] as string,
          };
          this.drawerDetail.set(detail);
          this.drawerLoading.set(false);
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل تحميل التفاصيل' : 'Failed to load details' });
          this.drawerLoading.set(false);
        },
      });
  }

  /** Remove an item from the currently open package */
  onRemoveItem(item: PackageItem): void {
    const detail = this.drawerDetail();
    if (!detail) return;
    this.api.removeItemFromPackage(detail.id, item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.drawerDetail.update(d => {
            if (!d) return d;
            const updated = { ...d, items: d.items.filter(i => i.id !== item.id), item_count: d.item_count - 1 };
            return updated;
          });
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Removed', detail: this.isAr() ? 'تمت إزالة العنصر' : 'Item removed' });
          this.loadPackages();
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشلت الإزالة' : 'Remove failed' });
        },
      });
  }

  /** Finalize a package (transition status) */
  onFinalizePackage(): void {
    const detail = this.drawerDetail();
    if (!detail) return;
    this.api.validatePackageFreshness(detail.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Finalized', detail: this.isAr() ? 'تم تأكيد الحزمة' : 'Package finalized' });
          this.drawerDetail.update(d => d ? { ...d, status: 'finalized' } : d);
          this.loadPackages();
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل التأكيد' : 'Finalization failed' });
        },
      });
  }

  /** Export a package with selected format */
  onExportPackage(pkg?: EvidencePackage): void {
    const id = pkg?.id || this.drawerDetail()?.id;
    if (!id) return;

    this.api.exportPackage(id, this.selectedExportFormat())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msg.add({ severity: 'success', summary: this.isAr() ? 'تم' : 'Success', detail: this.isAr() ? 'تم تصدير الحزمة' : 'Package exported' });
          this.loadPackages();
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: this.isAr() ? 'خطأ' : 'Error', detail: this.isAr() ? 'فشل التصدير' : 'Export failed' });
        },
      });
  }

  /** Format a package type for bilingual display */
  formatType(type: string): string {
    const match = this.typeOptions.find(o => o.value === type);
    if (!match) return type;
    return this.isAr() ? match.labelAr : match.label;
  }
}
