import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-evidence-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageShellComponent, CardModule, TableModule, TagModule, ProgressBarModule, ButtonModule],
  template: `
    <app-page-shell icon="folder-open" [title]="i18n.translate('grcOs.evidenceCatalog')"
      [subtitle]="'Per-control evidence requirements and quality gate status'"
      [breadcrumbs]="['Dashboard', 'Evidence Catalog']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ totalControls }}</div><div class="stat-label">Controls</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ completeCount }}</div><div class="stat-label">Complete</div></div></div>
        <div class="col-3"><div class="stat-box warn"><div class="stat-value">{{ expiringCount }}</div><div class="stat-label">Expiring Soon</div></div></div>
        <div class="col-3"><div class="stat-box"><div class="stat-value">{{ avgCompleteness }}%</div><div class="stat-label">Avg Completeness</div></div></div>
      </div>
      <p-card>
        <p-table aria-label="Catalog table" [value]="catalog" [paginator]="true" [rows]="20"
          [lazy]="true" [totalRecords]="totalRecords" (onLazyLoad)="onLazyLoad($event)" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr><th>Control</th><th>Required</th><th>Collected</th><th>Completeness</th><th>Quality Gate</th><th>Expiry</th><th>Risks</th></tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>{{ item.control_id }}</td>
              <td>{{ item.required }}</td>
              <td>{{ item.collected }}</td>
              <td><p-progressBar [value]="item.completeness" [showValue]="true" [style]="{'height':'10px'}" /></td>
              <td><p-tag [value]="item.gate_status" [severity]="item.gate_status === 'passed' ? 'success' : 'warning'" /></td>
              <td>@if (item.expiring) { <p-tag value="Expiring" severity="danger" /> }</td>
              <td><a [routerLink]="['/risk/register']" [queryParams]="{ evidenceId: item.control_id }" style="color:var(--primary);text-decoration:none;font-weight:500">{{ item.risk_count || 0 }} →</a></td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </app-page-shell>
  `,
  styles: [`.stat-box { text-align: center; padding: 1rem; background: var(--surface-card); border-radius: var(--radius); }
    .stat-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-color); }
    .stat-box.warn .stat-value { color: var(--orange-500); }
    .stat-label { font-size: var(--font-size-tag); color: var(--text-color-secondary); }`]
})
export class EvidenceCatalogComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  catalog: Record<string, any>[] = [];
  totalRecords = 0;
  totalControls = 0; completeCount = 0; expiringCount = 0; avgCompleteness = 0;
  private currentOffset = 0;
  private _initialLoadDone = false;
  private _loadInFlight = false;

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  ngOnInit() {
    this.loadPage();
  }

  loadPage(): void {
    if (this._loadInFlight) return;
    this._loadInFlight = true;
    this.loading = true;
    this.apiclientSvc.get(`/evidence-catalog/catalog/all?offset=${this.currentOffset}&limit=20`).subscribe({
      next: (data: any) => {
        this.catalog = data.catalog || data || [];
        this.totalRecords = data.totalCount ?? data.total ?? data.count ?? this.catalog.length;
        this.totalControls = this.totalRecords;
        this.completeCount = data.completeCount ?? this.catalog.filter((c: Record<string, any>) => c.completeness >= 100).length;
        this.expiringCount = data.expiringCount ?? this.catalog.filter((c: Record<string, any>) => c.expiring).length;
        this.avgCompleteness = data.avgCompleteness ?? (this.catalog.length ? Math.round(this.catalog.reduce((s: number, c: Record<string, any>) => s + (c.completeness || 0), 0) / this.catalog.length) : 0);
        this.loading = false;
        this._loadInFlight = false;
        this._initialLoadDone = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this._loadInFlight = false;
        this._initialLoadDone = true;
        this.cdr.markForCheck();
      }
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const newOffset = event.first || 0;
    if (!this._initialLoadDone) return;
    if (newOffset === this.currentOffset && this.catalog.length > 0) return;
    this.currentOffset = newOffset;
    this.loadPage();
  }
}
