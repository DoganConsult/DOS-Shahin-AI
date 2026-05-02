import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { devError } from '@app/runtime/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcFormFieldComponent } from '@app/shared/components/forms-inputs/grc-form-field.component';
import { ApiClientService } from "@app/core/services/api-client.service";

interface Model {
  model_id: string; name: string; description: string; model_type: string; version: string;
  owner: string | null; department: string | null; vendor: string | null;
  status: string; risk_tier: string; use_case: string | null;
  input_data_types: string[]; output_description: string | null;
  regulatory_frameworks: string[]; last_validated_at: string | null; next_review_date: string | null;
  latest_risk_score: number | null; latest_zone: string | null;
  validation_count: number; latest_validation: string | null;
  created_at: string;
}

interface ModelSummary {
  total: number; development: number; production: number; retired: number;
  high_risk: number; needs_validation: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-model-risk',
    imports: [CommonModule, AppNumberPipe, FormsModule, ConfirmDialogModule, GrcFormFieldComponent],
    providers: [ConfirmationService],
    templateUrl: './model-risk.component.html',
    styleUrls: ['./model-risk.component.scss']
})
export class ModelRiskComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private live = inject(GrcLiveService);

  loading = signal(true);
  models = signal<Model[]>([]);
  filtered = signal<Model[]>([]);
  summary = signal<ModelSummary>({ total: 0, development: 0, production: 0, retired: 0, high_risk: 0, needs_validation: 0 });

  showForm = false;
  editingId: string | null = null;
  filterTier = '';
  filterStatus = '';

  form: Record<string, any> = { name: '', description: '', model_type: 'classification', version: '1.0', risk_tier: 'medium', status: 'development', owner: '', department: '', vendor: '', use_case: '', next_review_date: '' };

  scoringModelId: string | null = null;
  scoringModelName = '';
  scoreForm = { inherent_risk: 50, residual_risk: 30, data_quality_score: 70, performance_score: 80, compliance_score: 60 };

  validatingModelId: string | null = null;
  validatingModelName = '';
  valForm: Record<string, any> = { validation_type: 'periodic', result: 'pending', score: null, notes: '', next_validation_date: '' };

  ngOnInit(): void {
    this.loadModels();
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadModels());
  }

  loadModels(): void {
    this.apiclientSvc.get('/model-risk').subscribe({
      next: (res: Record<string, any>) => {
        this.models.set(res?.models ?? []);
        this.summary.set(res?.summary ?? { total: 0, development: 0, production: 0, retired: 0, high_risk: 0, needs_validation: 0 });
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters(): void {
    let list = this.models();
    if (this.filterTier) list = list.filter(m => m.risk_tier === this.filterTier);
    if (this.filterStatus) list = list.filter(m => m.status === this.filterStatus);
    this.filtered.set(list);
  }

  save(): void {
    if (!this.form.name) return;
    const obs = this.editingId
      ? this.apiclientSvc.put(`/model-risk/${this.editingId}`, this.form)
      : this.apiclientSvc.post('/model-risk', this.form);
    obs.subscribe({ next: () => { this.resetForm(); this.loadModels(); }, error: (e: any) => devError(e) });
  }

  editModel(m: Model): void {
    this.editingId = m.model_id;
    this.form = { name: m.name, description: m.description, model_type: m.model_type, version: m.version, risk_tier: m.risk_tier, status: m.status, owner: m.owner || '', department: m.department || '', vendor: m.vendor || '', use_case: m.use_case || '', next_review_date: m.next_review_date?.split('T')[0] || '' };
    this.showForm = true;
  }

  remove(m: Model): void {
    this.confirmSvc.confirm({
      message: this.i18n.translate('Delete this model?'),
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.apiclientSvc.del(`/model-risk/${m.model_id}`).subscribe({ next: () => this.loadModels() });
      }
    });
  }

  openScore(m: Model): void {
    this.scoringModelId = m.model_id;
    this.scoringModelName = m.name;
    this.scoreForm = { inherent_risk: 50, residual_risk: 30, data_quality_score: 70, performance_score: 80, compliance_score: 60 };
  }

  submitScore(): void {
    if (!this.scoringModelId) return;
    this.apiclientSvc.post(`/model-risk/${this.scoringModelId}/scores`, this.scoreForm).subscribe({
      next: () => { this.scoringModelId = null; this.loadModels(); },
      error: (e: any) => devError(e)
    });
  }

  openValidation(m: Model): void {
    this.validatingModelId = m.model_id;
    this.validatingModelName = m.name;
    this.valForm = { validation_type: 'periodic', result: 'pending', score: null, notes: '', next_validation_date: '' };
  }

  submitValidation(): void {
    if (!this.validatingModelId) return;
    this.apiclientSvc.post(`/model-risk/${this.validatingModelId}/validations`, this.valForm).subscribe({
      next: () => { this.validatingModelId = null; this.loadModels(); },
      error: (e: any) => devError(e)
    });
  }

  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = { name: '', description: '', model_type: 'classification', version: '1.0', risk_tier: 'medium', status: 'development', owner: '', department: '', vendor: '', use_case: '', next_review_date: '' };
  }

  isOverdue(m: Model): boolean {
    return !!m.next_review_date && new Date(m.next_review_date) < new Date();
  }
}
