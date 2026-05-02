import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, AssetDto } from '../services/asset-api.service';
import { GrcDataTableComponent, EmptyStateComponent } from '@app/shared/components';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-asset-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, GrcDataTableComponent, EmptyStateComponent],
  styles: [`
    .asset-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--cyan-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--cyan-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 14px; text-align: center; }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .stat-label { font-size: var(--font-size-2xs); color: var(--text-color-secondary); margin-top: 2px; }
    .toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 240px; }
    .filter-select { padding: 8px 12px; border-radius: var(--radius); border: 1px solid var(--surface-border); font-size: var(--font-size-xs-plus); }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: var(--primary-color-text); }
    .asset-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .asset-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .asset-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .asset-table tr:hover td { background: var(--surface-50); cursor: pointer; }
    .class-badge { padding: 2px 10px; border-radius: var(--radius-md); font-size: var(--font-size-2xs); font-weight: 600; }
    .c-public { background: var(--green-50); color: var(--green-700); }
    .c-internal { background: var(--blue-50); color: var(--blue-700); }
    .c-confidential { background: var(--orange-50); color: var(--orange-700); }
    .c-restricted { background: var(--red-50); color: var(--red-700); }
    .type-icon { width: 28px; height: 28px; border-radius: var(--radius-sm); display: inline-flex; align-items: center; justify-content: center; font-size: var(--font-size-xs-plus); margin-inline-end: 8px; vertical-align: middle; }
    .t-hardware { background: var(--surface-100); color: var(--text-color); }
    .t-software { background: var(--blue-50); color: var(--blue-600); }
    .t-data { background: var(--purple-50); color: var(--purple-600); }
    .t-service { background: var(--teal-50); color: var(--teal-600); }
    .t-people { background: var(--yellow-50); color: var(--yellow-600); }
    .t-facility { background: var(--green-50); color: var(--green-600); }
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-color-secondary); }
    .pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); }
  `],
  template: `
    <div class="asset-page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-server"></i></div>
          <div><h1>{{ i18n.translate('asset.title') }}</h1><p class="subtitle">{{ i18n.translate('asset.subtitle') }}</p></div>
        </div>
        <button class="btn btn-primary" (click)="createAsset()"><i class="pi pi-plus"></i> {{ i18n.translate('asset.create') }}</button>
      </header>

      <div class="stats-strip">
        <div class="stat-card"><div class="stat-value">{{ total() }}</div><div class="stat-label">Total</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--red-500)">{{ criticalCount() }}</div><div class="stat-label">Critical</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--orange-500)">{{ restrictedCount() }}</div><div class="stat-label">Restricted</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--green-500)">{{ activeCount() }}</div><div class="stat-label">Active</div></div>
      </div>

      <grc-data-table
        [title]="i18n.translate('asset.title')"
        [totalRecords]="total()"
        [loading]="loading()"
        [showExport]="true"
        exportFilename="assets"
        [emptyMessage]="i18n.translate('asset.empty')">
        <div tableToolbar>
          <input class="search-input" [placeholder]="i18n.translate('asset.search')" [ngModel]="searchTerm()" (ngModelChange)="onSearch($event)">
          <select class="filter-select" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event); load()">
            <option value="">All Types</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="data">Data</option>
            <option value="service">Service</option>
            <option value="people">People</option>
            <option value="facility">Facility</option>
          </select>
          <select class="filter-select" [ngModel]="classFilter()" (ngModelChange)="classFilter.set($event); load()">
            <option value="">All Classifications</option>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
        <table class="asset-table">
          <thead><tr><th>{{ i18n.translate('asset.name') }}</th><th>Type</th><th>Classification</th><th>Criticality</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>
            @for (a of assets(); track a.id) {
              <tr>
                <td><span class="type-icon" [ngClass]="'t-' + a.type"><i class="pi" [ngClass]="typeIcon(a.type)"></i></span><strong>{{ a.name }}</strong></td>
                <td>{{ a.type }}</td>
                <td><span class="class-badge" [ngClass]="'c-' + a.classification">{{ a.classification }}</span></td>
                <td>{{ a.criticality }}</td>
                <td>{{ a.ownerName || '—' }}</td>
                <td>{{ a.status }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination"><span>{{ assets().length }} / {{ total() }}</span></div>
      </grc-data-table>
    </div>
  `,
})
export class AssetInventoryComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  assets = signal<AssetDto[]>([]);
  total = signal(0);
  searchTerm = signal('');
  typeFilter = signal('');
  classFilter = signal('');

  criticalCount = computed(() => this.assets().filter(a => a.criticality === 'critical').length);
  restrictedCount = computed(() => this.assets().filter(a => a.classification === 'restricted').length);
  activeCount = computed(() => this.assets().filter(a => a.status === 'active').length);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.list({ limit: 50, type: this.typeFilter() || undefined, classification: this.classFilter() || undefined, search: this.searchTerm() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.assets.set(res.data || []); this.total.set(res.total || 0); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }

  onSearch(term: string): void { this.searchTerm.set(term); this.load(); }

  typeIcon(type: string): string {
    const icons: Record<string, string> = { hardware: 'pi-desktop', software: 'pi-code', data: 'pi-database', service: 'pi-cloud', people: 'pi-user', facility: 'pi-building' };
    return icons[type] || 'pi-box';
  }

  createAsset(): void {
    const name = prompt('Asset name:');
    if (!name?.trim()) return;
    this.api.create({ name, type: 'software', classification: 'internal', criticality: 'medium' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
