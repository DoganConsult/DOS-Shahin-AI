import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

interface WeightEntry {
  domain: string;
  value: number;
}

interface ScoringPolicy {
  policy_id: string;
  name: string;
  weights: Record<string, number>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-scoring-policy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TagModule,
    TooltipModule,
    DropdownModule,
    AppDatePipe,
  ],
  template: `
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ i18n.translate('scoringPolicy.title') || 'Scoring Policies' }}</h1>
        <span class="policy-count" *ngIf="policies().length">
          {{ policies().length }} {{ policies().length === 1 ? 'policy' : 'policies' }}
        </span>
      </div>
      <p-button
        [label]="i18n.translate('scoringPolicy.newPolicy')"
        icon="pi pi-plus"
        (onClick)="openCreateDialog()"
        [pTooltip]="i18n.translate('scoringPolicy.createTooltip')"
      />
    </div>

    <!-- Loading State -->
    <div class="loading-state" *ngIf="loading()">
      <i class="pi pi-spin pi-spinner loading-icon"></i>
      <p>Loading scoring policies...</p>
    </div>

    <!-- Empty State -->
    <div class="empty-state" *ngIf="!loading() && policies().length === 0">
      <i class="pi pi-sliders-h empty-icon"></i>
      <p>No scoring policies found.</p>
      <p-button
        [label]="i18n.translate('scoringPolicy.createFirst')"
        icon="pi pi-plus"
        [outlined]="true"
        (onClick)="openCreateDialog()"
      />
    </div>

    <!-- Policies Table -->
    <p-table
      *ngIf="!loading() && policies().length > 0"
      [value]="policies()"
      [paginator]="policies().length > 10"
      [rows]="10"
      styleClass="p-datatable-striped p-datatable-gridlines"
      [attr.aria-label]="i18n.translate('scoringPolicy.tableLabel')"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Weight Domains</th>
          <th>Weight Total</th>
          <th>Created</th>
          <th>Updated</th>
          <th style="width: 160px">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-policy>
        <tr>
          <td><strong>{{ policy.name }}</strong></td>
          <td>
            <p-tag
              *ngIf="policy.is_default"
              value="Default"
              severity="success"
              [rounded]="true"
            />
            <span *ngIf="!policy.is_default" class="text-muted">--</span>
          </td>
          <td>{{ getWeightCount(policy) }} domains</td>
          <td>
            <span
              [class.weight-valid]="isWeightSumValid(policy)"
              [class.weight-invalid]="!isWeightSumValid(policy)"
            >
              {{ getWeightSum(policy) | number:'1.2-2' }}
            </span>
          </td>
          <td>{{ policy.created_at | appDate:'short' }}</td>
          <td>{{ policy.updated_at | appDate:'short' }}</td>
          <td>
            <div class="action-btns">
              <button
                class="icon-btn edit-btn"
                (click)="openEditDialog(policy)"
                pTooltip="Edit"
                aria-label="Edit policy"
              >
                <i class="pi pi-pencil"></i>
              </button>
              <button
                class="icon-btn apply-btn"
                (click)="openApplyDialog(policy)"
                pTooltip="Apply to Assessment"
                aria-label="Apply to assessment"
              >
                <i class="pi pi-play"></i>
              </button>
              <button
                class="icon-btn delete-btn"
                (click)="openDeleteDialog(policy)"
                pTooltip="Delete"
                aria-label="Delete policy"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7" class="empty-msg">No scoring policies found.</td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Create / Edit Dialog -->
    <p-dialog
      [header]="editingPolicy() ? i18n.translate('scoringPolicy.editPolicy') : i18n.translate('scoringPolicy.newPolicyDialog')"
      [(visible)]="showFormDialog"
      [modal]="true"
      [style]="{ width: '620px' }"
      [closable]="true"
      (onHide)="resetForm()"
    >
      <div class="dialog-form">
        <!-- Name -->
        <div class="field">
          <label for="policyName">{{ i18n.translate('scoringPolicy.policyName') }}</label>
          <input
            id="policyName"
            pInputText
            [(ngModel)]="formName"
            [placeholder]="i18n.translate('scoringPolicy.namePlaceholder')"
            class="w-full"
          />
        </div>

        <!-- Default Toggle -->
        <div class="field-row-inline">
          <label class="checkbox-label">
            <input type="checkbox" [(ngModel)]="formIsDefault" />
            Set as default policy
          </label>
        </div>

        <!-- Weights Section -->
        <div class="weights-section">
          <div class="weights-header">
            <label class="section-label">Weight Domains</label>
            <p-button
              [label]="i18n.translate('scoringPolicy.addDomain')"
              icon="pi pi-plus"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="addWeightRow()"
            />
          </div>

          <div class="weight-row" *ngFor="let w of formWeights; let idx = index; trackBy: trackByIndex">
            <div class="weight-domain">
              <input
                pInputText
                [(ngModel)]="w.domain"
                [placeholder]="i18n.translate('scoringPolicy.domainPlaceholder')"
                class="w-full"
              />
            </div>
            <div class="weight-value">
              <p-inputNumber
                [(ngModel)]="w.value"
                [min]="0"
                [max]="1"
                [step]="0.05"
                [minFractionDigits]="2"
                [maxFractionDigits]="2"
                mode="decimal"
                inputStyleClass="w-full"
                styleClass="w-full"
              />
            </div>
            <button
              class="icon-btn delete-btn"
              (click)="removeWeightRow(idx)"
              pTooltip="Remove"
              aria-label="Remove weight row"
            >
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div *ngIf="formWeights.length === 0" class="no-weights-msg">
            No weight domains defined. Click "Add Domain" to begin.
          </div>

          <!-- Weight total indicator -->
          <div class="weight-total" *ngIf="formWeights.length > 0">
            <span>Total:</span>
            <span
              [class.weight-valid]="isFormWeightSumValid()"
              [class.weight-invalid]="!isFormWeightSumValid()"
            >
              {{ formWeightSum() | number:'1.2-2' }}
            </span>
            <span class="weight-hint" *ngIf="!isFormWeightSumValid()">
              (weights must sum to 1.00)
            </span>
            <span class="weight-hint weight-ok" *ngIf="isFormWeightSumValid()">
              <i class="pi pi-check-circle"></i> Valid
            </span>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          [label]="i18n.translate('common.cancel')"
          icon="pi pi-times"
          severity="secondary"
          [text]="true"
          (onClick)="showFormDialog = false"
        />
        <p-button
          [label]="editingPolicy() ? i18n.translate('common.update') : i18n.translate('common.create')"
          icon="pi pi-check"
          (onClick)="savePolicy()"
          [disabled]="!formName.trim() || formWeights.length === 0"
        />
      </ng-template>
    </p-dialog>

    <!-- Delete Confirmation Dialog -->
    <p-dialog
      [header]="i18n.translate('scoringPolicy.confirmDelete')"
      [(visible)]="showDeleteDialog"
      [modal]="true"
      [style]="{ width: '420px' }"
      [closable]="true"
    >
      <div class="delete-confirm">
        <i class="pi pi-exclamation-triangle delete-warn-icon"></i>
        <p>
          Are you sure you want to delete the policy
          <strong>"{{ deletingPolicy()?.name }}"</strong>?
          This action cannot be undone.
        </p>
      </div>
      <ng-template pTemplate="footer">
        <p-button
          [label]="i18n.translate('common.cancel')"
          icon="pi pi-times"
          severity="secondary"
          [text]="true"
          (onClick)="showDeleteDialog = false"
        />
        <p-button
          [label]="i18n.translate('common.delete')"
          icon="pi pi-trash"
          severity="danger"
          (onClick)="confirmDelete()"
        />
      </ng-template>
    </p-dialog>

    <!-- Apply to Assessment Dialog -->
    <p-dialog
      [header]="i18n.translate('scoringPolicy.applyToAssessment')"
      [(visible)]="showApplyDialog"
      [modal]="true"
      [style]="{ width: '480px' }"
      [closable]="true"
    >
      <div class="dialog-form">
        <p class="apply-policy-name">
          Policy: <strong>{{ applyingPolicy()?.name }}</strong>
        </p>
        <div class="field">
          <label>{{ i18n.translate('scoringPolicy.assessmentId') }}</label>
          <input
            pInputText
            [(ngModel)]="applyAssessmentId"
            [placeholder]="i18n.translate('scoringPolicy.assessmentIdPlaceholder')"
            class="w-full"
          />
        </div>

        <!-- Result display -->
        <div class="apply-result" *ngIf="applyResult()">
          <div class="result-card">
            <div class="result-label">Assessment Score</div>
            <div class="result-score">{{ applyResult()!.score | number:'1.2-2' }}</div>
            <div class="result-meta">
              Policy: {{ applyResult()!.policyId }}<br />
              Assessment: {{ applyResult()!.assessmentId }}
            </div>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          [label]="i18n.translate('common.cancel')"
          icon="pi pi-times"
          severity="secondary"
          [text]="true"
          (onClick)="closeApplyDialog()"
        />
        <p-button
          [label]="i18n.translate('scoringPolicy.apply')"
          icon="pi pi-play"
          (onClick)="applyPolicy()"
          [disabled]="!applyAssessmentId.trim()"
          [loading]="applyLoading()"
        />
      </ng-template>
    </p-dialog>

    <!-- Error Banner -->
    <div class="error-banner" *ngIf="errorMsg()">
      <i class="pi pi-exclamation-circle"></i>
      <span>{{ errorMsg() }}</span>
      <button class="icon-btn" (click)="errorMsg.set('')" aria-label="Dismiss error">
        <i class="pi pi-times"></i>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; padding: var(--space-lg, 24px); }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-lg, 24px);
    }
    .header-left { display: flex; align-items: baseline; gap: 12px; }
    .page-title {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-heading, #1e293b);
      margin: 0;
    }
    .policy-count {
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-muted, #94a3b8);
      background: var(--surface-ice, #f0f9ff);
      padding: 2px 10px;
      border-radius: var(--radius-md, 8px);
    }

    /* Loading */
    .loading-state {
      text-align: center;
      padding: var(--space-2xl, 48px);
      color: var(--text-muted, #94a3b8);
    }
    .loading-icon { font-size: var(--font-size-4xl); display: block; margin-bottom: var(--space-md, 16px); }

    /* Empty */
    .empty-state {
      text-align: center;
      padding: var(--space-2xl, 48px);
      color: var(--text-muted, #94a3b8);
    }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md, 16px); display: block; }
    .empty-msg { text-align: center; color: var(--text-muted, #94a3b8); padding: var(--space-xl, 32px); }

    /* Table helpers */
    .text-muted { color: var(--text-muted, #94a3b8); }
    .weight-valid { color: #16a34a; font-weight: 600; }
    .weight-invalid { color: #dc2626; font-weight: 600; }

    /* Action buttons */
    .action-btns { display: flex; gap: 4px; }
    .icon-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted, #94a3b8);
      padding: 6px;
      border-radius: var(--radius-sm, 4px);
      transition: all 150ms;
      font-size: var(--font-size-base, 1rem);
    }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.edit-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.apply-btn:hover { background: #dcfce7; color: #16a34a; }
    .icon-btn.delete-btn:hover { background: #fee2e2; color: #dc2626; }

    /* Dialog form */
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }
    .w-full { width: 100%; }
    .field-row-inline { display: flex; align-items: center; gap: 8px; }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-heading, #1e293b);
      cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] { cursor: pointer; }

    /* Weights */
    .weights-section {
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      padding: 16px;
      background: var(--surface-ice, #f8fafc);
    }
    .weights-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .section-label {
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 700;
      color: var(--text-heading, #1e293b);
    }
    .weight-row {
      display: grid;
      grid-template-columns: 1fr 140px 36px;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .weight-domain { flex: 1; }
    .weight-value { width: 140px; }
    .no-weights-msg {
      text-align: center;
      color: var(--text-muted, #94a3b8);
      font-size: var(--font-size-sm, 0.875rem);
      padding: 16px;
    }
    .weight-total {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle, #e2e8f0);
      font-size: var(--font-size-sm, 0.875rem);
      font-weight: 600;
    }
    .weight-hint {
      font-weight: 400;
      font-size: var(--font-size-xs, 0.75rem);
      color: #dc2626;
    }
    .weight-hint.weight-ok { color: #16a34a; }

    /* Delete */
    .delete-confirm {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .delete-warn-icon {
      font-size: var(--font-size-2xl);
      color: #f59e0b;
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* Apply */
    .apply-policy-name {
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-muted, #94a3b8);
      margin: 0;
    }
    .apply-result { margin-top: 8px; }
    .result-card {
      background: var(--surface-ice, #f0f9ff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: var(--radius-md, 8px);
      padding: 16px;
      text-align: center;
    }
    .result-label {
      font-size: var(--font-size-sm, 0.875rem);
      color: var(--text-muted, #94a3b8);
      margin-bottom: 4px;
    }
    .result-score {
      font-size: var(--font-size-4xl);
      font-weight: 700;
      color: var(--primary, #2563eb);
    }
    .result-meta {
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--text-muted, #94a3b8);
      margin-top: 8px;
    }

    /* Error banner */
    .error-banner {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px 16px;
      border-radius: var(--radius-md, 8px);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--font-size-sm, 0.875rem);
      z-index: var(--z-modal);
      box-shadow: 0 4px 12px rgba(var(--color-black-rgb), 0.1);
    }
  `],
})
export class ScoringPolicyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // State signals
  policies = signal<ScoringPolicy[]>([]);
  loading = signal(true);
  errorMsg = signal('');

  // Form dialog
  showFormDialog = false;
  editingPolicy = signal<ScoringPolicy | null>(null);
  formName = '';
  formIsDefault = false;
  formWeights: WeightEntry[] = [];

  // Delete dialog
  showDeleteDialog = false;
  deletingPolicy = signal<ScoringPolicy | null>(null);

  // Apply dialog
  showApplyDialog = false;
  applyingPolicy = signal<ScoringPolicy | null>(null);
  applyAssessmentId = '';
  applyResult = signal<{ assessmentId: string; policyId: string; score: number } | null>(null);
  applyLoading = signal(false);

  ngOnInit(): void {
    this.loadPolicies();
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD — Load                                                       */
  /* ------------------------------------------------------------------ */
  loadPolicies(): void {
    this.loading.set(true);
    this.http.get<{ policies: ScoringPolicy[]; count: number }>(
      `${this.api}/scoring-policy-engine`
    ).subscribe({
      next: (res) => {
        this.policies.set(res.policies ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Failed to load scoring policies.');
        this.policies.set([]);
        this.loading.set(false);
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD — Create / Edit dialog                                       */
  /* ------------------------------------------------------------------ */
  openCreateDialog(): void {
    this.editingPolicy.set(null);
    this.formName = '';
    this.formIsDefault = false;
    this.formWeights = [
      { domain: 'governance', value: 0.3 },
      { domain: 'operations', value: 0.25 },
      { domain: 'resilience', value: 0.25 },
      { domain: 'third_party', value: 0.2 },
    ];
    this.showFormDialog = true;
  }

  openEditDialog(policy: ScoringPolicy): void {
    this.editingPolicy.set(policy);
    this.formName = policy.name;
    this.formIsDefault = policy.is_default;
    this.formWeights = Object.entries(policy.weights ?? {}).map(([domain, value]) => ({
      domain,
      value,
    }));
    if (this.formWeights.length === 0) {
      this.formWeights.push({ domain: '', value: 0 });
    }
    this.showFormDialog = true;
  }

  resetForm(): void {
    this.editingPolicy.set(null);
    this.formName = '';
    this.formIsDefault = false;
    this.formWeights = [];
  }

  addWeightRow(): void {
    this.formWeights = [...this.formWeights, { domain: '', value: 0 }];
  }

  removeWeightRow(index: number): void {
    this.formWeights = this.formWeights.filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  formWeightSum(): number {
    return this.formWeights.reduce((sum, w) => sum + (w.value ?? 0), 0);
  }

  isFormWeightSumValid(): boolean {
    const sum = this.formWeightSum();
    return Math.abs(sum - 1.0) < 0.005;
  }

  savePolicy(): void {
    if (!this.formName.trim() || this.formWeights.length === 0) return;

    const weights: Record<string, number> = {};
    for (const w of this.formWeights) {
      const key = w.domain.trim();
      if (key) {
        weights[key] = w.value;
      }
    }

    const body = {
      name: this.formName.trim(),
      weights,
      is_default: this.formIsDefault,
    };

    const editing = this.editingPolicy();
    if (editing) {
      this.http.put<ScoringPolicy>(
        `${this.api}/scoring-policy-engine/${editing.policy_id}`,
        body,
      ).subscribe({
        next: () => {
          this.showFormDialog = false;
          this.resetForm();
          this.loadPolicies();
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message ?? 'Failed to update policy.');
        },
      });
    } else {
      this.http.post<ScoringPolicy>(
        `${this.api}/scoring-policy-engine`,
        body,
      ).subscribe({
        next: () => {
          this.showFormDialog = false;
          this.resetForm();
          this.loadPolicies();
        },
        error: (err) => {
          this.errorMsg.set(err?.error?.message ?? 'Failed to create policy.');
        },
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD — Delete                                                     */
  /* ------------------------------------------------------------------ */
  openDeleteDialog(policy: ScoringPolicy): void {
    this.deletingPolicy.set(policy);
    this.showDeleteDialog = true;
  }

  confirmDelete(): void {
    const policy = this.deletingPolicy();
    if (!policy) return;

    this.http.delete(
      `${this.api}/scoring-policy-engine/${policy.policy_id}`
    ).subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.deletingPolicy.set(null);
        this.loadPolicies();
      },
      error: (err) => {
        this.showDeleteDialog = false;
        this.errorMsg.set(err?.error?.message ?? 'Failed to delete policy.');
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Apply to Assessment                                               */
  /* ------------------------------------------------------------------ */
  openApplyDialog(policy: ScoringPolicy): void {
    this.applyingPolicy.set(policy);
    this.applyAssessmentId = '';
    this.applyResult.set(null);
    this.showApplyDialog = true;
  }

  closeApplyDialog(): void {
    this.showApplyDialog = false;
    this.applyingPolicy.set(null);
    this.applyAssessmentId = '';
    this.applyResult.set(null);
  }

  applyPolicy(): void {
    const policy = this.applyingPolicy();
    if (!policy || !this.applyAssessmentId.trim()) return;

    this.applyLoading.set(true);
    this.applyResult.set(null);

    this.http.post<{ assessmentId: string; policyId: string; score: number }>(
      `${this.api}/scoring-policy-engine/${policy.policy_id}/apply/${this.applyAssessmentId.trim()}`,
      {},
    ).subscribe({
      next: (res) => {
        this.applyResult.set(res);
        this.applyLoading.set(false);
      },
      error: (err) => {
        this.applyLoading.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Failed to apply policy to assessment.');
      },
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Table helpers                                                     */
  /* ------------------------------------------------------------------ */
  getWeightCount(policy: ScoringPolicy): number {
    return Object.keys(policy.weights ?? {}).length;
  }

  getWeightSum(policy: ScoringPolicy): number {
    return Object.values(policy.weights ?? {}).reduce((s, v) => s + v, 0);
  }

  isWeightSumValid(policy: ScoringPolicy): boolean {
    return Math.abs(this.getWeightSum(policy) - 1.0) < 0.005;
  }
}
