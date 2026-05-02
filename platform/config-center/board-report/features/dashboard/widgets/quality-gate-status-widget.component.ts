/**
 * Quality Gate Status Widget — Dashboard Widget
 * Shows latest run status with 7-stage mini-pipeline indicator.
 */

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { QualityGateApiService } from '../../admin/services/quality-gate-api.service';
import type { QgateDashboardSummary, QgateStageCode } from '../../admin/contracts/quality-gate.contracts';

const STAGES: QgateStageCode[] = ['devsecops', 'unit', 'integration', 'ai-guardrails', 'e2e-visual', 'performance', 'mutation'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quality-gate-status-widget',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host{display:block}
    .qg-widget{padding:16px}
    .qg-widget-title{font-size:var(--font-size-sm);font-weight:700;color:var(--text-heading);margin-bottom:12px}
    .qg-mini-pipeline{display:flex;gap:4px;align-items:center;margin-bottom:12px}
    .qg-dot{width:20px;height:20px;border-radius:50%;border:2px solid transparent}
    .qg-dot.passed{background:var(--green-500);border-color:var(--green-300)}
    .qg-dot.failed{background:var(--red-500);border-color:var(--red-300)}
    .qg-dot.running{background:var(--blue-500);border-color:var(--blue-300);animation:pulse 1.5s infinite}
    .qg-dot.pending{background:var(--surface-300);border-color:var(--surface-200)}
    .qg-score{font-size:var(--font-size-2xl);font-weight:800;color:var(--text-heading)}
    .qg-label{font-size:var(--font-size-xs);color:var(--text-muted)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  `],
  template: `
    <div class="qg-widget">
      <div class="qg-widget-title">Quality Gate Status</div>
      <div class="qg-mini-pipeline">
        @for (stage of stages; track stage) {
          <div class="qg-dot" [ngClass]="getStatus(stage)" [title]="stage"></div>
        }
      </div>
      <div class="qg-score">{{ passRate() }}%</div>
      <div class="qg-label">30-day pass rate ({{ totalRuns() }} runs)</div>
    </div>
  `,
})
export class QualityGateStatusWidgetComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(QualityGateApiService);

  stages = STAGES;
  summary = signal<QgateDashboardSummary | null>(null);
  passRate = signal(0);
  totalRuns = signal(0);

  ngOnInit(): void {
    this.api.getDashboardSummary().pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(s => {
      if (s) {
        this.summary.set(s);
        this.passRate.set(Math.round(s.passRate30d * 100));
        this.totalRuns.set(s.totalRuns30d);
      }
    });
  }

  getStatus(stage: QgateStageCode): string {
    return this.summary()?.stageHealth?.find(s => s.stageCode === stage)?.lastStatus ?? 'pending';
  }
}
