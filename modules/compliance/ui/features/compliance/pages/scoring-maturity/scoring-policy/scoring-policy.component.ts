import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { environment } from '@env/environment';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { GrcFormFieldComponent } from '@app/widgets';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NumberModule, TableModule, TagModule, TooltipModule } from 'carbon-components-angular';

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
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        TableModule,
        DialogModule,
        InputModule,
        NumberModule,
        TagModule,
        TooltipModule,
        DropdownModule,
        AppDatePipe,
        GrcDataTableComponent,
        GrcFormFieldComponent,
    ],
    templateUrl: './scoring-policy.component.html',
    styleUrls: ['./scoring-policy.component.scss']
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
