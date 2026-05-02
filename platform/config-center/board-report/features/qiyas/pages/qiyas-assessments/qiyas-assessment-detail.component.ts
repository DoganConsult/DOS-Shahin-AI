import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { QiyasService } from '../../qiyas.service';
import { QiyasAssessment } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-assessment-detail',
    imports: [CommonModule, RouterModule],
    template: `
    <div class="page" *ngIf="assessment()">
      <a routerLink="/qiyas/assessments" class="back-link">&larr; {{ i18n.translate('qiyas.assessments') }}</a>
      <div class="header-row">
        <div>
          <h1>{{ assessment()!.title_en }}</h1>
          <div class="meta-row">
            <span class="badge" [class]="'badge-' + assessment()!.status">{{ assessment()!.status }}</span>
            <span class="type-tag">{{ assessment()!.assessment_type }}</span>
            <span class="model-name" *ngIf="assessment()!.model_name">{{ assessment()!.model_name }}</span>
          </div>
        </div>
        <div class="actions">
          <button class="btn-sm" *ngIf="assessment()!.status === 'draft'" (click)="startAssessment()">{{ i18n.translate('qiyas.start') }}</button>
          <button class="btn-sm" *ngIf="assessment()!.status === 'in_progress'" (click)="finalizeAssessment()">{{ i18n.translate('qiyas.finalize') }}</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button [class.active]="activeTab === 'responses'" (click)="activeTab = 'responses'">{{ i18n.translate('qiyas.responses') }}</button>
        <button [class.active]="activeTab === 'scores'" (click)="activeTab = 'scores'; loadScores()">{{ i18n.translate('qiyas.scores') }}</button>
        <button [class.active]="activeTab === 'benchmarks'" (click)="activeTab = 'benchmarks'; loadBenchmarks()">{{ i18n.translate('qiyas.benchmarks') }}</button>
        <button [class.active]="activeTab === 'certification'" (click)="activeTab = 'certification'; loadCertification()">{{ i18n.translate('qiyas.certification') }}</button>
      </div>

      <!-- Responses tab -->
      <div class="tab-content" *ngIf="activeTab === 'responses'">
        <div class="empty" *ngIf="responses().length === 0">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngFor="let r of responses()" class="response-card">
          <div class="response-question">Q: {{ r.question_id }}</div>
          <div class="response-answer">{{ r.answer_value | json }}</div>
          <div class="response-score" *ngIf="r.score != null">{{ i18n.translate('qiyas.scores') }}: {{ r.score }}</div>
        </div>
      </div>

      <!-- Scores tab -->
      <div class="tab-content" *ngIf="activeTab === 'scores'">
        <div class="empty" *ngIf="!scores()">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngIf="scores()">
          <h3>{{ i18n.translate('qiyas.domainScores') }}</h3>
          <div *ngFor="let s of scores()?.domainScores || []" class="score-row">
            <span>{{ s.domain_name || s.domain_id }}</span>
            <span class="score-val">{{ s.score }}</span>
          </div>
          <h3>{{ i18n.translate('qiyas.indicatorScores') }}</h3>
          <div *ngFor="let s of scores()?.indicatorScores || []" class="score-row">
            <span>{{ s.indicator_name || s.indicator_id }}</span>
            <span class="score-val">{{ s.score }}</span>
          </div>
        </div>
      </div>

      <!-- Benchmarks tab -->
      <div class="tab-content" *ngIf="activeTab === 'benchmarks'">
        <div class="empty" *ngIf="benchmarks().length === 0">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngFor="let b of benchmarks()" class="benchmark-card">
          <div>{{ b.comparison_label || b.benchmark_id }}</div>
          <div class="benchmark-val">{{ b.percentile_rank ?? b.score }}%</div>
        </div>
      </div>

      <!-- Certification tab -->
      <div class="tab-content" *ngIf="activeTab === 'certification'">
        <div class="empty" *ngIf="!certification()">{{ i18n.translate('qiyas.noData') }}</div>
        <div *ngIf="certification()">
          <div *ngFor="let r of certification()?.readiness || []" class="cert-card">
            <div class="cert-framework">{{ r.framework_name || r.framework_code }}</div>
            <div class="cert-score">{{ i18n.translate('qiyas.readiness') }}: {{ r.readiness_score }}%</div>
          </div>
          <h3 *ngIf="certification()?.gaps?.length">{{ i18n.translate('qiyas.gaps') }}</h3>
          <div *ngFor="let g of certification()?.gaps || []" class="gap-card">
            <div>{{ g.gap_description }}</div>
            <span class="badge badge-gap">{{ g.priority }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 860px; margin: 0 auto; padding: 32px 24px; }
    .back-link { font-size: var(--font-size-sm); color: var(--text-muted); text-decoration: none; }
    .back-link:hover { color: var(--primary); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; margin-bottom: 24px; }
    h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .meta-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-draft { background: var(--surface-ice); color: var(--text-muted); }
    .badge-in_progress { background: #dbeafe; color: #1d4ed8; }
    .badge-finalized { background: #dcfce7; color: var(--success); }
    .badge-under_review { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .badge-gap { background: #fee2e2; color: var(--error); }
    .type-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .model-name { font-size: var(--font-size-sm); color: var(--text-muted); }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: var(--font-size-sm); }
    .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-subtle); margin-bottom: 20px; }
    .tabs button { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: var(--font-size-base); font-weight: 500; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .tabs button.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-content { min-height: 200px; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    .response-card { padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); margin-bottom: 8px; }
    .response-question { font-weight: 500; font-size: var(--font-size-sm); color: #475569; }
    .response-answer { font-size: var(--font-size-base); margin-top: 4px; }
    .response-score { font-size: var(--font-size-sm); color: var(--primary); margin-top: 4px; }
    .score-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--surface-ice); }
    .score-val { font-weight: 600; color: var(--text-heading); }
    h3 { font-size: var(--font-size-base); font-weight: 600; margin: 20px 0 8px; }
    .benchmark-card { display: flex; justify-content: space-between; padding: 10px 14px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); margin-bottom: 6px; }
    .benchmark-val { font-weight: 600; color: var(--primary); }
    .cert-card { display: flex; justify-content: space-between; padding: 10px 14px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); margin-bottom: 6px; }
    .cert-framework { font-weight: 500; }
    .cert-score { font-weight: 600; color: var(--success); }
    .gap-card { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--status-danger-bg, #fff1f1); border-radius: var(--radius-sm); margin-bottom: 6px; font-size: var(--font-size-sm); }
  `]
})
export class QiyasAssessmentDetailComponent implements OnInit {
  private svc = inject(QiyasService);
  private route = inject(ActivatedRoute);
  public i18n = inject(I18nService);

  assessment = signal<QiyasAssessment | null>(null);
  responses = signal<GrcRecord[]>([]);
  scores = signal<GrcRecord | null>(null);
  benchmarks = signal<GrcRecord[]>([]);
  certification = signal<GrcRecord | null>(null);
  activeTab = 'responses';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getAssessment(id).subscribe(a => this.assessment.set(a));
    this.svc.listResponses(id).subscribe(r => this.responses.set(r));
  }

  loadScores() {
    const id = this.assessment()?.qiyas_assessment_id;
    if (!id || this.scores()) return;
    this.svc.getScores(id).subscribe(s => this.scores.set(s));
  }

  loadBenchmarks() {
    const id = this.assessment()?.qiyas_assessment_id;
    if (!id || this.benchmarks().length) return;
    this.svc.getBenchmarks(id).subscribe(b => this.benchmarks.set(b));
  }

  loadCertification() {
    const id = this.assessment()?.qiyas_assessment_id;
    if (!id || this.certification()) return;
    this.svc.getCertification(id).subscribe(c => this.certification.set(c));
  }

  startAssessment() {
    const id = this.assessment()?.qiyas_assessment_id;
    if (!id) return;
    this.svc.updateAssessment(id, { status: 'in_progress' }).subscribe(a => this.assessment.set(a));
  }

  finalizeAssessment() {
    const id = this.assessment()?.qiyas_assessment_id;
    if (!id) return;
    this.svc.updateAssessment(id, { status: 'finalized' }).subscribe(a => this.assessment.set(a));
  }

}
