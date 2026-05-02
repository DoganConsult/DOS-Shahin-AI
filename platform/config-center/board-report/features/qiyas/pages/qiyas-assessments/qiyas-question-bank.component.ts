import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { QiyasService } from '../../qiyas.service';
import { QiyasQuestion, QiyasQuestionGroup, QiyasDomain } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '../../../core/utils/dev-logger';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-question-bank',
    imports: [CommonModule, RouterModule, FormsModule, ToastModule],
    providers: [MessageService],
    template: `
      <p-toast />
      <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.questionBank') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.questionBankSubtitle') }}</p>
        </div>
        <button class="btn-primary" (click)="showCreate = !showCreate">+ {{ i18n.translate('qiyas.newQuestion') }}</button>
      </div>

      <!-- Summary strip -->
      <div class="summary-strip">
        <div class="summary-item">
          <span class="summary-value">{{ questions().length }}</span>
          <span class="summary-label">Total</span>
        </div>
        <div class="summary-item">
          <span class="summary-value type-scale">{{ countByType('scale') }}</span>
          <span class="summary-label">Scale</span>
        </div>
        <div class="summary-item">
          <span class="summary-value type-yes_no">{{ countByType('yes_no') }}</span>
          <span class="summary-label">Yes/No</span>
        </div>
        <div class="summary-item">
          <span class="summary-value type-text">{{ countByType('text') }}</span>
          <span class="summary-label">Text</span>
        </div>
        <div class="summary-item">
          <span class="summary-value type-multi_choice">{{ countByType('multi_choice') }}</span>
          <span class="summary-label">Multi-Choice</span>
        </div>
      </div>

      <!-- Create / Edit form -->
      <div class="create-form" *ngIf="showCreate || editingQuestion()">
        <h3 class="form-title">{{ editingQuestion() ? 'Edit Question' : 'Create Question' }}</h3>
        <div class="form-grid">
          <div class="form-row">
            <input [(ngModel)]="formData.question_text_en" placeholder="Question text (EN)" aria-label="Question text (EN)" class="input full" />
          </div>
          <div class="form-row">
            <input [(ngModel)]="formData.question_text_ar" placeholder="Question text (AR)" aria-label="Question text (AR)" class="input full" dir="rtl" />
          </div>
          <div class="form-row">
            <select [(ngModel)]="formData.question_type" class="input" aria-label="Question type">
              <option value="scale">Scale</option>
              <option value="yes_no">Yes / No</option>
              <option value="text">Text</option>
              <option value="multi_choice">Multi-Choice</option>
            </select>
            <input [(ngModel)]="formData.weight" type="number" min="0" max="10" step="0.5" placeholder="Weight (0-10)" aria-label="Weight" class="input input-narrow" />
            <input [(ngModel)]="formData.sort_order" type="number" min="0" placeholder="Sort order" aria-label="Sort order" class="input input-narrow" />
            <label class="toggle-label">
              <input type="checkbox" [(ngModel)]="formData.is_required" />
              Required
            </label>
          </div>
          <div class="form-row" *ngIf="formData.question_type === 'multi_choice'">
            <input [(ngModel)]="optionsText" placeholder="Options (comma-separated)" aria-label="Options" class="input full" />
          </div>
          <div class="form-actions">
            <button class="btn-primary" (click)="saveQuestion()" [disabled]="!formData.question_text_en">
              {{ editingQuestion() ? 'Update' : 'Create' }}
            </button>
            <button class="btn-cancel" (click)="cancelEdit()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="filterDomainId" (ngModelChange)="load()" class="input-sm" aria-label="Filter by domain">
          <option value="">All Domains</option>
          <option *ngFor="let d of domains()" [value]="d.domain_id">{{ d.name_en }}</option>
        </select>
        <select [(ngModel)]="filterGroupId" (ngModelChange)="load()" class="input-sm" aria-label="Filter by group">
          <option value="">All Groups</option>
          <option *ngFor="let g of groups()" [value]="g.group_id">{{ g.name_en }}</option>
        </select>
      </div>

      <!-- Question list -->
      <div class="question-list">
        <div class="empty" *ngIf="questions().length === 0 && !loading()">No questions found. Create one to get started.</div>
        <div *ngFor="let q of questions(); trackBy: trackQuestion" class="question-card" (click)="startEdit(q)">
          <div class="question-top">
            <div class="question-text">{{ q.question_text_en }}</div>
            <div class="question-badges">
              <span class="type-badge" [class]="'type-badge-' + q.question_type">{{ formatType(q.question_type) }}</span>
              <span class="required-badge" *ngIf="q.is_required">Required</span>
            </div>
          </div>
          <div class="question-bottom">
            <span class="question-meta">Weight: <strong>{{ q.weight }}</strong></span>
            <span class="question-meta">Order: <strong>{{ q.sort_order }}</strong></span>
            <span class="question-meta text-ar" *ngIf="q.question_text_ar">{{ q.question_text_ar }}</span>
            <button class="btn-delete" (click)="deleteQuestion(q, $event)">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { padding: 10px 20px; border-radius: var(--radius); border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: var(--font-size-base); color: var(--text-muted); }

    /* Summary strip */
    .summary-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .summary-item { display: flex; flex-direction: column; align-items: center; padding: 10px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); min-width: 80px; }
    .summary-value { font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading); }
    .summary-value.type-scale { color: var(--primary); }
    .summary-value.type-yes_no { color: var(--success); }
    .summary-value.type-text { color: var(--warning); }
    .summary-value.type-multi_choice { color: #7c3aed; }
    .summary-label { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; }

    /* Create form */
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px; margin-bottom: 20px; }
    .form-title { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 12px 0; }
    .form-grid { display: flex; flex-direction: column; gap: 10px; }
    .form-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .form-actions { display: flex; gap: 8px; margin-top: 4px; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input.full { flex: 1; min-width: 200px; }
    .input-narrow { width: 110px; }
    .toggle-label { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--text-heading); cursor: pointer; white-space: nowrap; }
    .toggle-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }

    /* Filters */
    .filters { display: flex; gap: 10px; margin-bottom: 16px; }

    /* Question list */
    .question-list { display: flex; flex-direction: column; gap: 8px; }
    .question-card { padding: 14px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer; transition: border-color 0.15s; }
    .question-card:hover { border-color: var(--primary); }
    .question-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .question-text { font-weight: 500; font-size: var(--font-size-base); color: var(--text-heading); flex: 1; }
    .question-badges { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .type-badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .type-badge-scale { background: #dbeafe; color: var(--primary); }
    .type-badge-yes_no { background: #dcfce7; color: var(--success); }
    .type-badge-text { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .type-badge-multi_choice { background: #ede9fe; color: #7c3aed; }
    .required-badge { font-size: var(--font-size-xs); padding: 2px 6px; border-radius: var(--radius-xs); font-weight: 600; background: #fee2e2; color: #dc2626; }
    .question-bottom { display: flex; gap: 16px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
    .question-meta { font-size: var(--font-size-sm); color: var(--text-muted); }
    .question-meta strong { color: var(--text-heading); }
    .text-ar { direction: rtl; font-size: var(--font-size-sm); color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-delete { margin-left: auto; padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid #fca5a5; background: #fff; color: #dc2626; cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; }
    .btn-delete:hover { background: #fee2e2; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
  `]
})
export class QiyasQuestionBankComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);
  private confirmService = inject(ConfirmationService);
  private msg = inject(MessageService);

  questions = signal<QiyasQuestion[]>([]);
  groups = signal<QiyasQuestionGroup[]>([]);
  domains = signal<QiyasDomain[]>([]);
  loading = signal(false);
  editingQuestion = signal<QiyasQuestion | null>(null);

  showCreate = false;
  filterDomainId = '';
  filterGroupId = '';
  optionsText = '';

  formData: Partial<QiyasQuestion> & { is_required: boolean } = {
    question_text_en: '',
    question_text_ar: '',
    question_type: 'scale',
    weight: 1,
    sort_order: 0,
    is_required: false,
  };

  ngOnInit() {
    this.load();
    this.svc.listQuestionGroups().subscribe({
      next: (res) => this.groups.set(res.groups),
      error: (err) => {
        devError('[Qiyas] Failed to load question groups', err);
        this.groups.set([]);
      },
    });
    // Load domains from any available model for filtering
    this.svc.listModels({ status: 'active' }).subscribe({
      next: (models) => {
        if (models.length > 0) {
          this.svc.listDomains(models[0].model_id).subscribe({
            next: (d) => this.domains.set(d),
            error: (err) => {
              devError('[Qiyas] Failed to load domains', err);
              this.domains.set([]);
            },
          });
        }
      },
      error: (err) => {
        devError('[Qiyas] Failed to load models for domain filtering', err);
      },
    });
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.filterDomainId) params.domainId = this.filterDomainId;
    if (this.filterGroupId) params.groupId = this.filterGroupId;
    this.svc.listQuestions(params).subscribe({
      next: (res) => { this.questions.set(res.questions); this.loading.set(false); },
      error: (err) => {
        devError('[Qiyas] Failed to load questions', err);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('qiyas.failedToLoadQuestions') || 'Failed to load questions', life: 4000 });
        this.questions.set([]);
        this.loading.set(false);
      },
    });
  }

  countByType(type: string): number {
    return this.questions().filter(q => q.question_type === type).length;
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  startEdit(q: QiyasQuestion) {
    this.editingQuestion.set(q);
    this.showCreate = false;
    this.formData = {
      question_text_en: q.question_text_en,
      question_text_ar: q.question_text_ar || '',
      question_type: q.question_type,
      weight: q.weight,
      sort_order: q.sort_order,
      is_required: q.is_required,
    };
    this.optionsText = q.options ? q.options.join(', ') : '';
  }

  cancelEdit() {
    this.editingQuestion.set(null);
    this.showCreate = false;
    this.resetForm();
  }

  saveQuestion() {
    const data: Record<string, unknown> = { ...this.formData };
    if (data.question_type === 'multi_choice' && this.optionsText) {
      data.options = this.optionsText.split(',').map((o: string) => o.trim()).filter((o: string) => o);
    }

    const editing = this.editingQuestion();
    if (editing) {
      this.svc.updateQuestion(editing.question_id, data).subscribe({
        next: () => { this.cancelEdit(); this.load(); },
      });
    } else {
      this.svc.createQuestion(data).subscribe({
        next: () => { this.showCreate = false; this.resetForm(); this.load(); },
      });
    }
  }

  deleteQuestion(q: QiyasQuestion, event: Event) {
    event.stopPropagation();
    this.confirmService.confirm({
      message: this.i18n.localize(`Delete question "${q.question_text_en}"?`, `حذف السؤال "${q.question_text_en}"؟`),
      header: this.i18n.translate('qiyas.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.deleteQuestion(q.question_id).subscribe({
          next: () => this.load(),
        });
      },
    });
  }

  trackQuestion(_index: number, q: QiyasQuestion): string {
    return q.question_id;
  }

  private resetForm() {
    this.formData = {
      question_text_en: '',
      question_text_ar: '',
      question_type: 'scale',
      weight: 1,
      sort_order: 0,
      is_required: false,
    };
    this.optionsText = '';
  }
}
