import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface MajorIncident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium';
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  reportedAt: string;
  affectedSystems: number;
  assignee: string;
  rtoHours: number;
}

@Component({
    selector: 'app-dora-major-incidents',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.majorIncidents') || 'Major ICT Incidents' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.majorIncidentsDesc') || 'Report and manage major ICT-related incidents per DORA Article 19 requirements.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ openCount() }}</span><span class="kpi-label">Open Incidents</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ investigatingCount() }}</span><span class="kpi-label">Investigating</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ mitigatedCount() }}</span><span class="kpi-label">Mitigated</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ avgRto() }}h</span><span class="kpi-label">Avg RTO</span></div>
      </div>

      <div class="section-card">
        <div class="table-header">
          <h3>{{ i18n.translate('dora.incidentRegister') || 'Incident Register' }}</h3>
          <input type="text" class="search-input" [placeholder]="i18n.translate('common.search') || 'Search incidents...'" (input)="onSearch($event)" />
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Reported</th>
              <th>Affected Systems</th>
              <th>Assignee</th>
              <th>RTO (hrs)</th>
            </tr>
          </thead>
          <tbody>
            @for (incident of filteredIncidents(); track incident.id) {
              <tr>
                <td class="cell-title">{{ incident.title }}</td>
                <td><span class="severity-badge" [class]="'sev-' + incident.severity">{{ incident.severity }}</span></td>
                <td><span class="status-badge" [class]="'st-' + incident.status">{{ incident.status }}</span></td>
                <td>{{ incident.reportedAt | date:'short' }}</td>
                <td>{{ incident.affectedSystems }}</td>
                <td>{{ incident.assignee }}</td>
                <td>{{ incident.rtoHours }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-cell">No incidents recorded</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); }
    .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-danger .kpi-value { color: var(--red-500); }
    .kpi-warning .kpi-value { color: var(--yellow-600); }
    .kpi-success .kpi-value { color: var(--green-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .search-input { padding: 0.5rem 0.75rem; border: 1px solid var(--border-subtle); border-radius: var(--radius); font-size: var(--font-size-base); background: var(--surface-ground); color: var(--text-color); width: 240px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); color: var(--text-color); }
    .cell-title { font-weight: 500; }
    .severity-badge, .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .sev-critical { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); }
    .sev-high { background: var(--orange-50, #fff7ed); color: var(--orange-700, #c2410c); }
    .sev-medium { background: var(--yellow-50, #fefce8); color: var(--yellow-700, #a16207); }
    .st-open { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); }
    .st-investigating { background: var(--blue-50, #eff6ff); color: var(--blue-700, #1d4ed8); }
    .st-mitigated { background: var(--green-50, #f0fdf4); color: var(--green-700, #15803d); }
    .st-closed { background: var(--surface-ground); color: var(--text-color-secondary); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class DoraMajorIncidentsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly incidents = signal<MajorIncident[]>([]);
  protected readonly searchTerm = signal('');

  protected readonly filteredIncidents = () => {
    const term = this.searchTerm().toLowerCase();
    return term ? this.incidents().filter(i => i.title.toLowerCase().includes(term) || i.assignee.toLowerCase().includes(term)) : this.incidents();
  };
  protected readonly openCount = () => this.incidents().filter(i => i.status === 'open').length;
  protected readonly investigatingCount = () => this.incidents().filter(i => i.status === 'investigating').length;
  protected readonly mitigatedCount = () => this.incidents().filter(i => i.status === 'mitigated').length;
  protected readonly avgRto = () => { const list = this.incidents(); return list.length ? Math.round(list.reduce((s, i) => s + i.rtoHours, 0) / list.length) : 0; };

  ngOnInit(): void {
    this.http.get<MajorIncident[]>('/api/dora/major-incidents').subscribe({ next: (d) => this.incidents.set(d), error: () => {} });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
}
