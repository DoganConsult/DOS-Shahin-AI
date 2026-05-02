import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface Breach { id: string; title: string; severity: string; status: string; discovered_at: string; reported_at: string | null; affected_count: number; notification_deadline: string; }

@Component({
    selector: 'app-privacy-breach-notification',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('privacy.breachNotification') || 'Breach Notification Management' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('privacy.breachDesc') || 'PDPL Art. 20 / GDPR Art. 33-34 — Track breaches, notification timelines, and regulatory reporting.' }}</p>
      </div>
      <div class="kpi-row">
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ items().length }}</span><span class="kpi-label">Total Breaches</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ openCount() }}</span><span class="kpi-label">Open</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ unreportedCount() }}</span><span class="kpi-label">Unreported</span></div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Discovered</th><th>Reported</th><th>Affected</th><th>Deadline</th></tr></thead>
          <tbody>
            @for (b of items(); track b.id) {
              <tr>
                <td class="cell-primary">{{ b.title }}</td>
                <td><span class="badge" [class.badge-danger]="b.severity==='critical'" [class.badge-warning]="b.severity==='high'" [class.badge-info]="b.severity==='medium'">{{ b.severity }}</span></td>
                <td><span class="badge" [class.badge-danger]="b.status==='open'" [class.badge-success]="b.status==='closed'" [class.badge-warning]="b.status==='investigating'">{{ b.status }}</span></td>
                <td>{{ b.discovered_at | date:'short' }}</td>
                <td>{{ b.reported_at ? (b.reported_at | date:'short') : '—' }}</td>
                <td>{{ b.affected_count }}</td>
                <td>{{ b.notification_deadline | date:'short' }}</td>
              </tr>
            } @empty { <tr><td colspan="7" class="empty-state">No breaches recorded</td></tr> }
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
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-danger .kpi-value { color: var(--red-500); } .kpi-warning .kpi-value { color: var(--yellow-600); } .kpi-info .kpi-value { color: var(--blue-500); }
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
export class PrivacyBreachNotificationComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly items = signal<Breach[]>([]);
  protected readonly openCount = computed(() => this.items().filter(b => b.status === 'open').length);
  protected readonly unreportedCount = computed(() => this.items().filter(b => !b.reported_at && b.status === 'open').length);

  ngOnInit(): void {
    this.http.get<{ items: Breach[] }>('/api/privacy/breaches').subscribe({ next: (d) => this.items.set(d.items || []), error: () => {} });
  }
}
