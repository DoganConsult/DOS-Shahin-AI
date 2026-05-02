import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface IctAsset { id: string; name: string; category: string; criticality: string; vendor: string; status: string; last_assessment: string; risk_score: number; }

@Component({
    selector: 'app-dora-ict-assets',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.ictAssets') || 'ICT Asset Register' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.ictAssetsDesc') || 'DORA Art. 8 — Register and classify all ICT assets including third-party dependencies.' }}</p>
      </div>
      <div class="table-toolbar">
        <input type="text" class="search-input" [placeholder]="i18n.translate('common.search') || 'Search...'" (input)="onSearch($event)" />
        <button class="btn-primary"><i class="pi pi-plus"></i> Add Asset</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Asset Name</th><th>Category</th><th>Criticality</th><th>Vendor</th><th>Status</th><th>Risk Score</th><th>Last Assessment</th></tr></thead>
          <tbody>
            @for (a of filtered(); track a.id) {
              <tr>
                <td class="cell-primary">{{ a.name }}</td>
                <td>{{ a.category }}</td>
                <td><span class="badge" [class.badge-danger]="a.criticality==='critical'" [class.badge-warning]="a.criticality==='high'" [class.badge-info]="a.criticality==='medium'" [class.badge-success]="a.criticality==='low'">{{ a.criticality }}</span></td>
                <td>{{ a.vendor }}</td>
                <td><span class="badge" [class.badge-success]="a.status==='active'" [class.badge-warning]="a.status==='review'" [class.badge-danger]="a.status==='deprecated'">{{ a.status }}</span></td>
                <td><span class="risk-score" [class.risk-high]="a.risk_score >= 70" [class.risk-medium]="a.risk_score >= 40 && a.risk_score < 70" [class.risk-low]="a.risk_score < 40">{{ a.risk_score }}</span></td>
                <td>{{ a.last_assessment | date:'mediumDate' }}</td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty-state">No ICT assets registered</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.25rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 240px; background: var(--surface-card); color: var(--text-color); }
    .btn-primary { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--primary-500, #3b82f6); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-base); }
    .data-table-wrapper { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { padding: 0.75rem 1rem; text-align: start; font-weight: 600; color: var(--text-color-secondary); background: var(--surface-ground); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border); color: var(--text-color); }
    .data-table tr:hover td { background: var(--surface-hover); } .cell-primary { font-weight: 500; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 500; text-transform: capitalize; }
    .badge-success { background: var(--green-50); color: var(--green-700); } .badge-warning { background: var(--yellow-50); color: var(--yellow-700); }
    .badge-danger { background: var(--red-50); color: var(--red-700); } .badge-info { background: var(--blue-50); color: var(--blue-700); }
    .risk-score { font-weight: 600; } .risk-high { color: var(--red-500); } .risk-medium { color: var(--yellow-600); } .risk-low { color: var(--green-500); }
    .empty-state { text-align: center; padding: 2rem !important; color: var(--text-color-secondary); }
  `]
})
export class DoraIctAssetsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly items = signal<IctAsset[]>([]);
  protected readonly filtered = signal<IctAsset[]>([]);

  ngOnInit(): void {
    this.http.get<{ items: IctAsset[] }>('/api/dora/ict-assets').subscribe({ next: (d) => { this.items.set(d.items || []); this.filtered.set(d.items || []); }, error: () => {} });
  }

  onSearch(event: Event): void {
    const t = (event.target as HTMLInputElement).value.toLowerCase();
    this.filtered.set(this.items().filter(a => a.name.toLowerCase().includes(t) || a.vendor.toLowerCase().includes(t)));
  }
}
