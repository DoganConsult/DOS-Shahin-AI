import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface ConsentRecord { id: string; purpose: string; data_subject_category: string; consent_type: string; status: string; granted_at: string; expires_at: string | null; }

@Component({
    selector: 'app-privacy-consent',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.consent') || 'Consent Management' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.consentDesc') || 'Track and manage data subject consent records for all processing purposes.' }}</p>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Purpose</th><th>Category</th><th>Type</th><th>Status</th><th>Granted</th><th>Expires</th></tr></thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr>
                <td class="cell-primary">{{ c.purpose }}</td>
                <td>{{ c.data_subject_category }}</td>
                <td><span class="badge badge-info">{{ c.consent_type }}</span></td>
                <td><span class="badge" [class.badge-success]="c.status==='active'" [class.badge-danger]="c.status==='withdrawn'" [class.badge-warning]="c.status==='expired'">{{ c.status }}</span></td>
                <td>{{ c.granted_at | date:'mediumDate' }}</td>
                <td>{{ c.expires_at ? (c.expires_at | date:'mediumDate') : '—' }}</td>
              </tr>
            } @empty { <tr><td colspan="6" class="empty-state">No consent records</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.25rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
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
export class PrivacyConsentComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly items = signal<ConsentRecord[]>([]);
  ngOnInit(): void { this.http.get<{ items: ConsentRecord[] }>('/api/privacy/consent').subscribe({ next: (d) => this.items.set(d.items || []), error: () => {} }); }
}
