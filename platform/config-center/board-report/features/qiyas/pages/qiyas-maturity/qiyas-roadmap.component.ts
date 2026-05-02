import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { QiyasAssessment, QiyasImprovementPath } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-improvement-roadmap',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.improvementRoadmap') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.roadmapSubtitle') }}</p>
        </div>
      </div>

      <!-- Assessment selector -->
      <div class="selector-row">
        <label class="selector-label">{{ i18n.translate('qiyas.selectAssessment') }}</label>
        <select [(ngModel)]="selectedAssessmentId" (ngModelChange)="onAssessmentChange($event)" class="input">
          <option value="">-- Select a finalized assessment --</option>
          <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
        </select>
      </div>

      <!-- Empty state -->
      <div class="empty" *ngIf="!selectedAssessmentId && !loading()">
        Select a finalized assessment to view its improvement roadmap.
      </div>
      <div class="empty" *ngIf="selectedAssessmentId && paths().length === 0 && !loading()">
        {{ i18n.translate('qiyas.noData') }}
      </div>

      <!-- Domain paths -->
      <div class="path-list" *ngIf="paths().length > 0">
        <div *ngFor="let p of paths()" class="path-card" [class.gap-red]="p.gap > 2" [class.gap-amber]="p.gap > 1 && p.gap <= 2" [class.gap-green]="p.gap <= 1">
          <div class="path-header">
            <div class="path-domain">{{ p.domain_name }}</div>
            <div class="path-gap-badge" [class.gap-badge-red]="p.gap > 2" [class.gap-badge-amber]="p.gap > 1 && p.gap <= 2" [class.gap-badge-green]="p.gap <= 1">
              Gap: {{ p.gap | number:'1.1-1' }}
            </div>
          </div>

          <!-- Score progress -->
          <div class="score-row">
            <span class="score-label">Current: <strong>{{ p.current_score | number:'1.1-1' }}</strong></span>
            <div class="progress-bar-container">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" [style.width.%]="(p.current_score / 5) * 100"></div>
                <div class="progress-bar-target" [style.left.%]="(p.target_score / 5) * 100"></div>
              </div>
            </div>
            <span class="score-label">Target: <strong>{{ p.target_score | number:'1.1-1' }}</strong></span>
          </div>

          <!-- Nested recommendations -->
          <div class="path-recs" *ngIf="p.recommendations?.length">
            <div class="path-rec-title">Recommendations ({{ p.recommendations.length }})</div>
            <div *ngFor="let r of p.recommendations" class="path-rec-item">
              <div class="path-rec-info">
                <span class="path-rec-name">{{ r.title_en }}</span>
                <span class="badge priority" [class]="'priority-' + r.priority">{{ r.priority }}</span>
                <span class="badge status" [class]="'status-' + r.status">{{ r.status }}</span>
              </div>
              <a routerLink="/qiyas/recommendations" class="path-rec-link">View</a>
            </div>
          </div>
          <div class="path-recs-empty" *ngIf="!p.recommendations?.length">
            No recommendations for this domain.
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-heading); margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .selector-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .selector-label { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); white-space: nowrap; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); flex: 1; max-width: 420px; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    .path-list { display: flex; flex-direction: column; gap: 16px; }
    .path-card { background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px 20px; border-left: 4px solid var(--border-subtle); }
    .path-card.gap-red { border-left-color: #c62828; }
    .path-card.gap-amber { border-left-color: #f57f17; }
    .path-card.gap-green { border-left-color: var(--success); }
    .path-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .path-domain { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); }
    .path-gap-badge { font-size: var(--font-size-xs); padding: 2px 10px; border-radius: var(--radius-xs); font-weight: 600; }
    .gap-badge-red { background: #fce4ec; color: #c62828; }
    .gap-badge-amber { background: #fff8e1; color: #f57f17; }
    .gap-badge-green { background: #dcfce7; color: var(--success); }
    .score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .score-label { font-size: var(--font-size-sm); color: var(--text-muted); white-space: nowrap; }
    .score-label strong { color: var(--text-heading); }
    .progress-bar-container { flex: 1; }
    .progress-bar-track { position: relative; height: 8px; background: var(--surface-ice); border-radius: var(--radius-xs); overflow: visible; }
    .progress-bar-fill { height: 100%; background: var(--primary); border-radius: var(--radius-xs); transition: width 0.3s ease; }
    .progress-bar-target { position: absolute; top: -3px; width: 2px; height: 14px; background: var(--success); border-radius: 1px; }
    .path-recs { margin-top: 4px; }
    .path-rec-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); margin-bottom: 8px; }
    .path-rec-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--surface-ice); border-radius: var(--radius-sm); margin-bottom: 6px; }
    .path-rec-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
    .path-rec-name { font-size: var(--font-size-sm); color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .path-rec-link { font-size: var(--font-size-sm); color: var(--primary); text-decoration: none; font-weight: 500; flex-shrink: 0; }
    .path-rec-link:hover { text-decoration: underline; }
    .path-recs-empty { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; margin-top: 4px; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .priority-critical { background: #fce4ec; color: #c62828; }
    .priority-high { background: #fff3e0; color: #e65100; }
    .priority-medium { background: #fff8e1; color: #f57f17; }
    .priority-low { background: var(--surface-ice); color: var(--text-muted); }
    .status-pending { background: #fff8e1; color: #f57f17; }
    .status-accepted { background: #dbeafe; color: #1d4ed8; }
    .status-rejected { background: #fce4ec; color: #c62828; }
    .status-in_progress { background: #e0f2f1; color: #00695c; }
    .status-completed { background: #dcfce7; color: var(--success); }
    @media (max-width: 768px) { .selector-row { flex-direction: column; align-items: stretch; } .input { max-width: 100%; } }
  `]
})
export class QiyasImprovementRoadmapComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  assessments = signal<QiyasAssessment[]>([]);
  paths = signal<QiyasImprovementPath[]>([]);
  loading = signal(false);
  selectedAssessmentId = '';

  ngOnInit() {
    this.svc.listAssessments({ status: 'finalized' }).subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  onAssessmentChange(assessmentId: string) {
    if (!assessmentId) {
      this.paths.set([]);
      return;
    }
    this.loading.set(true);
    this.svc.getImprovementPaths(assessmentId).subscribe({
      next: (res) => { this.paths.set(res.paths); this.loading.set(false); },
      error: () => { this.paths.set([]); this.loading.set(false); },
    });
  }
}
