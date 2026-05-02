/**
 * Quality Gate Trend Widget — Dashboard Widget
 * Shows 30-day quality gate score trend as a simple bar visualization.
 */

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { QualityGateApiService } from '../../admin/services/quality-gate-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quality-gate-trend-widget',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host{display:block}
    .qgt-widget{padding:16px}
    .qgt-title{font-size:var(--font-size-sm);font-weight:700;color:var(--text-heading);margin-bottom:12px}
    .qgt-bars{display:flex;align-items:flex-end;gap:2px;height:60px}
    .qgt-bar{flex:1;border-radius:2px 2px 0 0;min-width:3px;transition:height .3s}
    .qgt-bar.high{background:var(--green-500)}
    .qgt-bar.mid{background:var(--amber-500)}
    .qgt-bar.low{background:var(--red-500)}
    .qgt-bar.none{background:var(--surface-300)}
    .qgt-label{font-size:var(--font-size-xs);color:var(--text-muted);margin-top:8px;text-align:center}
  `],
  template: `
    <div class="qgt-widget">
      <div class="qgt-title">Quality Gate Trend (30d)</div>
      <div class="qgt-bars">
        @for (point of trendData(); track point.date) {
          <div class="qgt-bar"
               [ngClass]="getBarClass(point.overallScore)"
               [style.height.%]="getBarHeight(point.overallScore)"
               [title]="point.date + ': ' + (point.overallScore != null ? (point.overallScore + '%') : 'N/A')">
          </div>
        }
      </div>
      <div class="qgt-label">{{ trendData().length }} days of data</div>
    </div>
  `,
})
export class QualityGateTrendWidgetComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(QualityGateApiService);
  trendData = signal<Array<{ date: string; overallScore: number | null }>>([]);

  ngOnInit(): void {
    this.api.getDashboardTrends(30).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(data => this.trendData.set(data));
  }

  getBarHeight(score: number | null): number {
    if (score == null) return 10;
    return Math.max(10, score);
  }

  getBarClass(score: number | null): string {
    if (score == null) return 'none';
    if (score >= 80) return 'high';
    if (score >= 50) return 'mid';
    return 'low';
  }
}
