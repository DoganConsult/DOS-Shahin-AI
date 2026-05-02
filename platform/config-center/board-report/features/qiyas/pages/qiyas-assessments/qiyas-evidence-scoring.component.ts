import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasEvidenceQualityMetric, QiyasEvidenceScoringModel } from '../../qiyas.models';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-evidence-scoring',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.evidenceScoring') }}</h1>
          <p class="subtitle">Evidence quality scoring dashboard</p>
        </div>
        <a routerLink="/qiyas" class="back-link">&larr; {{ i18n.translate('qiyas.title') }}</a>
      </div>

      <!-- Summary cards -->
      <div class="stat-grid" *ngIf="metrics().length">
        <div class="stat-card">
          <div class="stat-value">{{ totalEvidence() }}</div>
          <div class="stat-label">Total Evidence</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ avgScore() | number:'1.1-1' }}%</div>
          <div class="stat-label">Avg Quality Score</div>
        </div>
        <div class="stat-card excellent">
          <div class="stat-value">{{ excellentCount() }}</div>
          <div class="stat-label">Excellent</div>
        </div>
        <div class="stat-card good">
          <div class="stat-value">{{ goodCount() }}</div>
          <div class="stat-label">Good</div>
        </div>
        <div class="stat-card fair">
          <div class="stat-value">{{ fairCount() }}</div>
          <div class="stat-label">Fair</div>
        </div>
        <div class="stat-card poor">
          <div class="stat-value">{{ poorCount() }}</div>
          <div class="stat-label">Poor</div>
        </div>
      </div>

      <!-- Domain metrics table -->
      <div class="section">
        <h3>Quality by Domain</h3>
        <div class="table-wrap">
          <table class="data-table" *ngIf="metrics().length; else noMetrics">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Avg Score</th>
                <th>Min</th>
                <th>Max</th>
                <th>Evidence</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of metrics()">
                <td class="domain-name">{{ m.domain_name }}</td>
                <td>
                  <div class="progress-wrap">
                    <div class="progress-bar" [style.width.%]="m.avg_score" [class]="'bar-' + m.quality_rating"></div>
                    <span class="progress-text">{{ m.avg_score | number:'1.1-1' }}%</span>
                  </div>
                </td>
                <td class="num-cell">{{ m.min_score | number:'1.1-1' }}%</td>
                <td class="num-cell">{{ m.max_score | number:'1.1-1' }}%</td>
                <td class="num-cell">{{ m.evidence_count }}</td>
                <td>
                  <span class="rating-badge" [class]="'rating-' + m.quality_rating">{{ m.quality_rating }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #noMetrics>
            <div class="empty">{{ i18n.translate('qiyas.noData') }}</div>
          </ng-template>
        </div>
      </div>

      <!-- Scoring Models -->
      <div class="section">
        <h3>Evidence Scoring Models</h3>
        <div class="model-list" *ngIf="scoringModels().length; else noModels">
          <div *ngFor="let sm of scoringModels()" class="scoring-model-card"
               [class.selected]="selectedModelId === sm.scoring_model_id"
               (click)="selectModel(sm)">
            <div class="sm-info">
              <div class="sm-name">{{ sm.name_en }}</div>
              <div class="sm-desc" *ngIf="sm.description_en">{{ sm.description_en }}</div>
            </div>
            <div class="sm-meta">
              <span class="sm-stat">{{ sm.criteria?.length || 0 }} criteria</span>
              <span class="sm-stat">Max: {{ sm.max_score }}</span>
            </div>
          </div>
        </div>
        <ng-template #noModels>
          <div class="empty">{{ i18n.translate('qiyas.noData') }}</div>
        </ng-template>
      </div>

      <!-- Score Evidence Form -->
      <div class="section">
        <h3>Score Evidence</h3>
        <div class="score-form">
          <div class="form-row">
            <div class="form-group">
              <label>Evidence ID</label>
              <input [(ngModel)]="scoreForm.evidence_id" placeholder="Enter evidence ID" aria-label="Evidence ID" class="input" />
            </div>
            <div class="form-group">
              <label>Scoring Model</label>
              <select [(ngModel)]="scoreForm.scoring_model_id" (ngModelChange)="onModelSelect($event)" class="input">
                <option value="">Select scoring model</option>
                <option *ngFor="let sm of scoringModels()" [value]="sm.scoring_model_id">{{ sm.name_en }}</option>
              </select>
            </div>
          </div>

          <!-- Dynamic criteria scores -->
          <div class="criteria-section" *ngIf="activeCriteria().length">
            <h4>Criteria Scores</h4>
            <div *ngFor="let c of activeCriteria(); let i = index" class="criteria-row">
              <label class="criteria-label">{{ c.name || ('Criterion ' + (i + 1)) }}</label>
              <input type="number" [(ngModel)]="criteriaScores[i]"
                     [attr.min]="0" [attr.max]="c.max_score || 10"
                     [placeholder]="'0 - ' + (c.max_score || 10)"
                     [attr.aria-label]="c.name || ('Criterion ' + (i + 1))"
                     class="input input-narrow" />
              <span class="criteria-max">/ {{ c.max_score || 10 }}</span>
            </div>
          </div>

          <button class="btn-primary"
                  [disabled]="!scoreForm.evidence_id || !scoreForm.scoring_model_id || !activeCriteria().length"
                  (click)="submitScore()">
            Submit Score
          </button>
          <span class="success-msg" *ngIf="submitSuccess()">Score submitted successfully.</span>
        </div>
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

    .stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 32px; }
    .stat-card { background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 18px 14px; text-align: center; }
    .stat-card.excellent { border-color: #16a34a; }
    .stat-card.good { border-color: #2563eb; }
    .stat-card.fair { border-color: #d97706; }
    .stat-card.poor { border-color: #dc2626; }
    .stat-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 4px; text-transform: uppercase; font-weight: 600; }

    .section { margin-bottom: 32px; }
    .section h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--text-heading); margin: 0 0 14px; }

    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .data-table thead { background: var(--surface-ice); }
    .data-table th { padding: 10px 14px; text-align: left; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .data-table td { padding: 12px 14px; font-size: var(--font-size-base); border-bottom: 1px solid var(--border-subtle); }
    .data-table tr:last-child td { border-bottom: none; }
    .domain-name { font-weight: 500; color: var(--text-heading); }
    .num-cell { text-align: center; color: var(--text-muted); font-size: var(--font-size-sm); }

    .progress-wrap { position: relative; height: 22px; background: var(--surface-ice); border-radius: var(--radius-sm); overflow: hidden; min-width: 120px; }
    .progress-bar { height: 100%; border-radius: var(--radius-sm); transition: width 0.3s; }
    .bar-excellent { background: #16a34a; }
    .bar-good { background: #2563eb; }
    .bar-fair { background: #d97706; }
    .bar-poor { background: #dc2626; }
    .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading); }

    .rating-badge { font-size: var(--font-size-xs); padding: 2px 10px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .rating-excellent { background: #dcfce7; color: #16a34a; }
    .rating-good { background: #dbeafe; color: #2563eb; }
    .rating-fair { background: #fef3c7; color: #d97706; }
    .rating-poor { background: #fee2e2; color: #dc2626; }

    .model-list { display: flex; flex-direction: column; gap: 8px; }
    .scoring-model-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: border-color 0.15s; }
    .scoring-model-card:hover { border-color: var(--primary); }
    .scoring-model-card.selected { border-color: var(--primary); background: var(--surface-ice); }
    .sm-name { font-weight: 600; color: var(--text-heading); }
    .sm-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 2px; }
    .sm-meta { display: flex; gap: 12px; }
    .sm-stat { font-size: var(--font-size-sm); color: var(--text-muted); background: var(--surface-ice); padding: 2px 8px; border-radius: var(--radius-xs); }

    .score-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px; }
    .form-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input-narrow { width: 80px; }

    .criteria-section { margin-bottom: 16px; }
    .criteria-section h4 { font-size: var(--font-size-base); font-weight: 600; color: var(--text-heading); margin: 0 0 10px; }
    .criteria-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .criteria-label { font-size: var(--font-size-sm); color: var(--text-heading); min-width: 160px; font-weight: 500; }
    .criteria-max { font-size: var(--font-size-sm); color: var(--text-muted); }

    .btn-primary { padding: 10px 24px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .success-msg { margin-left: 12px; font-size: var(--font-size-sm); color: #16a34a; font-weight: 500; }

    .empty { color: var(--text-muted); text-align: center; padding: 32px; }

    @media (max-width: 768px) {
      .stat-grid { grid-template-columns: repeat(3, 1fr); }
      .form-row { flex-direction: column; }
    }
  `]
})
export class QiyasEvidenceScoringComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  metrics = signal<QiyasEvidenceQualityMetric[]>([]);
  scoringModels = signal<QiyasEvidenceScoringModel[]>([]);
  activeCriteria = signal<GrcRecord[]>([]);
  submitSuccess = signal(false);
  loading = signal(false);

  scoreForm: { evidence_id: string; scoring_model_id: string } = { evidence_id: '', scoring_model_id: '' };
  criteriaScores: number[] = [];
  selectedModelId = '';

  // Computed summary values
  totalEvidence = signal(0);
  avgScore = signal(0);
  excellentCount = signal(0);
  goodCount = signal(0);
  fairCount = signal(0);
  poorCount = signal(0);

  ngOnInit() {
    this.loadMetrics();
    this.loadScoringModels();
  }

  private loadMetrics() {
    this.loading.set(true);
    this.svc.getEvidenceQualityMetrics().subscribe({
      next: (res) => {
        this.metrics.set(res.metrics);
        this.computeSummary(res.metrics);
        this.loading.set(false);
      },
      error: () => { this.metrics.set([]); this.loading.set(false); },
    });
  }

  private loadScoringModels() {
    this.svc.getEvidenceScoringModels().subscribe({
      next: (res) => this.scoringModels.set(res.models),
      error: () => this.scoringModels.set([]),
    });
  }

  private computeSummary(metrics: QiyasEvidenceQualityMetric[]) {
    const total = metrics.reduce((s, m) => s + m.evidence_count, 0);
    const weightedAvg = total > 0
      ? metrics.reduce((s, m) => s + m.avg_score * m.evidence_count, 0) / total
      : 0;
    this.totalEvidence.set(total);
    this.avgScore.set(weightedAvg);
    this.excellentCount.set(metrics.filter(m => m.quality_rating === 'excellent').length);
    this.goodCount.set(metrics.filter(m => m.quality_rating === 'good').length);
    this.fairCount.set(metrics.filter(m => m.quality_rating === 'fair').length);
    this.poorCount.set(metrics.filter(m => m.quality_rating === 'poor').length);
  }

  selectModel(sm: QiyasEvidenceScoringModel) {
    this.selectedModelId = sm.scoring_model_id;
    this.scoreForm.scoring_model_id = sm.scoring_model_id;
    this.activeCriteria.set(sm.criteria || []);
    this.criteriaScores = (sm.criteria || []).map(() => 0);
  }

  onModelSelect(modelId: string) {
    const sm = this.scoringModels().find(m => m.scoring_model_id === modelId);
    if (sm) {
      this.selectModel(sm);
    } else {
      this.activeCriteria.set([]);
      this.criteriaScores = [];
      this.selectedModelId = '';
    }
  }

  submitScore() {
    this.submitSuccess.set(false);
    const criteria = this.activeCriteria();
    const criteriaPayload = criteria.map((c, i) => ({
      criterion_id: c.criterion_id || c.id || `c_${i}`,
      name: c.name,
      score: this.criteriaScores[i] || 0,
      max_score: c.max_score || 10,
    }));
    this.svc.scoreEvidence({
      evidence_id: this.scoreForm.evidence_id,
      scoring_model_id: this.scoreForm.scoring_model_id,
      criteria_scores: criteriaPayload,
    }).subscribe({
      next: () => {
        this.submitSuccess.set(true);
        this.scoreForm = { evidence_id: '', scoring_model_id: '' };
        this.criteriaScores = [];
        this.activeCriteria.set([]);
        this.selectedModelId = '';
        this.loadMetrics();
      },
    });
  }
}
