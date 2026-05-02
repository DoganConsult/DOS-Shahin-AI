/**
 * EngagementPulseComponent — Compact dashboard card showing real-time
 * engagement health: vendor heatmap, questionnaire pipeline, regulator
 * request status, SLA breach trend, and top 3 alerts.
 *
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6
 */
import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

/* ── Interfaces ── */
interface VendorScore {
  vendor_id: string;
  name: string;
  score: number;
  risk_tier: string;
}

interface QuestionnaireStats {
  draft: number;
  distributed: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

interface RegulatorRequests {
  pending: number;
  responded: number;
  closed: number;
}

interface SLABreachDay { date: string; count: number; }

interface EngagementAlert {
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {};

@Component({
    selector: 'app-engagement-pulse',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="pulse-card">
      <h3 class="pulse-title">Engagement Pulse</h3>

      <!-- 1. Vendor Heatmap -->
      <section class="section" *ngIf="vendors.length">
        <h4 class="section-label">Vendor Health</h4>
        <div class="heatmap-grid">
          <div *ngFor="let v of vendors"
               class="vendor-tile"
               [style.background]="scoreColor(v.score)"
               [title]="v.name + ' — ' + v.score">
            <span class="tile-name">{{ v.name | slice:0:12 }}</span>
            <span class="tile-score">{{ v.score }}</span>
          </div>
        </div>
      </section>

      <!-- 2. Questionnaire Pipeline Bar -->
      <section class="section" *ngIf="qStats">
        <h4 class="section-label">Questionnaire Pipeline</h4>
        <div class="pipeline-bar" [title]="pipelineTooltip()">
          <div class="seg draft"    [style.flex]="qStats.draft">{{ qStats.draft || '' }}</div>
          <div class="seg dist"     [style.flex]="qStats.distributed">{{ qStats.distributed || '' }}</div>
          <div class="seg inprog"   [style.flex]="qStats.in_progress">{{ qStats.in_progress || '' }}</div>
          <div class="seg done"     [style.flex]="qStats.completed">{{ qStats.completed || '' }}</div>
          <div class="seg overdue"  [style.flex]="qStats.overdue">{{ qStats.overdue || '' }}</div>
        </div>
        <div class="legend">
          <span class="leg-item"><span class="dot draft"></span>Draft</span>
          <span class="leg-item"><span class="dot dist"></span>Distributed</span>
          <span class="leg-item"><span class="dot inprog"></span>In Progress</span>
          <span class="leg-item"><span class="dot done"></span>Completed</span>
          <span class="leg-item"><span class="dot overdue"></span>Overdue</span>
        </div>
      </section>

      <!-- 3. Regulator Request Status -->
      <section class="section" *ngIf="regReqs">
        <h4 class="section-label">Regulator Requests</h4>
        <div class="reg-counts">
          <div class="reg-box pending">
            <span class="reg-num">{{ regReqs.pending }}</span>
            <span class="reg-lbl">Pending</span>
          </div>
          <div class="reg-box responded">
            <span class="reg-num">{{ regReqs.responded }}</span>
            <span class="reg-lbl">Responded</span>
          </div>
          <div class="reg-box closed">
            <span class="reg-num">{{ regReqs.closed }}</span>
            <span class="reg-lbl">Closed</span>
          </div>
        </div>
      </section>

      <!-- 4. SLA Breach Trend (SVG line chart) -->
      <section class="section" *ngIf="slaDays.length">
        <h4 class="section-label">SLA Breaches (30 days)</h4>
        <svg class="sla-chart" viewBox="0 0 300 80" preserveAspectRatio="none">
          <polyline [attr.points]="slaPolyline" fill="none" stroke="var(--error, #ef4444)" stroke-width="2" stroke-linejoin="round"/>
          <polyline [attr.points]="slaPolyline" fill="url(#slaGrad)" stroke="none" opacity="0.2"/>
          <defs>
            <linearGradient id="slaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--error, #ef4444)"/>
              <stop offset="100%" stop-color="transparent"/>
            </linearGradient>
          </defs>
        </svg>
      </section>

      <!-- 5. Top 3 Alerts -->
      <section class="section" *ngIf="alerts.length">
        <h4 class="section-label">Top Alerts</h4>
        <div *ngFor="let a of alerts" class="alert-row" [class]="'sev-' + a.severity">
          <span class="alert-dot"></span>
          <span class="alert-msg">{{ a.message }}</span>
        </div>
      </section>

      <div *ngIf="loading" class="loading">Loading…</div>
    </div>
  `,
    styles: [`
    .pulse-card { padding: 12px; font-family: var(--font-family, sans-serif); display: flex; flex-direction: column; gap: 10px; }
    .pulse-title { margin: 0 0 4px; font-size: var(--font-size-base); font-weight: 600; }
    .section-label { margin: 0 0 4px; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.5px; }

    /* Vendor heatmap */
    .heatmap-grid { display: flex; flex-wrap: wrap; gap: 4px; }
    .vendor-tile { width: 56px; height: 40px; border-radius: var(--radius-xs); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: var(--font-size-xs); cursor: default; }
    .tile-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50px; }
    .tile-score { font-weight: 700; font-size: var(--font-size-sm); }

    /* Pipeline bar */
    .pipeline-bar { display: flex; height: 22px; border-radius: var(--radius-xs); overflow: hidden; font-size: var(--font-size-xs); color: #fff; font-weight: 600; text-align: center; line-height: 22px; }
    .seg { min-width: 0; transition: flex 0.3s; }
    .seg.draft    { background: var(--text-muted); }
    .seg.dist     { background: var(--primary); }
    .seg.inprog   { background: var(--warning); }
    .seg.done     { background: var(--success); }
    .seg.overdue  { background: var(--error); }
    .legend { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; font-size: var(--font-size-xs); color: var(--text-secondary, var(--text-muted)); }
    .leg-item { display: flex; align-items: center; gap: 3px; }
    .dot { width: 8px; height: 8px; border-radius: var(--radius-xs); display: inline-block; }
    .dot.draft    { background: var(--text-muted); }
    .dot.dist     { background: var(--primary); }
    .dot.inprog   { background: var(--warning); }
    .dot.done     { background: var(--success); }
    .dot.overdue  { background: var(--error); }

    /* Regulator requests */
    .reg-counts { display: flex; gap: 8px; }
    .reg-box { flex: 1; text-align: center; padding: 6px 4px; border-radius: var(--radius-sm); }
    .reg-box.pending   { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .reg-box.responded { background: #dbeafe; color: #1e40af; }
    .reg-box.closed    { background: #d1fae5; color: #065f46; }
    .reg-num { display: block; font-size: var(--font-size-lg); font-weight: 700; }
    .reg-lbl { font-size: var(--font-size-xs); text-transform: uppercase; }

    /* SLA chart */
    .sla-chart { width: 100%; height: 60px; }

    /* Alerts */
    .alert-row { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); padding: 3px 0; }
    .alert-dot { width: 8px; height: 8px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .sev-high .alert-dot   { background: var(--error); }
    .sev-medium .alert-dot { background: var(--warning); }
    .sev-low .alert-dot    { background: var(--primary); }
    .alert-msg { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .loading { text-align: center; color: var(--text-secondary, var(--text-muted)); font-size: var(--font-size-sm); padding: 16px 0; }
  `]
})
export class EngagementPulseComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private api = environment.apiUrl;

  loading = true;
  vendors: VendorScore[] = [];
  qStats: QuestionnaireStats | null = null;
  regReqs: RegulatorRequests | null = null;
  slaDays: SLABreachDay[] = [];
  slaPolyline = '';
  alerts: EngagementAlert[] = [];

  ngOnInit(): void {
    this.fetchAll();
  }

  /** Color-code by Engagement Score: green 70-100, yellow 40-69, red 0-39 */
  scoreColor(score: number): string {
    if (score >= 70) return '#22c55e';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  pipelineTooltip(): string {
    if (!this.qStats) return '';
    const s = this.qStats;
    return `Draft: ${s.draft}, Distributed: ${s.distributed}, In Progress: ${s.in_progress}, Completed: ${s.completed}, Overdue: ${s.overdue}`;
  }

  /* ── Data fetching ── */
  private fetchAll(): void {
    let pending = 4;
    const done = () => { if (--pending === 0) { this.loading = false; this.cdr.markForCheck(); } };

    this.http.get<Record<string, unknown>>(`${this.api}/engagement-analytics/vendor-scores`).subscribe({
      next: (res) => {
        this.vendors = ((res?.['vendors'] ?? res ?? []) as Record<string, unknown>[]).map((v: Record<string, unknown>) => ({
          vendor_id: v['vendor_id'] as string, name: (v['name'] as string) ?? 'Vendor',
          score: (v['score'] as number) ?? (v['total_score'] as number) ?? 0, risk_tier: (v['risk_tier'] as string) ?? '',
        }));
        done();
      },
      error: () => done(),
    });

    this.http.get<unknown>(`${this.api}/engagement-analytics/questionnaire-stats`).subscribe({
      next: (res) => {
        const data = asRecord(res);
        this.qStats = {
          draft: (data['draft'] as number | undefined) ?? 0,
          distributed: (data['distributed'] as number | undefined) ?? 0,
          in_progress: (data['in_progress'] as number | undefined) ?? 0,
          completed: (data['completed'] as number | undefined) ?? 0,
          overdue: (data['overdue'] as number | undefined) ?? 0,
        };
        done();
      },
      error: () => done(),
    });

    this.http.get<unknown>(`${this.api}/engagement-analytics/regulator-requests`).subscribe({
      next: (res) => {
        const data = asRecord(res);
        this.regReqs = {
          pending: (data['pending'] as number | undefined) ?? 0,
          responded: (data['responded'] as number | undefined) ?? 0,
          closed: (data['closed'] as number | undefined) ?? 0,
        };
        const alerts = data['alerts'];
        if (Array.isArray(alerts)) {
          this.alerts = alerts as EngagementAlert[];
          this.alerts = this.alerts.slice(0, 3);
        }
        done();
      },
      error: () => done(),
    });

    this.http.get<unknown>(`${this.api}/engagement-analytics/sla-breaches`).subscribe({
      next: (res) => {
        const data = asRecord(res);
        const daysValue = data['daily'] ?? data['days'] ?? res;
        const days: SLABreachDay[] = Array.isArray(daysValue) ? daysValue as SLABreachDay[] : [];
        this.slaDays = days;
        this.slaPolyline = this.buildPolyline(days);
        const alerts = data['alerts'];
        if (!this.alerts.length && Array.isArray(alerts)) {
          this.alerts = (alerts as EngagementAlert[]).slice(0, 3);
        }
        done();
      },
      error: () => done(),
    });
  }

  /** Build SVG polyline points for a 300×80 viewBox */
  private buildPolyline(days: SLABreachDay[]): string {
    if (!days.length) return '';
    const maxCount = Math.max(1, ...days.map(d => d.count));
    const stepX = 300 / Math.max(1, days.length - 1);
    const points = days.map((d, i) => {
      const x = i * stepX;
      const y = 80 - (d.count / maxCount) * 70 - 5; // 5px bottom padding
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    // Close area for gradient fill
    return points.join(' ');
  }

}
