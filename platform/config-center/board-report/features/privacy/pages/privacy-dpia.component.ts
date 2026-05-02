import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface Dpia { id: string; title: string; status: string; risk_level: string; assessor: string; created_at: string; processing_activity: string; }

@Component({
    selector: 'app-privacy-dpia',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.dpia') || 'Data Protection Impact Assessments' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.dpiaDesc') || 'PDPL Art. 22 / GDPR Art. 35 — Conduct and track DPIAs for high-risk processing activities.' }}</p>
      </div>
      <div class="table-toolbar">
        <input type="text" class="search-input" [placeholder]="i18n.translate('common.search') || 'Search...'" (input)="onSearch($event)" />
        <button class="btn-primary"><i class="pi pi-plus"></i> {{ i18n.translate('privacy.newDpia') || 'New DPIA' }}</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Title</th><th>Processing Activity</th><th>Risk Level</th><th>Status</th><th>Assessor</th><th>Created</th></tr></thead>
          <tbody>
            @for (d of filtered(); track d.id) {
              <tr>
                <td class="cell-primary">{{ d.title }}</td>
                <td>{{ d.processing_activity }}</td>
                <td><span class="badge" [class.badge-danger]="d.risk_level==='high'" [class.badge-warning]="d.risk_level==='medium'" [class.badge-success]="d.risk_level==='low'">{{ d.risk_level }}</span></td>
                <td><span class="badge" [class.badge-success]="d.status==='completed'" [class.badge-warning]="d.status==='in_progress'" [class.badge-info]="d.status==='draft'">{{ d.status }}</span></td>
                <td>{{ d.assessor }}</td>
                <td>{{ d.created_at | date:'mediumDate' }}</td>
              </tr>
            } @empty { <tr><td colspan="6" class="empty-state">No DPIAs found</td></tr> }
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
    .btn-primary { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--primary-500, #3b82f6); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-base); font-weight: 500; }
    .data-table-wrapper { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { padding: 0.75rem 1rem; text-align: start; font-weight: 600; color: var(--text-color-secondary); background: var(--surface-ground); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border, #e5e7eb); color: var(--text-color); }
    .data-table tr:hover td { background: var(--surface-hover); } .cell-primary { font-weight: 500; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 500; text-transform: capitalize; }
    .badge-success { background: var(--green-50); color: var(--green-700); }
    .badge-warning { background: var(--yellow-50); color: var(--yellow-700); }
    .badge-danger { background: var(--red-50); color: var(--red-700); }
    .badge-info { background: var(--blue-50); color: var(--blue-700); }
    .empty-state { text-align: center; padding: 2rem !important; color: var(--text-color-secondary); }
  `]
})
export class PrivacyDpiaComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly items = signal<Dpia[]>([]);
  protected readonly filtered = signal<Dpia[]>([]);

  ngOnInit(): void {
    this.http.get<{ items: Dpia[] }>('/api/privacy/dpias').subscribe({ next: (d) => { this.items.set(d.items || []); this.filtered.set(d.items || []); }, error: () => {} });
  }

  onSearch(event: Event): void {
    const t = (event.target as HTMLInputElement).value.toLowerCase();
    this.filtered.set(this.items().filter(d => d.title.toLowerCase().includes(t)));
  }
}
