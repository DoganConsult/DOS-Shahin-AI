import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { QiyasAssessment, QiyasModel } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-assessments',
    imports: [CommonModule, AppDatePipe, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.assessments') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.subtitle') }}</p>
        </div>
        <button class="btn-primary" (click)="showCreate = !showCreate">+ {{ i18n.translate('qiyas.newAssessment') }}</button>
      </div>

      <!-- Create form -->
      <div class="create-form" *ngIf="showCreate">
        <div class="form-grid">
          <input [(ngModel)]="newAssessment.title_en" [placeholder]="i18n.translate('qiyas.assessmentTitle')" [attr.aria-label]="i18n.translate('qiyas.assessmentTitle')" class="input full" />
          <select [(ngModel)]="newAssessment.model_id" class="input">
            <option value="">{{ i18n.translate('qiyas.selectModel') }}</option>
            <option *ngFor="let m of models()" [value]="m.model_id">{{ m.name_en }}</option>
          </select>
          <select [(ngModel)]="newAssessment.assessment_type" class="input">
            <option value="self_assessment">{{ i18n.translate('qiyas.selfAssessment') }}</option>
            <option value="external_audit">{{ i18n.translate('qiyas.externalAudit') }}</option>
            <option value="peer_review">{{ i18n.translate('qiyas.peerReview') }}</option>
            <option value="gap_analysis">{{ i18n.translate('qiyas.gapAnalysis') }}</option>
            <option value="certification_readiness">{{ i18n.translate('qiyas.certificationReadiness') }}</option>
            <option value="benchmarking">{{ i18n.translate('qiyas.benchmarking') }}</option>
          </select>
          <button class="btn-primary" (click)="create()" [disabled]="!newAssessment.title_en || !newAssessment.model_id">{{ i18n.translate('qiyas.createAssessment') }}</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="input-sm">
          <option value="">{{ i18n.translate('qiyas.allStatuses') }}</option>
          <option value="draft">{{ i18n.translate('qiyas.draft') }}</option>
          <option value="in_progress">{{ i18n.translate('qiyas.in_progress') }}</option>
          <option value="under_review">Under Review</option>
          <option value="finalized">{{ i18n.translate('qiyas.finalized') }}</option>
        </select>
      </div>

      <!-- List -->
      <div class="assessment-list">
        <div class="empty" *ngIf="assessments().length === 0 && !loading()">{{ i18n.translate('qiyas.noData') }}</div>
        <a *ngFor="let a of assessments()"
           [routerLink]="['/qiyas/assessments', a.qiyas_assessment_id]"
           class="assessment-card">
          <div class="assessment-info">
            <div class="assessment-title">{{ a.title_en }}</div>
            <div class="assessment-model" *ngIf="a.model_name">{{ a.model_name }}</div>
          </div>
          <div class="assessment-meta">
            <span class="badge" [class]="'badge-' + a.status">{{ a.status }}</span>
            <span class="type-tag">{{ a.assessment_type }}</span>
            <span class="date">{{ a.created_at | appDate:'medium' }}</span>
          </div>
        </a>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
    .form-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input.full { flex: 1; min-width: 200px; }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .filters { display: flex; gap: 10px; margin-bottom: 16px; }
    .assessment-list { display: flex; flex-direction: column; gap: 8px; }
    .assessment-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); text-decoration: none; color: var(--text-heading); transition: border-color 0.15s; }
    .assessment-card:hover { border-color: var(--primary); }
    .assessment-title { font-weight: 600; font-size: var(--font-size-base); }
    .assessment-model { font-size: var(--font-size-sm); color: var(--text-muted); }
    .assessment-meta { display: flex; gap: 8px; align-items: center; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-draft { background: var(--surface-ice); color: var(--text-muted); }
    .badge-in_progress { background: #dbeafe; color: #1d4ed8; }
    .badge-finalized { background: #dcfce7; color: var(--success); }
    .badge-under_review { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .type-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .date { font-size: var(--font-size-sm); color: var(--text-muted); }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
  `]
})
export class QiyasAssessmentsComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);
  assessments = signal<QiyasAssessment[]>([]);
  models = signal<QiyasModel[]>([]);
  loading = signal(false);
  showCreate = false;
  filterStatus = '';
  newAssessment: Partial<QiyasAssessment> = { title_en: '', model_id: '', assessment_type: 'self_assessment' };

  ngOnInit() {
    this.load();
    this.svc.listModels({ status: 'active' }).subscribe(m => this.models.set(m));
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.filterStatus) params.status = this.filterStatus;
    this.svc.listAssessments(params).subscribe({
      next: (a) => { this.assessments.set(a); this.loading.set(false); },
      error: () => { this.assessments.set([]); this.loading.set(false); },
    });
  }

  create() {
    this.svc.createAssessment(this.newAssessment).subscribe({
      next: () => { this.showCreate = false; this.newAssessment = { title_en: '', model_id: '', assessment_type: 'self_assessment' }; this.load(); },
    });
  }

}
