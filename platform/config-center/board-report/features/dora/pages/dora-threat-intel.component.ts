import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

interface ThreatFeed {
  id: string;
  source: string;
  type: 'STIX' | 'TAXII' | 'ISAC' | 'vendor' | 'custom';
  status: 'active' | 'paused' | 'error';
  lastSync: string;
  indicatorCount: number;
  relevanceScore: number;
}

@Component({
    selector: 'app-dora-threat-intel',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="module-page" [dir]="i18n.direction()">
      <div class="page-header">
        <h1 class="page-title">{{ i18n.translate('dora.threatIntel') || 'Threat Intelligence' }}</h1>
        <p class="page-subtitle">{{ i18n.translate('dora.threatIntelDesc') || 'Collect, analyze, and share cyber threat intelligence per DORA Article 45 information sharing arrangements.' }}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ feeds().length }}</span><span class="kpi-label">Intel Feeds</span></div>
        <div class="kpi-card kpi-success"><span class="kpi-value">{{ activeFeeds() }}</span><span class="kpi-label">Active</span></div>
        <div class="kpi-card kpi-danger"><span class="kpi-value">{{ errorFeeds() }}</span><span class="kpi-label">Errors</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">{{ totalIndicators() }}</span><span class="kpi-label">Total Indicators</span></div>
      </div>

      <div class="section-card">
        <div class="table-header"><h3>Intelligence Feeds</h3></div>
        <table class="data-table">
          <thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Last Sync</th><th>Indicators</th><th>Relevance</th></tr></thead>
          <tbody>
            @for (feed of feeds(); track feed.id) {
              <tr>
                <td class="cell-title">{{ feed.source }}</td>
                <td><span class="type-badge">{{ feed.type }}</span></td>
                <td><span class="status-badge" [class]="'st-' + feed.status">{{ feed.status }}</span></td>
                <td>{{ feed.lastSync | date:'short' }}</td>
                <td>{{ feed.indicatorCount | number }}</td>
                <td>
                  <div class="relevance-bar"><div class="relevance-fill" [style.width.%]="feed.relevanceScore"></div></div>
                  <span class="relevance-text">{{ feed.relevanceScore }}%</span>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-cell">No threat intelligence feeds configured</td></tr>
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
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .kpi-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .kpi-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--primary-500); } .kpi-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .kpi-success .kpi-value { color: var(--green-500); } .kpi-danger .kpi-value { color: var(--red-500); } .kpi-info .kpi-value { color: var(--blue-500); }
    .section-card { background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; }
    .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .table-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: start; padding: 0.625rem 0.75rem; border-bottom: 2px solid var(--border-subtle); color: var(--text-color-secondary); font-weight: 600; font-size: var(--font-size-caption); }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border-subtle); }
    .cell-title { font-weight: 500; }
    .type-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); background: var(--surface-ground); color: var(--text-color); font-weight: 500; }
    .status-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-lg); font-weight: 500; }
    .st-active { background: var(--green-50); color: var(--green-700); } .st-paused { background: var(--yellow-50); color: var(--yellow-700); } .st-error { background: var(--red-50); color: var(--red-700); }
    .relevance-bar { width: 60px; height: 6px; background: var(--surface-ground); border-radius: 3px; display: inline-block; vertical-align: middle; margin-right: 0.5rem; }
    .relevance-fill { height: 100%; background: var(--primary-500); border-radius: 3px; }
    .relevance-text { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .empty-cell { text-align: center; color: var(--text-color-secondary); padding: 2rem !important; }
  `]
})
export class DoraThreatIntelComponent implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  protected readonly feeds = signal<ThreatFeed[]>([]);

  protected readonly activeFeeds = () => this.feeds().filter(f => f.status === 'active').length;
  protected readonly errorFeeds = () => this.feeds().filter(f => f.status === 'error').length;
  protected readonly totalIndicators = () => this.feeds().reduce((s, f) => s + f.indicatorCount, 0);

  ngOnInit(): void { this.http.get<ThreatFeed[]>('/api/dora/threat-intel').subscribe({ next: (d) => this.feeds.set(d), error: () => {} }); }
}
