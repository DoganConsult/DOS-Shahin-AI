/**
 * Quality Gate Dashboard — Admin Hub Tab Component
 * Displays 7-stage pipeline, run history, AI guardrail scores,
 * schema drift findings, and per-tenant threshold configuration.
 */

import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/infrastructure';
import { QualityGateApiService } from '../../services/quality-gate-api.service';
import { STAGE_LABELS } from '../../contracts/quality-gate.contracts';
import type { QgateRun, QgateStageResult, QgateDashboardSummary, QgateDriftEntry, QgateStageCode } from '../../contracts/quality-gate.contracts';

const STAGE_ORDER: QgateStageCode[] = ['devsecops', 'unit', 'integration', 'ai-guardrails', 'e2e-visual', 'performance', 'mutation'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-quality-gate-dashboard',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host{display:block;padding:20px 28px}
    .qg-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
    .qg-title{font-size:var(--font-size-xl);font-weight:700;color:var(--text-heading)}
    .qg-subtitle{font-size:var(--font-size-sm);color:var(--text-muted);margin-top:4px}

    /* ── Pipeline Visualization ── */
    .qg-pipeline{display:flex;align-items:center;gap:6px;padding:16px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);margin-bottom:20px;overflow-x:auto}
    .qg-stage{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:100px;padding:10px 8px;border-radius:var(--radius-md);cursor:pointer;transition:background .15s}
    .qg-stage:hover{background:var(--surface-100)}
    .qg-stage-dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--font-size-sm)}
    .qg-stage-dot.passed{background:var(--green-100);color:var(--green-700)}
    .qg-stage-dot.failed{background:var(--red-100);color:var(--red-700)}
    .qg-stage-dot.running{background:var(--blue-100);color:var(--blue-700);animation:pulse 1.5s infinite}
    .qg-stage-dot.pending{background:var(--surface-200);color:var(--text-muted)}
    .qg-stage-label{font-size:var(--font-size-xs);color:var(--text-secondary);text-align:center;font-weight:500}
    .qg-stage-score{font-size:var(--font-size-xs);color:var(--text-muted)}
    .qg-arrow{color:var(--text-muted);font-size:var(--font-size-sm)}

    /* ── Summary Cards ── */
    .qg-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .qg-card{padding:16px;background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);border-inline-start:4px solid var(--card-accent,var(--primary))}
    .qg-card-value{font-size:var(--font-size-2xl);font-weight:800;color:var(--text-heading)}
    .qg-card-label{font-size:var(--font-size-sm);color:var(--text-secondary);margin-top:4px}

    /* ── Run History Table ── */
    .qg-table-wrap{background:var(--surface-card);border:1px solid var(--surface-border);border-radius:var(--radius-md);overflow:hidden}
    .qg-table{width:100%;border-collapse:collapse}
    .qg-table th{text-align:start;padding:10px 14px;font-size:var(--font-size-sm);font-weight:600;color:var(--text-secondary);background:var(--surface-50);border-bottom:1px solid var(--surface-border)}
    .qg-table td{padding:10px 14px;font-size:var(--font-size-sm);border-bottom:1px solid var(--surface-border)}
    .qg-status{display:inline-block;padding:2px 10px;border-radius:var(--radius-xl);font-size:var(--font-size-xs);font-weight:600}
    .qg-status.passed{background:var(--green-100);color:var(--green-700)}
    .qg-status.failed{background:var(--red-100);color:var(--red-700)}
    .qg-status.running{background:var(--blue-100);color:var(--blue-700)}
    .qg-status.pending{background:var(--surface-200);color:var(--text-muted)}
    .qg-status.overridden{background:var(--amber-100);color:var(--amber-700)}

    .qg-btn{padding:6px 16px;border:none;border-radius:var(--radius-md);font-size:var(--font-size-sm);font-weight:600;cursor:pointer;transition:background .15s}
    .qg-btn-primary{background:var(--primary);color:#fff}
    .qg-btn-primary:hover{opacity:.9}

    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    @media(max-width:1200px){.qg-summary{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:768px){.qg-summary{grid-template-columns:1fr}}
  `],
  template: `
    <div [dir]="i18n.direction()">
      <!-- ═══ Header ═══ -->
      <div class="qg-header">
        <div>
          <div class="qg-title">{{ i18n.direction() === 'rtl' ? 'بوابات الجودة' : 'Quality Gates' }}</div>
          <div class="qg-subtitle">{{ i18n.direction() === 'rtl' ? 'تقييم 7 مراحل لكل مستأجر' : '7-stage per-tenant quality evaluation' }}</div>
        </div>
        <button class="qg-btn qg-btn-primary" (click)="triggerRun()">
          <i class="pi pi-play" style="margin-inline-end:6px"></i>
          {{ i18n.direction() === 'rtl' ? 'تشغيل التقييم' : 'Trigger Evaluation' }}
        </button>
      </div>

      <!-- ═══ Pipeline Visualization ═══ -->
      <div class="qg-pipeline">
        @for (stage of stageOrder; track stage; let i = $index) {
          @if (i > 0) { <span class="qg-arrow">→</span> }
          <div class="qg-stage" (click)="selectStage(stage)">
            <div class="qg-stage-dot" [ngClass]="getStageStatus(stage)">
              <i class="pi" [ngClass]="getStageIcon(stage)"></i>
            </div>
            <div class="qg-stage-label">{{ getStageLabel(stage) }}</div>
            <div class="qg-stage-score">{{ getStageScore(stage) }}</div>
          </div>
        }
      </div>

      <!-- ═══ Summary Cards ═══ -->
      <div class="qg-summary">
        <div class="qg-card" style="--card-accent:#059669">
          <div class="qg-card-value">{{ passRate() }}%</div>
          <div class="qg-card-label">{{ i18n.direction() === 'rtl' ? 'معدل النجاح (30 يوم)' : 'Pass Rate (30d)' }}</div>
        </div>
        <div class="qg-card" style="--card-accent:#4f46e5">
          <div class="qg-card-value">{{ aiScore() ?? '—' }}</div>
          <div class="qg-card-label">{{ i18n.direction() === 'rtl' ? 'درجة حواجز الذكاء الاصطناعي' : 'AI Guardrail Score' }}</div>
        </div>
        <div class="qg-card" style="--card-accent:#b45309">
          <div class="qg-card-value">{{ driftCount() }}</div>
          <div class="qg-card-label">{{ i18n.direction() === 'rtl' ? 'نتائج انحراف المخطط' : 'Schema Drift Findings' }}</div>
        </div>
        <div class="qg-card" style="--card-accent:#0891b2">
          <div class="qg-card-value">{{ mutationScore() ?? '—' }}%</div>
          <div class="qg-card-label">{{ i18n.direction() === 'rtl' ? 'درجة الطفرات' : 'Mutation Score' }}</div>
        </div>
      </div>

      <!-- ═══ Run History ═══ -->
      <div class="qg-table-wrap">
        <table class="qg-table">
          <thead>
            <tr>
              <th>{{ i18n.direction() === 'rtl' ? 'المعرف' : 'Run ID' }}</th>
              <th>{{ i18n.direction() === 'rtl' ? 'الحالة' : 'Status' }}</th>
              <th>{{ i18n.direction() === 'rtl' ? 'الدرجة' : 'Score' }}</th>
              <th>{{ i18n.direction() === 'rtl' ? 'المراحل' : 'Stages' }}</th>
              <th>{{ i18n.direction() === 'rtl' ? 'بواسطة' : 'Triggered By' }}</th>
              <th>{{ i18n.direction() === 'rtl' ? 'التاريخ' : 'Date' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (run of runs(); track run.run_id) {
              <tr>
                <td style="font-family:monospace;font-size:var(--font-size-xs)">{{ run.run_id.substring(0,8) }}</td>
                <td><span class="qg-status" [ngClass]="run.status">{{ run.status }}</span></td>
                <td>{{ run.overall_score != null ? (run.overall_score | number:'1.0-1') + '%' : '—' }}</td>
                <td>{{ run.stages_passed }}/{{ run.stages_total }}</td>
                <td>{{ run.triggered_by }}</td>
                <td>{{ run.created_at | date:'short' }}</td>
              </tr>
            }
            @if (runs().length === 0) {
              <tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">
                {{ i18n.direction() === 'rtl' ? 'لا توجد عمليات بعد' : 'No quality gate runs yet' }}
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class QualityGateDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private api = inject(QualityGateApiService);

  stageOrder = STAGE_ORDER;
  summary = signal<QgateDashboardSummary | null>(null);
  runs = signal<QgateRun[]>([]);

  passRate = signal<number>(0);
  aiScore = signal<string | null>(null);
  driftCount = signal<string>('0');
  mutationScore = signal<number | null>(null);

  ngOnInit(): void {
    this.api.getDashboardSummary().pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(s => {
      if (s) {
        this.summary.set(s);
        this.passRate.set(Math.round(s.passRate30d * 100));
        this.aiScore.set(s.aiGuardrailScore != null ? (s.aiGuardrailScore * 100).toFixed(1) : null);
        this.driftCount.set(`${s.schemaDriftCount.critical}/${s.schemaDriftCount.warning}`);
        this.mutationScore.set(s.mutationScore != null ? Math.round(s.mutationScore) : null);
      }
    });

    this.api.getRuns(1, 10).pipe(
      catchError(() => of({ rows: [], total: 0 })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(r => this.runs.set(r.rows));
  }

  getStageStatus(stage: QgateStageCode): string {
    const health = this.summary()?.stageHealth?.find(s => s.stageCode === stage);
    return health?.lastStatus ?? 'pending';
  }

  getStageIcon(stage: QgateStageCode): string {
    return STAGE_LABELS[stage]?.icon ?? 'pi-circle';
  }

  getStageLabel(stage: QgateStageCode): string {
    const labels = STAGE_LABELS[stage];
    return this.i18n.direction() === 'rtl' ? labels?.ar : labels?.en;
  }

  getStageScore(stage: QgateStageCode): string {
    const health = this.summary()?.stageHealth?.find(s => s.stageCode === stage);
    return health?.lastScore != null ? `${(health.lastScore * 100).toFixed(0)}%` : '—';
  }

  selectStage(stage: QgateStageCode): void {
    // Future: expand stage detail panel
  }

  triggerRun(): void {
    this.api.triggerRun({ triggerType: 'manual' }).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(run => {
      this.runs.update(runs => [run, ...runs]);
    });
  }
}
