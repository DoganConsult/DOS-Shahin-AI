import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface DsrRequest { id: string; subject_name: string; request_type: string; status: string; submitted_at: string; deadline: string; completed_at: string | null; }

@Component({
    selector: 'app-privacy-data-subjects',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.dataSubjects') || 'Data Subject Requests' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.dsrDesc') || 'PDPL Art. 8-14 / GDPR Art. 15-22 — Manage access, rectification, erasure, and portability requests.' }}</p>
      </div>
      <div class="kpi-row">
        <div class="kpi-card"><span class="kpi-value">{{ items().length }}</span><span class="kpi-label">Total Requests</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ pendingCount() }}</span><span class="kpi-label">Pending</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ overdueCount() }}</span><span class="kpi-label">Overdue</span></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Subject</th><th>Type</th><th>Status</th><th>Submitted</th><th>Deadline</th><th>Completed</th></tr></thead>
          <tbody>
            @for (r of items(); track r.id) {
              <tr>
                <td class="cell-primary">{{ r.subject_name }}</td>
                <td><span class="badge badge-info">{{ r.request_type }}</span></td>
                <td><span class="badge" [class.badge-success]="r.status==='completed'" [class.badge-warning]="r.status==='pending'" [class.badge-danger]="r.status==='overdue'">{{ r.status }}</span></td>
                <td>{{ r.submitted_at | date:'mediumDate' }}</td>
                <td>{{ r.deadline | date:'mediumDate' }}</td>
                <td>{{ r.completed_at ? (r.completed_at | date:'mediumDate') : '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="6" class="empty-state">No DSR requests</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.25rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-row { display: flex; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 140px; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-warning .kpi-value { color: var(--yellow-600); } .kpi-danger .kpi-value { color: var(--red-500); }
    .data-table-wrapper { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { padding: 0.75rem 1rem; text-align: start; font-weight: 600; color: var(--text-color-secondary); background: var(--surface-ground); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border); color: var(--text-color); }
    .data-table tr:hover td { background: var(--surface-hover); } .cell-primary { font-weight: 500; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 500; text-transform: capitalize; }
    .badge-success { background: var(--green-50); color: var(--green-700); } .badge-warning { background: var(--yellow-50); color: var(--yellow-700); }
    .badge-danger { background: var(--red-50); color: var(--red-700); } .badge-info { background: var(--blue-50); color: var(--blue-700); }
    .empty-state { text-align: center; padding: 2rem !important; color: var(--text-color-secondary); }
  `]
})
export class PrivacyDataSubjectsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly items = signal<DsrRequest[]>([]);
  protected readonly pendingCount = computed(() => this.items().filter(r => r.status === 'pending').length);
  protected readonly overdueCount = computed(() => this.items().filter(r => r.status === 'overdue').length);
  ngOnInit(): void { this.http.get<{ items: DsrRequest[] }>('/api/privacy/dsr-requests').subscribe({ next: (d) => this.items.set(d.items || []), error: () => {} }); }
}
