import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { QiyasService } from '../../qiyas.service';
import { QiyasAssessment, QiyasScope } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

const SCOPE_TYPES: QiyasScope['scope_type'][] = ['department', 'process', 'system', 'location', 'custom'];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-scoping',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.scoping') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.scopingSubtitle') }}</p>
        </div>
      </div>

      <!-- Assessment selector -->
      <div class="selector-row">
        <label class="selector-label">Assessment</label>
        <select [(ngModel)]="selectedAssessmentId" (ngModelChange)="onAssessmentChange()" class="input" aria-label="Select assessment">
          <option value="">-- Select an assessment --</option>
          <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
        </select>
      </div>

      <ng-container *ngIf="selectedAssessmentId">
        <!-- Scope coverage grid -->
        <div class="coverage-grid">
          <div *ngFor="let t of scopeTypes" class="coverage-cell" [class.active]="countByType(t) > 0">
            <span class="coverage-count">{{ countByType(t) }}</span>
            <span class="coverage-type">{{ formatType(t) }}</span>
          </div>
        </div>

        <!-- Add scope form -->
        <div class="add-form">
          <h3 class="form-title">Add Scope</h3>
          <div class="form-row">
            <select [(ngModel)]="newScope.scope_type" class="input" aria-label="Scope type">
              <option *ngFor="let t of scopeTypes" [value]="t">{{ formatType(t) }}</option>
            </select>
            <input [(ngModel)]="newScope.scope_value" [placeholder]="i18n.translate('qiyas.scopeValue')" [attr.aria-label]="i18n.translate('qiyas.scopeValue')" class="input flex-grow" />
          </div>
          <div class="form-row">
            <textarea [(ngModel)]="newScope.description" [placeholder]="i18n.translate('qiyas.descriptionOptional')" [attr.aria-label]="i18n.translate('qiyas.description')" class="input full textarea" rows="2"></textarea>
          </div>
          <div class="form-row">
            <button class="btn-primary" (click)="addScope()" [disabled]="!newScope.scope_value">{{ i18n.translate('qiyas.addScope') }}</button>
          </div>
        </div>

        <!-- Scopes grouped by type -->
        <div class="scopes-section">
          <div class="empty" *ngIf="scopes().length === 0 && !loading()">No scopes defined for this assessment.</div>

          <ng-container *ngFor="let t of scopeTypes">
            <div class="scope-group" *ngIf="scopesByType(t).length > 0">
              <h3 class="group-title">
                <span class="group-type-badge" [class]="'group-badge-' + t">{{ formatType(t) }}</span>
                <span class="group-count">{{ scopesByType(t).length }}</span>
              </h3>
              <div class="scope-list">
                <div *ngFor="let s of scopesByType(t)" class="scope-card">
                  <div class="scope-info">
                    <div class="scope-value">{{ s.scope_value }}</div>
                    <div class="scope-desc" *ngIf="s.description">{{ s.description }}</div>
                  </div>
                  <button class="btn-remove" (click)="removeScope(s)" [attr.aria-label]="i18n.translate('qiyas.removeScope')">{{ i18n.translate('qiyas.remove') }}</button>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </ng-container>

      <div class="empty" *ngIf="!selectedAssessmentId">Select an assessment above to manage its scoping.</div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }

    /* Assessment selector */
    .selector-row { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .selector-label { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); white-space: nowrap; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input.full { width: 100%; }
    .flex-grow { flex: 1; min-width: 180px; }
    .textarea { resize: vertical; font-family: inherit; }

    /* Coverage grid */
    .coverage-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 24px; }
    .coverage-cell { display: flex; flex-direction: column; align-items: center; padding: 14px 8px; border-radius: var(--radius-md); border: 1.5px solid var(--border-subtle); background: #fff; transition: border-color 0.15s, background 0.15s; }
    .coverage-cell.active { border-color: var(--success); background: #f0fdf4; }
    .coverage-count { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-muted); }
    .coverage-cell.active .coverage-count { color: var(--success); }
    .coverage-type { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; text-transform: capitalize; }

    /* Add form */
    .add-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; margin-bottom: 24px; }
    .form-title { font-size: var(--font-size-base); font-weight: 600; margin: 0 0 12px 0; }
    .form-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px; }
    .form-row:last-child { margin-bottom: 0; }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Scopes section */
    .scopes-section { display: flex; flex-direction: column; gap: 20px; }
    .scope-group { }
    .group-title { display: flex; align-items: center; gap: 8px; margin: 0 0 8px 0; font-size: var(--font-size-base); font-weight: 600; }
    .group-type-badge { font-size: var(--font-size-xs); padding: 3px 10px; border-radius: var(--radius-xs); font-weight: 600; text-transform: capitalize; }
    .group-badge-department { background: #dbeafe; color: #1d4ed8; }
    .group-badge-process { background: #dcfce7; color: var(--success); }
    .group-badge-system { background: #ede9fe; color: #7c3aed; }
    .group-badge-location { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .group-badge-custom { background: var(--surface-ice); color: var(--text-muted); }
    .group-count { font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 400; }

    .scope-list { display: flex; flex-direction: column; gap: 6px; }
    .scope-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); transition: border-color 0.15s; }
    .scope-card:hover { border-color: var(--primary); }
    .scope-info { flex: 1; }
    .scope-value { font-weight: 500; font-size: var(--font-size-base); color: var(--text-heading); }
    .scope-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 2px; }
    .btn-remove { padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid #fca5a5; background: #fff; color: #dc2626; cursor: pointer; font-size: var(--font-size-xs); font-weight: 600; flex-shrink: 0; }
    .btn-remove:hover { background: #fee2e2; }

    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    @media (max-width: 640px) { .coverage-grid { grid-template-columns: repeat(3, 1fr); } }
  `]
})
export class QiyasScopingComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);
  private confirmService = inject(ConfirmationService);

  assessments = signal<QiyasAssessment[]>([]);
  scopes = signal<QiyasScope[]>([]);
  loading = signal(false);

  selectedAssessmentId = '';
  scopeTypes = SCOPE_TYPES;

  newScope: Partial<QiyasScope> = {
    scope_type: 'department',
    scope_value: '',
    description: '',
  };

  ngOnInit() {
    this.svc.listAssessments().subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  onAssessmentChange() {
    if (!this.selectedAssessmentId) {
      this.scopes.set([]);
      return;
    }
    this.loadScopes();
  }

  loadScopes() {
    if (!this.selectedAssessmentId) return;
    this.loading.set(true);
    this.svc.listScopes(this.selectedAssessmentId).subscribe({
      next: (res) => { this.scopes.set(res.scopes); this.loading.set(false); },
      error: () => { this.scopes.set([]); this.loading.set(false); },
    });
  }

  scopesByType(type: string): QiyasScope[] {
    return this.scopes().filter(s => s.scope_type === type);
  }

  countByType(type: string): number {
    return this.scopes().filter(s => s.scope_type === type).length;
  }

  formatType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  addScope() {
    if (!this.selectedAssessmentId || !this.newScope.scope_value) return;
    this.svc.addScope(this.selectedAssessmentId, this.newScope).subscribe({
      next: () => {
        this.newScope = { scope_type: 'department', scope_value: '', description: '' };
        this.loadScopes();
      },
    });
  }

  removeScope(scope: QiyasScope) {
    this.confirmService.confirm({
      message: this.i18n.localize(`Remove scope "${scope.scope_value}"?`, `إزالة النطاق "${scope.scope_value}"؟`),
      header: this.i18n.translate('qiyas.confirmRemove'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.svc.removeScope(scope.scope_id).subscribe({
          next: () => this.loadScopes(),
        });
      },
    });
  }
}
