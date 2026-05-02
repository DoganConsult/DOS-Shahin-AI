import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasAssessment, QiyasHeatmapCell, QiyasTargetProfile } from '../../qiyas.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-maturity-heatmap',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.maturityHeatmap') }}</h1>
          <p class="subtitle">Maturity heatmap visualization across domains and indicators</p>
        </div>
        <a routerLink="/qiyas" class="back-link">&larr; {{ i18n.translate('qiyas.title') }}</a>
      </div>

      <!-- Assessment selector -->
      <div class="selector-row">
        <label>Assessment</label>
        <select [(ngModel)]="selectedAssessmentId" (ngModelChange)="onAssessmentChange($event)" class="input">
          <option value="">Select a finalized assessment</option>
          <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
        </select>
      </div>

      <!-- Legend -->
      <div class="legend">
        <span class="legend-title">Maturity Levels:</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#dc2626;"></span> Level 1 - Initial</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#ea580c;"></span> Level 2 - Managed</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#ca8a04;"></span> Level 3 - Defined</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#65a30d;"></span> Level 4 - Quantitatively Managed</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#16a34a;"></span> Level 5 - Optimizing</span>
      </div>

      <!-- Heatmap grid -->
      <div class="heatmap-section" *ngIf="cells().length; else noData">
        <div class="heatmap-grid">
          <div *ngFor="let cell of cells()" class="heatmap-cell"
               [style.background-color]="cell.color">
            <div class="cell-name">{{ cell.indicator_name || cell.domain_name }}</div>
            <div class="cell-score">{{ cell.score | number:'1.1-1' }}</div>
            <div class="cell-level">{{ cell.maturity_level }}</div>
            <!-- Target comparison -->
            <div class="cell-target" *ngIf="getTarget(cell) as target">
              <span *ngIf="cell.score > target.target_score" class="arrow-up" title="Above target">&#9650; +{{ (cell.score - target.target_score) | number:'1.1-1' }}</span>
              <span *ngIf="cell.score < target.target_score" class="arrow-down" title="Below target">&#9660; {{ (cell.score - target.target_score) | number:'1.1-1' }}</span>
              <span *ngIf="cell.score === target.target_score" class="arrow-same" title="At target">&#9644; On target</span>
            </div>
          </div>
        </div>
      </div>
      <ng-template #noData>
        <div class="empty" *ngIf="selectedAssessmentId">{{ i18n.translate('qiyas.noData') }}</div>
        <div class="empty" *ngIf="!selectedAssessmentId">Select an assessment to view the maturity heatmap.</div>
      </ng-template>

      <!-- Target Profiles -->
      <div class="section" *ngIf="targets().length">
        <h3>Target Profiles</h3>
        <div class="target-list">
          <div *ngFor="let t of targets()" class="target-card">
            <div class="target-domain">{{ t.domain_name || t.domain_id }}</div>
            <div class="target-meta">
              <span class="target-score">Target: {{ t.target_score | number:'1.1-1' }}</span>
              <span class="target-level">{{ t.target_level }}</span>
              <span class="target-deadline" *ngIf="t.deadline">by {{ t.deadline | date:'mediumDate' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; color: var(--text-heading); }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .back-link { font-size: var(--font-size-sm); color: var(--text-muted); text-decoration: none; white-space: nowrap; }
    .back-link:hover { color: var(--primary); }

    .selector-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .selector-row label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); min-width: 300px; }

    .legend { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .legend-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading); }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-xs); color: var(--text-muted); }
    .legend-swatch { width: 14px; height: 14px; border-radius: 3px; display: inline-block; }

    .heatmap-section { margin-bottom: 32px; }
    .heatmap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
    .heatmap-cell { padding: 16px 14px; border-radius: var(--radius-md); color: #fff; text-align: center; min-height: 110px; display: flex; flex-direction: column; justify-content: center; gap: 4px; transition: transform 0.15s; }
    .heatmap-cell:hover { transform: scale(1.03); }
    .cell-name { font-weight: 600; font-size: var(--font-size-sm); text-shadow: 0 1px 2px rgba(var(--color-black-rgb), 0.25); }
    .cell-score { font-size: var(--font-size-2xl); font-weight: 700; }
    .cell-level { font-size: var(--font-size-xs); text-transform: uppercase; font-weight: 500; opacity: 0.9; }
    .cell-target { font-size: var(--font-size-xs); margin-top: 4px; font-weight: 600; }
    .arrow-up { color: #bbf7d0; }
    .arrow-down { color: #fecaca; }
    .arrow-same { color: #fef9c3; }

    .section { margin-bottom: 32px; }
    .section h3 { font-size: var(--font-size-lg); font-weight: 600; color: var(--text-heading); margin: 0 0 14px; }
    .target-list { display: flex; flex-direction: column; gap: 8px; }
    .target-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .target-domain { font-weight: 500; color: var(--text-heading); }
    .target-meta { display: flex; gap: 12px; align-items: center; }
    .target-score { font-size: var(--font-size-sm); font-weight: 600; color: var(--primary); }
    .target-level { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); background: var(--surface-ice); color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
    .target-deadline { font-size: var(--font-size-sm); color: var(--text-muted); }

    .empty { color: var(--text-muted); text-align: center; padding: 40px; background: var(--surface-ice); border-radius: var(--radius-md); }

    @media (max-width: 768px) {
      .heatmap-grid { grid-template-columns: repeat(2, 1fr); }
      .legend { flex-direction: column; align-items: flex-start; }
      .selector-row { flex-direction: column; align-items: flex-start; }
      .input { min-width: 100%; }
    }
  `]
})
export class QiyasMaturityHeatmapComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  assessments = signal<QiyasAssessment[]>([]);
  cells = signal<QiyasHeatmapCell[]>([]);
  targets = signal<QiyasTargetProfile[]>([]);
  loading = signal(false);

  selectedAssessmentId = '';
  private targetMap = new Map<string, QiyasTargetProfile>();

  ngOnInit() {
    this.svc.listAssessments({ status: 'finalized' }).subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
    this.svc.getTargetProfiles().subscribe({
      next: (res) => {
        this.targets.set(res.profiles);
        this.targetMap.clear();
        for (const t of res.profiles) {
          this.targetMap.set(t.domain_id, t);
        }
      },
      error: () => this.targets.set([]),
    });
  }

  onAssessmentChange(assessmentId: string) {
    if (!assessmentId) {
      this.cells.set([]);
      return;
    }
    this.loading.set(true);
    this.svc.getMaturityHeatmap(assessmentId).subscribe({
      next: (res) => { this.cells.set(res.cells); this.loading.set(false); },
      error: () => { this.cells.set([]); this.loading.set(false); },
    });
  }

  getTarget(cell: QiyasHeatmapCell): QiyasTargetProfile | null {
    return this.targetMap.get(cell.domain_id) || null;
  }
}
