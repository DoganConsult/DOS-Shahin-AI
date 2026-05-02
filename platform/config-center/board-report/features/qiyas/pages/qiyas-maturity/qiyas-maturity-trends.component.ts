import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasProgressionEntry, QiyasMaturitySnapshot } from '../../qiyas.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-maturity-trends',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.maturityTrends') }}</h1>
          <p class="subtitle">Maturity progression and trend analysis over time</p>
        </div>
        <a routerLink="/qiyas" class="back-link">&larr; {{ i18n.translate('qiyas.title') }}</a>
      </div>

      <!-- Summary cards -->
      <div class="stat-grid" *ngIf="snapshots().length">
        <div class="stat-card">
          <div class="stat-value">{{ latestScore() | number:'1.2-2' }}</div>
          <div class="stat-label">Latest Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ latestLevel() }}</div>
          <div class="stat-label">Maturity Level</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ snapshots().length }}</div>
          <div class="stat-label">Total Snapshots</div>
        </div>
        <div class="stat-card" [class]="trendClass()">
          <div class="stat-value">
            <span *ngIf="trendDirection() === 'improving'">&#9650;</span>
            <span *ngIf="trendDirection() === 'declining'">&#9660;</span>
            <span *ngIf="trendDirection() === 'stable'">&#9644;</span>
            {{ trendDirection() }}
          </div>
          <div class="stat-label">Trend</div>
        </div>
      </div>

      <!-- Domain filter -->
      <div class="filter-row">
        <label>Filter by Domain</label>
        <select [(ngModel)]="selectedDomainId" (ngModelChange)="onDomainFilter($event)" class="input-sm">
          <option value="">All Domains</option>
          <option *ngFor="let d of domainOptions()" [value]="d.id">{{ d.name }}</option>
        </select>
      </div>

      <!-- Bar chart -->
      <div class="section" *ngIf="history().length">
        <h3>Score Progression</h3>
        <div class="chart-container">
          <div class="chart-y-axis">
            <span>5.0</span>
            <span>4.0</span>
            <span>3.0</span>
            <span>2.0</span>
            <span>1.0</span>
            <span>0</span>
          </div>
          <div class="chart-bars">
            <div *ngFor="let entry of history()" class="chart-bar-group">
              <div class="bar-wrapper">
                <div class="bar"
                     [style.height.%]="(entry.overall_score / 5.0) * 100"
                     [class]="'bar-level-' + getBarLevel(entry.overall_score)"
                     [title]="entry.overall_score | number:'1.2-2'">
                  <span class="bar-value">{{ entry.overall_score | number:'1.1-1' }}</span>
                </div>
              </div>
              <div class="bar-label">{{ entry.taken_at | date:'MMM d' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline table -->
      <div class="section">
        <h3>Snapshot Timeline</h3>
        <div class="timeline-list" *ngIf="snapshots().length; else noData">
          <div *ngFor="let snap of snapshots(); let i = index" class="timeline-row">
            <div class="timeline-date">{{ snap.taken_at | date:'mediumDate' }}</div>
            <div class="timeline-score">
              <span class="score-value">{{ snap.overall_score | number:'1.2-2' }}</span>
              <span class="score-max">/ 5.0</span>
            </div>
            <div class="timeline-level">
              <span class="level-badge" [class]="'level-' + getBarLevel(snap.overall_score)">{{ snap.maturity_level }}</span>
            </div>
            <div class="timeline-change" *ngIf="i < snapshots().length - 1">
              <ng-container *ngIf="getDelta(i) as delta">
                <span *ngIf="delta.direction === 'up'" class="change-up">&#9650; +{{ delta.value | number:'1.2-2' }}</span>
                <span *ngIf="delta.direction === 'down'" class="change-down">&#9660; {{ delta.value | number:'1.2-2' }}</span>
                <span *ngIf="delta.direction === 'same'" class="change-same">&#9644; 0.00</span>
              </ng-container>
            </div>
            <div class="timeline-change" *ngIf="i === snapshots().length - 1">
              <span class="change-first">Baseline</span>
            </div>
          </div>
        </div>
        <ng-template #noData>
          <div class="empty">{{ i18n.translate('qiyas.noData') }}</div>
        </ng-template>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; color: var(--text-heading); }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .back-link { font-size: var(--font-size-sm); color: var(--text-muted); text-decoration: none; white-space: nowrap; }
    .back-link:hover { color: var(--primary); }

    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .stat-card { background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
    .stat-card.trend-improving { border-color: #16a34a; }
    .stat-card.trend-declining { border-color: #dc2626; }
    .stat-card.trend-stable { border-color: #d97706; }
    .stat-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); text-transform: capitalize; }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; text-transform: uppercase; font-weight: 600; }

    .filter-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .filter-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); min-width: 220px; }

    .section { margin-bottom: 32px; }
    .section h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--text-heading); margin: 0 0 16px; }

    /* Bar chart */
    .chart-container { display: flex; gap: 0; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px; min-height: 220px; }
    .chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; padding-right: 10px; border-right: 1px solid var(--border-subtle); min-width: 32px; }
    .chart-y-axis span { font-size: var(--font-size-xs); color: var(--text-muted); text-align: right; }
    .chart-bars { display: flex; gap: 8px; align-items: flex-end; flex: 1; padding-left: 12px; overflow-x: auto; }
    .chart-bar-group { display: flex; flex-direction: column; align-items: center; min-width: 44px; flex: 1; max-width: 64px; }
    .bar-wrapper { height: 180px; display: flex; align-items: flex-end; width: 100%; }
    .bar { width: 100%; border-radius: var(--radius-sm) var(--radius-sm) 0 0; min-height: 4px; display: flex; align-items: flex-start; justify-content: center; transition: height 0.3s; }
    .bar-value { font-size: var(--font-size-nano); font-weight: 700; color: #fff; padding-top: 4px; text-shadow: 0 1px 2px rgba(var(--color-black-rgb), 0.3); }
    .bar-level-1 { background: #dc2626; }
    .bar-level-2 { background: #ea580c; }
    .bar-level-3 { background: #ca8a04; }
    .bar-level-4 { background: #65a30d; }
    .bar-level-5 { background: #16a34a; }
    .bar-label { font-size: var(--font-size-nano); color: var(--text-muted); margin-top: 6px; white-space: nowrap; }

    /* Timeline */
    .timeline-list { display: flex; flex-direction: column; gap: 6px; }
    .timeline-row { display: grid; grid-template-columns: 140px 100px 160px 1fr; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); gap: 12px; }
    .timeline-date { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 500; }
    .score-value { font-weight: 700; font-size: var(--font-size-base); color: var(--text-heading); }
    .score-max { font-size: var(--font-size-sm); color: var(--text-muted); }
    .level-badge { font-size: var(--font-size-xs); padding: 2px 10px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .level-1 { background: #fee2e2; color: #dc2626; }
    .level-2 { background: #ffedd5; color: #ea580c; }
    .level-3 { background: #fef3c7; color: #ca8a04; }
    .level-4 { background: #ecfccb; color: #65a30d; }
    .level-5 { background: #dcfce7; color: #16a34a; }

    .change-up { color: #16a34a; font-weight: 600; font-size: var(--font-size-sm); }
    .change-down { color: #dc2626; font-weight: 600; font-size: var(--font-size-sm); }
    .change-same { color: #d97706; font-weight: 600; font-size: var(--font-size-sm); }
    .change-first { font-size: var(--font-size-xs); color: var(--text-muted); font-style: italic; }

    .empty { color: var(--text-muted); text-align: center; padding: 40px; background: var(--surface-ice); border-radius: var(--radius-md); }

    @media (max-width: 768px) {
      .stat-grid { grid-template-columns: repeat(2, 1fr); }
      .timeline-row { grid-template-columns: 1fr 1fr; }
      .chart-container { flex-direction: column; }
      .chart-y-axis { flex-direction: row; border-right: none; border-bottom: 1px solid var(--border-subtle); padding-right: 0; padding-bottom: 8px; }
      .chart-bars { padding-left: 0; padding-top: 12px; }
    }
  `]
})
export class QiyasMaturityTrendsComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  history = signal<QiyasProgressionEntry[]>([]);
  snapshots = signal<QiyasMaturitySnapshot[]>([]);
  loading = signal(false);

  // Summary signals
  latestScore = signal(0);
  latestLevel = signal('N/A');
  trendDirection = signal<'improving' | 'stable' | 'declining'>('stable');
  trendClass = signal('trend-stable');
  domainOptions = signal<{ id: string; name: string }[]>([]);

  selectedDomainId = '';

  ngOnInit() {
    this.loadHistory();
    this.loadSnapshots();
  }

  private loadHistory(domainId?: string) {
    this.loading.set(true);
    this.svc.getProgressionHistory(domainId).subscribe({
      next: (res) => {
        this.history.set(res.history);
        this.extractDomainOptions(res.history);
        this.loading.set(false);
      },
      error: () => { this.history.set([]); this.loading.set(false); },
    });
  }

  private loadSnapshots() {
    this.svc.getMaturitySnapshots().subscribe({
      next: (res) => {
        // Sort descending by taken_at (newest first)
        const sorted = [...res.snapshots].sort((a, b) =>
          new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
        );
        this.snapshots.set(sorted);
        this.computeSummary(sorted);
      },
      error: () => this.snapshots.set([]),
    });
  }

  private computeSummary(sorted: QiyasMaturitySnapshot[]) {
    if (!sorted.length) return;
    const latest = sorted[0];
    this.latestScore.set(latest.overall_score);
    this.latestLevel.set(latest.maturity_level);

    if (sorted.length >= 2) {
      const prev = sorted[1];
      if (latest.overall_score > prev.overall_score) {
        this.trendDirection.set('improving');
        this.trendClass.set('trend-improving');
      } else if (latest.overall_score < prev.overall_score) {
        this.trendDirection.set('declining');
        this.trendClass.set('trend-declining');
      } else {
        this.trendDirection.set('stable');
        this.trendClass.set('trend-stable');
      }
    }
  }

  private extractDomainOptions(history: QiyasProgressionEntry[]) {
    const map = new Map<string, string>();
    for (const entry of history) {
      if (entry.domain_id) {
        map.set(entry.domain_id, entry.domain_id);
      }
    }
    this.domainOptions.set(Array.from(map.entries()).map(([id, name]) => ({ id, name })));
  }

  onDomainFilter(domainId: string) {
    this.loadHistory(domainId || undefined);
  }

  getBarLevel(score: number): number {
    if (score >= 4.5) return 5;
    if (score >= 3.5) return 4;
    if (score >= 2.5) return 3;
    if (score >= 1.5) return 2;
    return 1;
  }

  getDelta(index: number): { direction: 'up' | 'down' | 'same'; value: number } | null {
    const snaps = this.snapshots();
    if (index >= snaps.length - 1) return null;
    const current = snaps[index].overall_score;
    const previous = snaps[index + 1].overall_score;
    const diff = current - previous;
    if (diff > 0) return { direction: 'up', value: diff };
    if (diff < 0) return { direction: 'down', value: diff };
    return { direction: 'same', value: 0 };
  }
}
