import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { GrcLiveService } from '../../core/interceptors/grc-live.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  standalone: true,
  imports: [CommonModule, AppNumberPipe, FormsModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />
    <section class="page-shell">
      <header class="page-header">
        <div class="header-row">
          <div>
            <h2>{{ i18n.translate('Model Risk Management') }}</h2>
            <p class="text-muted">{{ i18n.translate('Model inventory, validation tracking, and risk scoring') }}</p>
          </div>
          <button class="btn-primary" (click)="showForm = !showForm">
            <i class="pi pi-plus"></i> {{ i18n.translate('Register Model') }}
          </button>
        </div>
      </header>

      <!-- Summary Cards -->
      @if (!loading()) {
        <div class="summary-grid">
          <div class="summary-card">
            <span class="sc-value">{{ summary().total }}</span>
            <span class="sc-label">{{ i18n.translate('Total Models') }}</span>
          </div>
          <div class="summary-card sc-blue">
            <span class="sc-value">{{ summary().development }}</span>
            <span class="sc-label">{{ i18n.translate('Development') }}</span>
          </div>
          <div class="summary-card sc-green">
            <span class="sc-value">{{ summary().production }}</span>
            <span class="sc-label">{{ i18n.translate('Production') }}</span>
          </div>
          <div class="summary-card sc-grey">
            <span class="sc-value">{{ summary().retired }}</span>
            <span class="sc-label">{{ i18n.translate('Retired') }}</span>
          </div>
          <div class="summary-card sc-red">
            <span class="sc-value">{{ summary().high_risk }}</span>
            <span class="sc-label">{{ i18n.translate('High Risk') }}</span>
          </div>
          <div class="summary-card sc-amber">
            <span class="sc-value">{{ summary().needs_validation }}</span>
            <span class="sc-label">{{ i18n.translate('Needs Validation') }}</span>
          </div>
        </div>
      }

      <!-- Create/Edit Form -->
      @if (showForm) {
        <div class="card form-card">
          <h3 class="card-title">{{ editingId ? i18n.translate('Edit Model') : i18n.translate('Register New Model') }}</h3>
          <div class="form-grid">
            <div class="form-group col-2">
              <label>{{ i18n.translate('Model Name') }} *</label>
              <input [(ngModel)]="form.name" placeholder="e.g. Credit Risk Scoring Model v2" aria-label="e.g. Credit Risk Scoring Model v2" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Type') }}</label>
              <select [(ngModel)]="form.model_type">
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
                <option value="nlp">NLP</option>
                <option value="generative_ai">Generative AI</option>
                <option value="recommendation">Recommendation</option>
                <option value="anomaly_detection">Anomaly Detection</option>
                <option value="forecasting">Forecasting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Version') }}</label>
              <input [(ngModel)]="form.version" placeholder="1.0" aria-label="1.0" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Risk Tier') }}</label>
              <select [(ngModel)]="form.risk_tier">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Status') }}</label>
              <select [(ngModel)]="form.status">
                <option value="development">Development</option>
                <option value="validation">Validation</option>
                <option value="production">Production</option>
                <option value="monitoring">Monitoring</option>
                <option value="retired">Retired</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Owner') }}</label>
              <input [(ngModel)]="form.owner" placeholder="user ID" aria-label="user ID" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Department') }}</label>
              <input [(ngModel)]="form.department" placeholder="e.g. Risk Management" aria-label="e.g. Risk Management" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Vendor') }}</label>
              <input [(ngModel)]="form.vendor" placeholder="e.g. Internal / External vendor" aria-label="e.g. Internal / External vendor" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Next Review Date') }}</label>
              <input type="date" [(ngModel)]="form.next_review_date" />
            </div>
            <div class="form-group col-2">
              <label>{{ i18n.translate('Description') }}</label>
              <textarea [(ngModel)]="form.description" rows="2"></textarea>
            </div>
            <div class="form-group col-2">
              <label>{{ i18n.translate('Use Case') }}</label>
              <textarea [(ngModel)]="form.use_case" rows="2"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" (click)="resetForm()">{{ i18n.translate('Cancel') }}</button>
            <button class="btn-primary" (click)="save()" [disabled]="!form.name">
              {{ editingId ? i18n.translate('Update') : i18n.translate('Register') }}
            </button>
          </div>
        </div>
      }

      <!-- Score Model Dialog -->
      @if (scoringModelId) {
        <div class="card form-card">
          <h3 class="card-title">{{ i18n.translate('Score Model Risk') }}: {{ scoringModelName }}</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>{{ i18n.translate('Inherent Risk') }} (0-100)</label>
              <input type="number" [(ngModel)]="scoreForm.inherent_risk" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Residual Risk') }} (0-100)</label>
              <input type="number" [(ngModel)]="scoreForm.residual_risk" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Data Quality') }} (0-100)</label>
              <input type="number" [(ngModel)]="scoreForm.data_quality_score" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Performance') }} (0-100)</label>
              <input type="number" [(ngModel)]="scoreForm.performance_score" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Compliance') }} (0-100)</label>
              <input type="number" [(ngModel)]="scoreForm.compliance_score" min="0" max="100" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" (click)="scoringModelId = null">{{ i18n.translate('Cancel') }}</button>
            <button class="btn-primary" (click)="submitScore()">{{ i18n.translate('Submit Score') }}</button>
          </div>
        </div>
      }

      <!-- Validate Model Dialog -->
      @if (validatingModelId) {
        <div class="card form-card">
          <h3 class="card-title">{{ i18n.translate('Add Validation') }}: {{ validatingModelName }}</h3>
          <div class="form-grid">
            <div class="form-group">
              <label>{{ i18n.translate('Validation Type') }}</label>
              <select [(ngModel)]="valForm.validation_type">
                <option value="initial">Initial Validation</option>
                <option value="periodic">Periodic Review</option>
                <option value="performance">Performance Test</option>
                <option value="bias_fairness">Bias & Fairness</option>
                <option value="regulatory">Regulatory Compliance</option>
                <option value="stress_test">Stress Test</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Result') }}</label>
              <select [(ngModel)]="valForm.result">
                <option value="pass">Pass</option>
                <option value="conditional">Conditional Pass</option>
                <option value="fail">Fail</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Score') }} (0-100)</label>
              <input type="number" [(ngModel)]="valForm.score" min="0" max="100" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Next Validation') }}</label>
              <input type="date" [(ngModel)]="valForm.next_validation_date" />
            </div>
            <div class="form-group col-2">
              <label>{{ i18n.translate('Notes') }}</label>
              <textarea [(ngModel)]="valForm.notes" rows="2"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" (click)="validatingModelId = null">{{ i18n.translate('Cancel') }}</button>
            <button class="btn-primary" (click)="submitValidation()">{{ i18n.translate('Submit Validation') }}</button>
          </div>
        </div>
      }

      <!-- Filter -->
      @if (!loading() && models().length > 0) {
        <div class="filter-row">
          <select [(ngModel)]="filterTier" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('All Risk Tiers') }}</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('All Statuses') }}</option>
            <option value="development">Development</option>
            <option value="validation">Validation</option>
            <option value="production">Production</option>
            <option value="monitoring">Monitoring</option>
            <option value="retired">Retired</option>
          </select>
          <span class="filter-count">{{ filtered().length }} / {{ models().length }}</span>
        </div>
      }

      <!-- Models Table -->
      <div class="page-body">
        @if (loading()) { <div class="card"><p>{{ i18n.translate('Loading...') }}</p></div> }
        @else if (filtered().length === 0) {
          <div class="card empty-state">
            <i class="pi pi-box"></i>
            <p>{{ i18n.translate('No models registered') }}</p>
          </div>
        }
        @else {
          <div class="table-wrapper">
            <table aria-label="Data Table table" class="data-table">
              <thead>
                <tr>
                  <th>{{ i18n.translate('Model') }}</th>
                  <th>{{ i18n.translate('Type') }}</th>
                  <th>{{ i18n.translate('Version') }}</th>
                  <th>{{ i18n.translate('Risk Tier') }}</th>
                  <th>{{ i18n.translate('Status') }}</th>
                  <th>{{ i18n.translate('Risk Score') }}</th>
                  <th>{{ i18n.translate('Validations') }}</th>
                  <th>{{ i18n.translate('Review Due') }}</th>
                  <th>{{ i18n.translate('Actions') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (m of filtered(); track m.model_id) {
                  <tr>
                    <td class="td-title">
                      <div>{{ m.name }}</div>
                      <small class="text-muted" *ngIf="m.vendor">{{ m.vendor }}</small>
                    </td>
                    <td><span class="type-tag">{{ m.model_type }}</span></td>
                    <td>{{ m.version }}</td>
                    <td><span class="badge badge-{{ m.risk_tier }}">{{ m.risk_tier }}</span></td>
                    <td><span class="status-pill status-{{ m.status }}">{{ m.status }}</span></td>
                    <td>
                      @if (m.latest_risk_score != null) {
                        <span class="risk-score zone-{{ m.latest_zone }}">{{ m.latest_risk_score | appNumber:'decimal':'1.0-0' }}</span>
                      } @else { <span class="text-muted">—</span> }
                    </td>
                    <td>
                      <span>{{ m.validation_count }}</span>
                      <small class="text-muted" *ngIf="m.latest_validation"> ({{ m.latest_validation }})</small>
                    </td>
                    <td [class.overdue]="isOverdue(m)">{{ m.next_review_date || '—' }}</td>
                    <td class="td-actions">
                      <button aria-label="Edit" class="btn-icon" (click)="editModel(m)" title="Edit"><i class="pi pi-pencil"></i></button>
                      <button aria-label="Score" class="btn-icon" (click)="openScore(m)" title="Score"><i class="pi pi-chart-bar"></i></button>
                      <button aria-label="Validate" class="btn-icon" (click)="openValidation(m)" title="Validate"><i class="pi pi-check-square"></i></button>
                      <button aria-label="Delete" class="btn-icon btn-danger" (click)="remove(m)" title="Delete"><i class="pi pi-trash"></i></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
    <p-confirmDialog />
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); margin: 0; }
    .text-muted { color: var(--text-muted); margin-top: 4px; font-size: var(--font-size-sm); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .btn-primary { background: var(--primary, #2563eb); color: #fff; border: none; padding: 10px 20px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-base); display: flex; align-items: center; gap: 6px; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: var(--surface-200, var(--border-subtle)); color: var(--text-heading); border: none; padding: 10px 20px; border-radius: var(--radius); cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: var(--radius-xs); color: var(--text-muted); }
    .btn-icon:hover { background: var(--surface-100, var(--surface-ice)); color: var(--primary, #2563eb); }
    .btn-danger:hover { color: var(--error); }

    .summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 16px; text-align: center; border: 1px solid var(--surface-200, var(--border-subtle)); }
    .sc-value { display: block; font-size: var(--font-size-3xl); font-weight: 600; color: var(--text-heading); }
    .sc-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .sc-blue .sc-value { color: var(--primary); } .sc-green .sc-value { color: var(--success); } .sc-grey .sc-value { color: var(--text-muted); }
    .sc-red .sc-value { color: var(--error); } .sc-amber .sc-value { color: var(--warning); }

    .form-card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--surface-200, var(--border-subtle)); margin-bottom: 20px; }
    .card-title { margin: 0 0 16px; font-size: var(--font-size-lg); font-weight: 500; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--surface-300, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .col-2 { grid-column: span 2; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    .filter-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .filter-row select { padding: 6px 12px; border: 1px solid var(--surface-300, var(--border-subtle)); border-radius: var(--radius-sm); }
    .filter-count { margin-inline-start: auto; font-size: var(--font-size-sm); color: var(--text-muted); }

    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; background: var(--surface-card, #fff); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); background: var(--surface-50, #f9fafb); border-bottom: 1px solid var(--surface-200, var(--border-subtle)); }
    .data-table td { padding: 12px 16px; font-size: var(--font-size-base); border-bottom: 1px solid var(--surface-100, var(--surface-ice)); vertical-align: top; }
    .td-title { font-weight: 500; max-width: 250px; }
    .td-title small { display: block; }
    .td-actions { display: flex; gap: 4px; }

    .type-tag { background: var(--surface-100, var(--surface-ice)); padding: 2px 8px; border-radius: var(--radius-xs); font-size: var(--font-size-xs); font-weight: 500; }

    .badge { padding: 2px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    .badge-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); } .badge-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .badge-medium { background: #fffbeb; color: var(--warning); } .badge-low { background: var(--status-success-bg, #defbe6); color: var(--success); }

    .status-pill { padding: 2px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-xs); font-weight: 500; }
    .status-development { background: #eff6ff; color: var(--primary); } .status-validation { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .status-production { background: var(--status-success-bg, #defbe6); color: var(--success); } .status-monitoring { background: var(--purple-50, #f5f3ff); color: #7c3aed; }
    .status-retired { background: var(--surface-ice); color: var(--text-muted); }

    .risk-score { display: inline-block; padding: 2px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-sm); font-weight: 600; }
    .zone-low { background: var(--status-success-bg, #defbe6); color: var(--success); } .zone-medium { background: #fffbeb; color: var(--warning); }
    .zone-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); } .zone-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); }

    .overdue { color: var(--error); font-weight: 600; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-state i { font-size: var(--font-size-6xl); margin-bottom: 12px; display: block; }
    .card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--surface-200, var(--border-subtle)); }

    @media (max-width: 768px) {
      .summary-grid { grid-template-columns: repeat(3, 1fr); }
      .form-grid { grid-template-columns: 1fr; }
      .col-2 { grid-column: span 1; }
    }
  `]
})
export class ModelRiskComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private live = inject(GrcLiveService);
  private subs: Subscription[] = [];

  loading = signal(true);
  models = signal<Model[]>([]);
  filtered = signal<Model[]>([]);
  summary = signal<ModelSummary>({ total: 0, development: 0, production: 0, retired: 0, high_risk: 0, needs_validation: 0 });

  showForm = false;
  editingId: string | null = null;
  filterTier = '';
  filterStatus = '';

  form: Record<string, unknown> = { name: '', description: '', model_type: 'classification', version: '1.0', risk_tier: 'medium', status: 'development', owner: '', department: '', vendor: '', use_case: '', next_review_date: '' };

  scoringModelId: string | null = null;
  scoringModelName = '';
  scoreForm = { inherent_risk: 50, residual_risk: 30, data_quality_score: 70, performance_score: 80, compliance_score: 60 };

  validatingModelId: string | null = null;
  validatingModelName = '';
  valForm: Record<string, unknown> = { validation_type: 'periodic', result: 'pending', score: null, notes: '', next_validation_date: '' };

  ngOnInit(): void {
    this.loadModels();
    this.subs.push(this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadModels()));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  loadModels(): void {
    this.apiclientSvc.get('/model-risk').subscribe({
      next: (res: Record<string, unknown>) => {
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
    obs.subscribe({ next: () => { this.resetForm(); this.loadModels(); }, error: (e: unknown) => devError(e) });
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
      error: (e: unknown) => devError(e)
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
      error: (e: unknown) => devError(e)
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
