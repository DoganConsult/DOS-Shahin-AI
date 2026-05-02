import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { VendorApiService, VendorDto } from '../services/vendor-api.service';
import { VendorDetailDrawerComponent } from './vendor-detail-drawer.component';
import { GrcDataTableComponent, EmptyStateComponent } from '@app/shared/components';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-management',
  standalone: true,
  imports: [CommonModule, FormsModule, VendorDetailDrawerComponent, GrcDataTableComponent, EmptyStateComponent, ModuleOverviewKitComponent],
  styles: [`
    .vendor-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--orange-50, #fff7ed); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--orange-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 240px; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: #fff; }
    .btn-primary:hover { background: var(--primary-600); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px 18px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 2px; }
    .vendor-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .vendor-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; letter-spacing: 0.5px; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .vendor-table td { padding: 12px 16px; font-size: var(--font-size-base); border-bottom: 1px solid var(--surface-50); }
    .vendor-table tr:hover td { background: var(--surface-50); cursor: pointer; }
    .risk-badge { padding: 2px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; text-transform: uppercase; }
    .risk-low { background: var(--green-50); color: var(--green-700); }
    .risk-medium { background: var(--yellow-50); color: var(--yellow-700); }
    .risk-high { background: var(--orange-50); color: var(--orange-700); }
    .risk-critical { background: var(--red-50); color: var(--red-700); }
    .status-badge { padding: 2px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 500; }
    .status-active { background: var(--green-50); color: var(--green-700); }
    .status-inactive { background: var(--surface-100); color: var(--text-color-secondary); }
    .status-onboarding { background: var(--blue-50); color: var(--blue-700); }
    .status-suspended { background: var(--red-50); color: var(--red-700); }
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
    .page-btns { display: flex; gap: 4px; }
    .page-btn { padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border); background: var(--surface-card); cursor: pointer; font-size: var(--font-size-xs-plus); }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
  `],
  template: `
    <div class="vendor-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-building"></i></div>
          <div>
            <h1>{{ i18n.translate('vendor.title') }}</h1>
            <p class="subtitle">{{ i18n.translate('vendor.subtitle') }}</p>
          </div>
        </div>
        <button class="btn btn-primary" (click)="showCreateForm.set(true)">
          <i class="pi pi-plus"></i> {{ i18n.translate('vendor.addVendor') }}
        </button>
      </header>

      <div class="stats-strip">
        <div class="stat-card">
          <div class="stat-value">{{ totalVendors() }}</div>
          <div class="stat-label">{{ i18n.translate('vendor.totalVendors') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--red-500)">{{ criticalCount() }}</div>
          <div class="stat-label">{{ i18n.translate('vendor.criticalRisk') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--orange-500)">{{ highCount() }}</div>
          <div class="stat-label">{{ i18n.translate('vendor.highRisk') }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--green-500)">{{ activeCount() }}</div>
          <div class="stat-label">{{ i18n.translate('vendor.active') }}</div>
        </div>
      </div>

      <grc-data-table
        [title]="i18n.translate('vendor.title')"
        [totalRecords]="totalVendors()"
        [loading]="loading()"
        [showExport]="true"
        exportFilename="vendors"
        [emptyMessage]="i18n.translate('vendor.empty')">
        <div tableToolbar>
          <input class="search-input" [placeholder]="i18n.translate('vendor.search')" [ngModel]="searchTerm()" (ngModelChange)="onSearch($event)">
          <select class="filter-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); loadVendors()">
            <option value="">{{ i18n.translate('vendor.allStatuses') }}</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="onboarding">Onboarding</option>
            <option value="suspended">Suspended</option>
          </select>
          <select class="filter-select" [ngModel]="riskFilter()" (ngModelChange)="riskFilter.set($event); loadVendors()">
            <option value="">{{ i18n.translate('vendor.allRiskLevels') }}</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <table class="vendor-table">
          <thead>
            <tr>
              <th>{{ i18n.translate('vendor.name') }}</th>
              <th>{{ i18n.translate('vendor.category') }}</th>
              <th>{{ i18n.translate('vendor.status') }}</th>
              <th>{{ i18n.translate('vendor.riskLevel') }}</th>
              <th>{{ i18n.translate('vendor.criticality') }}</th>
              <th>{{ i18n.translate('vendor.nextReview') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (v of vendors(); track v.id) {
              <tr (click)="selectVendor(v)">
                <td><strong>{{ i18n.isRtl() && v.nameAr ? v.nameAr : v.name }}</strong></td>
                <td>{{ v.category }}</td>
                <td><span class="status-badge" [ngClass]="'status-' + v.status">{{ v.status }}</span></td>
                <td><span class="risk-badge" [ngClass]="'risk-' + v.riskLevel">{{ v.riskLevel }}</span></td>
                <td>{{ v.criticality }}</td>
                <td>{{ v.nextReviewDate ? (v.nextReviewDate | date:'mediumDate') : '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <span>{{ i18n.translate('common.showing') }} {{ vendors().length }} / {{ totalVendors() }}</span>
          <div class="page-btns">
            <button class="page-btn" [disabled]="currentPage() <= 1" (click)="goToPage(currentPage() - 1)">←</button>
            <button class="page-btn" [disabled]="currentPage() >= totalPages()" (click)="goToPage(currentPage() + 1)">→</button>
          </div>
        </div>
      </grc-data-table>
    </div>

    <app-module-overview-kit [config]="moduleKitConfig()" />

    @if (selectedVendor()) {
      <app-vendor-detail-drawer [vendor]="selectedVendor()!" (closed)="selectedVendor.set(null)" (updated)="onVendorUpdated($event)" />
    }
  `,
})
export class VendorManagementComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(VendorApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  vendors = signal<VendorDto[]>([]);
  totalVendors = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  searchTerm = signal('');
  statusFilter = signal('');
  riskFilter = signal('');
  selectedVendor = signal<VendorDto | null>(null);
  showCreateForm = signal(false);

  criticalCount = computed(() => this.vendors().filter(v => v.riskLevel === 'critical').length);
  highCount = computed(() => this.vendors().filter(v => v.riskLevel === 'high').length);
  activeCount = computed(() => this.vendors().filter(v => v.status === 'active').length);

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.loading.set(true);
    this.api.list({
      page: this.currentPage(),
      limit: 25,
      status: this.statusFilter() || undefined,
      riskLevel: this.riskFilter() || undefined,
      search: this.searchTerm() || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.vendors.set(res.data || []);
        this.totalVendors.set(res.total || 0);
        this.totalPages.set(res.totalPages || 1);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadVendors();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadVendors();
  }

  selectVendor(v: VendorDto): void {
    this.selectedVendor.set(v);
  }

  onVendorUpdated(updated: VendorDto): void {
    this.vendors.update(list => list.map(v => v.id === updated.id ? updated : v));
    this.selectedVendor.set(null);
  }

  readonly vendorAgents: AgentInfo[] = [
    { id: 'A09', name: 'Vendor Assessor', nameAr: 'مقيّم الموردين', icon: 'pi-building', color: '#f97316', domain: 'Vendor', domainAr: 'الموردين', autonomyLevel: 'hybrid', status: 'active' },
  ];

  readonly vendorTransitions = [
    { from: 'prospect', to: 'due_diligence' },
    { from: 'due_diligence', to: 'onboarded', requiresApproval: true },
    { from: 'due_diligence', to: 'rejected' },
    { from: 'onboarded', to: 'active' },
    { from: 'active', to: 'review_due' },
    { from: 'review_due', to: 'active' },
    { from: 'active', to: 'offboarding' },
    { from: 'offboarding', to: 'offboarded' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'vendor',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 336,
    transitions: this.vendorTransitions,
    currentStatus: 'active',
    agents: this.vendorAgents,
    lang: this.i18n.direction() === 'rtl' ? 'ar' : 'en',
  }));
}
