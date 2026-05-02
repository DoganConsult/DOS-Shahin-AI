import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  lawful_basis: string;
  data_categories: string[];
  status: string;
  dpo_approved: boolean;
  last_review: string;
}

@Component({
    selector: 'app-privacy-processing-register',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.processingRegister') || 'Processing Register' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.processingRegisterDesc') || 'ROPA — Record of Processing Activities as required by PDPL Art. 32 and GDPR Art. 30.' }}</p>
      </div>

      <div class="table-toolbar">
        <input type="text" class="search-input" [placeholder]="i18n.translate('common.search') || 'Search...'" (input)="onSearch($event)" />
        <button class="btn-primary"><i class="pi pi-plus"></i> {{ i18n.translate('privacy.addActivity') || 'Add Activity' }}</button>
      </div>

      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ i18n.translate('privacy.activityName') || 'Activity Name' }}</th>
              <th>{{ i18n.translate('privacy.purpose') || 'Purpose' }}</th>
              <th>{{ i18n.translate('privacy.lawfulBasis') || 'Lawful Basis' }}</th>
              <th>{{ i18n.translate('privacy.dataCategories') || 'Data Categories' }}</th>
              <th>{{ i18n.translate('common.status') || 'Status' }}</th>
              <th>{{ i18n.translate('privacy.dpoApproved') || 'DPO Approved' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (activity of filteredActivities(); track activity.id) {
              <tr>
                <td class="cell-primary">{{ activity.name }}</td>
                <td>{{ activity.purpose }}</td>
                <td><span class="badge badge-info">{{ activity.lawful_basis }}</span></td>
                <td>{{ activity.data_categories?.join(', ') }}</td>
                <td><span class="badge" [class.badge-success]="activity.status === 'active'" [class.badge-warning]="activity.status === 'draft'" [class.badge-danger]="activity.status === 'expired'">{{ activity.status }}</span></td>
                <td><i class="pi" [class.pi-check-circle]="activity.dpo_approved" [class.pi-times-circle]="!activity.dpo_approved" [style.color]="activity.dpo_approved ? 'var(--green-500)' : 'var(--red-500)'"></i></td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-state">{{ i18n.translate('common.noData') || 'No processing activities found' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; }
    .page-header { margin-bottom: 1.25rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .table-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-md, 8px); font-size: var(--font-size-base); min-width: 240px; background: var(--surface-card); color: var(--text-color); }
    .btn-primary { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--primary-500, #3b82f6); color: white; border: none; border-radius: var(--radius-md, 8px); cursor: pointer; font-size: var(--font-size-base); font-weight: 500; }
    .btn-primary:hover { background: var(--primary-600, #2563eb); }
    .data-table-wrapper { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg, 12px); overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { padding: 0.75rem 1rem; text-align: start; font-weight: 600; color: var(--text-color-secondary); background: var(--surface-ground); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--surface-border, #e5e7eb); color: var(--text-color); }
    .data-table tr:hover td { background: var(--surface-hover); }
    .cell-primary { font-weight: 500; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 500; text-transform: capitalize; }
    .badge-success { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .badge-warning { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
    .badge-danger { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); }
    .badge-info { background: var(--blue-50, #eff6ff); color: var(--blue-700, #1d4ed8); }
    .empty-state { text-align: center; padding: 2rem !important; color: var(--text-color-secondary); }
  `]
})
export class PrivacyProcessingRegisterComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly activities = signal<ProcessingActivity[]>([]);
  protected readonly filteredActivities = signal<ProcessingActivity[]>([]);

  ngOnInit(): void {
    this.http.get<{ items: ProcessingActivity[] }>('/api/privacy/processing-activities').subscribe({
      next: (data) => { this.activities.set(data.items || []); this.filteredActivities.set(data.items || []); },
      error: () => {},
    });
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredActivities.set(this.activities().filter(a => a.name.toLowerCase().includes(term) || a.purpose.toLowerCase().includes(term)));
  }
}
