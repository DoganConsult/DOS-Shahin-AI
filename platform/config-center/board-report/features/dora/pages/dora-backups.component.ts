import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface BackupPolicy {
  id: string;
  systemName: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  backupFrequency: string;
  lastBackup: string;
  lastRestoreTest: string;
  rpoHours: number;
  rtoHours: number;
  status: 'compliant' | 'warning' | 'non_compliant';
  storageGB: number;
}

@Component({
    selector: 'app-dora-backups',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.backups') || 'Backup & Recovery' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.backupsDesc') || 'Manage ICT backup policies, recovery procedures, and restoration testing per DORA Article 12.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ policies().length }}</span><span class="kpi-label">Systems</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ compliantCount() }}</span><span class="kpi-label">Compliant</span></div>
        <div class="kpi-card kpi-warning"><span class="kpi-value">{{ warningCount() }}</span><span class="kpi-label">Warning</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ nonCompliantCount() }}</span><span class="kpi-label">Non-Compliant</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ totalStorage() }} GB</span><span class="kpi-label">Total Storage</span></div>
      </div>

      <div class="section-card">
        <div class="table-header"><h3>Backup Register</h3></div>
        <table class="data-table">
          <thead><tr><th>System</th><th>Tier</th><th>Frequency</th><th>Last Backup</th><th>Last Restore Test</th><th>RPO</th><th>RTO</th><th>Status</th></tr></thead>
          <tbody>
            @for (p of policies(); track p.id) {
              <tr>
                <td class="cell-title">{{ p.systemName }}</td>
                <td><span class="tier-badge">{{ p.tier }}</span></td>
                <td>{{ p.backupFrequency }}</td>
                <td>{{ p.lastBackup | date:'short' }}</td>
                <td>{{ p.lastRestoreTest | date:'mediumDate' }}</td>
                <td>{{ p.rpoHours }}h</td>
                <td>{{ p.rtoHours }}h</td>
                <td><span class="status-badge" [class]="'st-' + p.status">{{ p.status }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty-cell">No backup policies configured</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
    styles: [`
    .module-page { padding: 1.5rem; } .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0 0 0.25rem; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .page-subtitle { margin: 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-warning .kpi-value { color: var(--yellow-600); }
    .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { margin-bottom: 1rem; } .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .tier-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); background: var(--surface-ground); font-weight: 500; text-transform: uppercase; }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; text-transform: capitalize; }
    .st-compliant { background: var(--green-50); color: var(--green-700); }
    .st-warning { background: var(--yellow-50); color: var(--yellow-700); }
    .st-non_compliant { background: var(--red-50); color: var(--red-700); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class DoraBackupsComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly policies = signal<BackupPolicy[]>([]);

  protected readonly compliantCount = () => this.policies().filter(p => p.status === 'compliant').length;
  protected readonly warningCount = () => this.policies().filter(p => p.status === 'warning').length;
  protected readonly nonCompliantCount = () => this.policies().filter(p => p.status === 'non_compliant').length;
  protected readonly totalStorage = () => Math.round(this.policies().reduce((s, p) => s + p.storageGB, 0));

  ngOnInit(): void { this.http.get<BackupPolicy[]>('/api/dora/backups').subscribe({ next: (d) => this.policies.set(d), error: () => {} }); }
}
