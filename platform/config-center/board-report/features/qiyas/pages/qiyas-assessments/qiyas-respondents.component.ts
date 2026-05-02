import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasAssessment, QiyasRespondent, QiyasRespondentProgress } from '../../qiyas.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-respondents',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>Respondent Management</h1>
          <p class="subtitle">Manage assessment respondents, track progress, and assign roles</p>
        </div>
      </div>

      <!-- Assessment selector -->
      <div class="selector-row">
        <select [(ngModel)]="selectedAssessmentId" (ngModelChange)="onAssessmentChange()" class="input" aria-label="Select assessment">
          <option value="">Select an assessment</option>
          <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
        </select>
      </div>

      <div class="empty" *ngIf="!selectedAssessmentId && !loading()">Select an assessment to manage respondents</div>
      <div class="loading-msg" *ngIf="loading()">Loading respondent data...</div>

      <!-- Progress summary cards -->
      <div class="progress-summary" *ngIf="progress() && !loading()">
        <div class="stat-card">
          <div class="stat-value">{{ progress()!.total }}</div>
          <div class="stat-label">Total Respondents</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{ progress()!.completed }}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ progress()!.in_progress }}</div>
          <div class="stat-label">In Progress</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ progress()!.not_started }}</div>
          <div class="stat-label">Not Started</div>
        </div>
        <div class="stat-card completion">
          <div class="stat-value">{{ progress()!.completion_rate | number:'1.0-0' }}%</div>
          <div class="stat-label">Completion Rate</div>
          <div class="completion-bar-track">
            <div class="completion-bar-fill" [style.width.%]="progress()!.completion_rate"></div>
          </div>
        </div>
      </div>

      <!-- Assign respondent form -->
      <div class="assign-section" *ngIf="selectedAssessmentId && !loading()">
        <div class="section-header">
          <h3>Assign Respondent</h3>
          <button class="btn-primary btn-sm" (click)="showAssignForm = !showAssignForm">+ Assign</button>
        </div>

        <div class="create-form" *ngIf="showAssignForm">
          <div class="form-grid">
            <input [(ngModel)]="newRespondent.user_id" placeholder="User ID" aria-label="User ID" class="input" />
            <select [(ngModel)]="newRespondent.role" class="input" aria-label="Role">
              <option value="assessor">Assessor</option>
              <option value="reviewer">Reviewer</option>
              <option value="subject_matter_expert">Subject Matter Expert</option>
            </select>
            <input [(ngModel)]="domainIdsInput" [placeholder]="i18n.translate('qiyas.domainIdsCommaSeparated')" [attr.aria-label]="i18n.translate('qiyas.domainIds')" class="input full" />
          </div>
          <div class="form-actions">
            <button class="btn-primary" (click)="assignRespondent()" [disabled]="!newRespondent.user_id">{{ i18n.translate('qiyas.assign') }}</button>
            <button class="btn-secondary" (click)="showAssignForm = false">{{ i18n.translate('qiyas.cancel') }}</button>
          </div>
        </div>
      </div>

      <!-- Respondent table -->
      <div class="respondent-section" *ngIf="respondents().length > 0 && !loading()">
        <h3>{{ i18n.translate('qiyas.respondents') }}</h3>
        <div class="respondent-table">
          <div class="table-header">
            <span class="col-name">{{ i18n.translate('qiyas.name') }}</span>
            <span class="col-email">{{ i18n.translate('qiyas.email') }}</span>
            <span class="col-role">{{ i18n.translate('qiyas.role') }}</span>
            <span class="col-domains">{{ i18n.translate('qiyas.domains') }}</span>
            <span class="col-status">{{ i18n.translate('qiyas.status') }}</span>
            <span class="col-dates">{{ i18n.translate('qiyas.assigned') }}</span>
            <span class="col-dates">{{ i18n.translate('qiyas.completed') }}</span>
            <span class="col-actions">{{ i18n.translate('qiyas.actions') }}</span>
          </div>
          <div *ngFor="let r of respondents()" class="table-row">
            <span class="col-name">{{ r.user_name || r.user_id }}</span>
            <span class="col-email">{{ r.user_email || '-' }}</span>
            <span class="col-role">
              <span class="role-tag">{{ r.role }}</span>
            </span>
            <span class="col-domains">
              <span class="domain-tag" *ngFor="let d of r.domain_ids || []">{{ d }}</span>
              <span *ngIf="!r.domain_ids || r.domain_ids.length === 0" class="no-domains">All</span>
            </span>
            <span class="col-status">
              <span class="badge" [class]="'badge-' + r.status">{{ r.status }}</span>
            </span>
            <span class="col-dates">{{ r.assigned_at | date:'mediumDate' }}</span>
            <span class="col-dates">{{ r.completed_at ? (r.completed_at | date:'mediumDate') : '-' }}</span>
            <span class="col-actions">
              <button class="btn-remove" (click)="removeRespondent(r.respondent_id)" [title]="i18n.translate('qiyas.removeRespondent')">{{ i18n.translate('qiyas.remove') }}</button>
            </span>
          </div>
        </div>
      </div>

      <div class="empty" *ngIf="respondents().length === 0 && selectedAssessmentId && !loading()">No respondents assigned yet</div>
    </div>
  `,
    styles: [`
    .page { max-width: 1040px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .selector-row { margin-bottom: 24px; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input.full { flex: 1; min-width: 200px; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    .loading-msg { color: var(--primary); text-align: center; padding: 24px; font-weight: 500; }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary.btn-sm { padding: 6px 14px; font-size: var(--font-size-sm); }
    .btn-secondary { padding: 10px 20px; border-radius: var(--radius); border: 1px solid #cbd5e1; background: #fff; color: var(--text-heading); cursor: pointer; font-size: var(--font-size-base); }
    .btn-remove { padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid #fca5a5; background: #fff; color: #dc2626; cursor: pointer; font-size: var(--font-size-xs); font-weight: 500; }
    .btn-remove:hover { background: #fee2e2; }

    /* Progress summary */
    .progress-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: #fff; border: 1.5px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 16px; text-align: center; }
    .stat-card.accent { border-color: var(--primary); }
    .stat-card.success { border-color: var(--success); }
    .stat-card.completion { border-color: var(--primary); }
    .stat-value { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading); }
    .stat-label { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .completion-bar-track { height: 6px; background: var(--border-subtle); border-radius: 3px; overflow: hidden; margin-top: 10px; }
    .completion-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.3s ease; }

    /* Assign section */
    .assign-section { margin-bottom: 24px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-header h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0; }
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; }
    .form-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .form-actions { display: flex; gap: 10px; margin-top: 12px; }

    /* Respondent table */
    .respondent-section { margin-bottom: 24px; }
    .respondent-section h3 { font-size: var(--font-size-md); font-weight: 600; margin-bottom: 12px; }
    .respondent-table { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; overflow-x: auto; }
    .table-header { display: flex; align-items: center; padding: 10px 16px; background: var(--surface-ice); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); min-width: 900px; }
    .table-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); background: #fff; min-width: 900px; }
    .table-row:last-child { border-bottom: none; }
    .table-row:hover { background: var(--surface-ice); }
    .col-name { flex: 2; font-weight: 500; color: var(--text-heading); }
    .col-email { flex: 2; font-size: var(--font-size-sm); color: var(--text-muted); }
    .col-role { flex: 1.5; }
    .col-domains { flex: 2; display: flex; flex-wrap: wrap; gap: 4px; }
    .col-status { flex: 1; }
    .col-dates { flex: 1.2; font-size: var(--font-size-sm); color: var(--text-muted); }
    .col-actions { flex: 1; text-align: center; }
    .role-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .domain-tag { font-size: var(--font-size-xs); color: var(--primary); background: #dbeafe; padding: 2px 6px; border-radius: var(--radius-xs); font-family: monospace; }
    .no-domains { font-size: var(--font-size-xs); color: var(--text-muted); }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-assigned { background: var(--surface-ice); color: var(--text-muted); }
    .badge-in_progress { background: #dbeafe; color: #1d4ed8; }
    .badge-completed { background: #dcfce7; color: var(--success); }

    @media (max-width: 768px) {
      .progress-summary { grid-template-columns: repeat(2, 1fr); }
      .progress-summary .stat-card.completion { grid-column: span 2; }
    }
  `]
})
export class QiyasRespondentsComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  assessments = signal<QiyasAssessment[]>([]);
  respondents = signal<QiyasRespondent[]>([]);
  progress = signal<QiyasRespondentProgress | null>(null);
  loading = signal(false);

  selectedAssessmentId = '';
  showAssignForm = false;
  newRespondent: Partial<QiyasRespondent> = { user_id: '', role: 'assessor' };
  domainIdsInput = '';

  ngOnInit() {
    this.svc.listAssessments().subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  onAssessmentChange() {
    if (!this.selectedAssessmentId) {
      this.respondents.set([]);
      this.progress.set(null);
      return;
    }
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.svc.getRespondentProgress(this.selectedAssessmentId).subscribe({
      next: (p) => {
        this.progress.set(p);
        this.respondents.set(p.respondents || []);
        this.loading.set(false);
      },
      error: () => {
        this.progress.set(null);
        // Fallback: load respondents directly
        this.svc.listRespondents(this.selectedAssessmentId).subscribe({
          next: (res) => { this.respondents.set(res.respondents); this.loading.set(false); },
          error: () => { this.respondents.set([]); this.loading.set(false); },
        });
      },
    });
  }

  assignRespondent() {
    if (!this.selectedAssessmentId || !this.newRespondent.user_id) return;
    const domainIds = this.domainIdsInput
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    const payload: Partial<QiyasRespondent> = {
      ...this.newRespondent,
      domain_ids: domainIds.length > 0 ? domainIds : undefined,
    };
    this.svc.assignRespondent(this.selectedAssessmentId, payload).subscribe({
      next: () => {
        this.showAssignForm = false;
        this.newRespondent = { user_id: '', role: 'assessor' };
        this.domainIdsInput = '';
        this.loadData();
      },
    });
  }

  removeRespondent(respondentId: string) {
    this.svc.removeRespondent(respondentId).subscribe({
      next: () => this.loadData(),
    });
  }
}
