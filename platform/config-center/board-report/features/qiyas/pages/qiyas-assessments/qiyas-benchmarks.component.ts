import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { QiyasAssessment, QiyasBenchmarkDataset, QiyasBenchmarkComparison } from '../../qiyas.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-benchmarks',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.benchmarks') }}</h1>
          <p class="subtitle">Benchmark management and comparison</p>
        </div>
      </div>

      <!-- Tab toggle -->
      <div class="tabs">
        <button [class.active]="activeTab() === 'datasets'" (click)="activeTab.set('datasets')">Datasets</button>
        <button [class.active]="activeTab() === 'compare'" (click)="activeTab.set('compare')">Compare</button>
      </div>

      <!-- Datasets tab -->
      <div class="tab-content" *ngIf="activeTab() === 'datasets'">
        <div class="section-header">
          <h3>Benchmark Datasets</h3>
          <button class="btn-primary btn-sm" (click)="showCreateDataset = !showCreateDataset">+ New Dataset</button>
        </div>

        <!-- Create dataset form -->
        <div class="create-form" *ngIf="showCreateDataset">
          <div class="form-grid">
            <input [(ngModel)]="newDataset.name_en" placeholder="Dataset name" aria-label="Dataset name" class="input full" />
            <input [(ngModel)]="newDataset.sector" placeholder="Sector" aria-label="Sector" class="input" />
            <input [(ngModel)]="newDataset.region" placeholder="Region" aria-label="Region" class="input" />
            <input [(ngModel)]="newDataset.sample_size" type="number" placeholder="Sample size" aria-label="Sample size" class="input" />
          </div>
          <textarea [(ngModel)]="datasetDataJson" placeholder="JSON data (benchmark values)" aria-label="JSON data" class="input textarea" rows="4"></textarea>
          <div class="form-actions">
            <button class="btn-primary" (click)="createDataset()" [disabled]="!newDataset.name_en">Create Dataset</button>
            <button class="btn-secondary" (click)="showCreateDataset = false">Cancel</button>
          </div>
        </div>

        <!-- Dataset list -->
        <div class="empty" *ngIf="datasets().length === 0 && !loading()">{{ i18n.translate('qiyas.noData') }}</div>
        <div class="dataset-list">
          <div *ngFor="let ds of datasets()" class="dataset-card">
            <div class="dataset-info">
              <div class="dataset-name">{{ ds.name_en }}</div>
              <div class="dataset-meta-row">
                <span class="meta-tag" *ngIf="ds.sector">{{ ds.sector }}</span>
                <span class="meta-tag" *ngIf="ds.region">{{ ds.region }}</span>
                <span class="meta-tag">n={{ ds.sample_size }}</span>
              </div>
            </div>
            <div class="dataset-date">{{ ds.created_at | date:'mediumDate' }}</div>
          </div>
        </div>
      </div>

      <!-- Compare tab -->
      <div class="tab-content" *ngIf="activeTab() === 'compare'">
        <div class="compare-controls">
          <select [(ngModel)]="selectedAssessmentId" class="input" aria-label="Select assessment">
            <option value="">Select Assessment</option>
            <option *ngFor="let a of assessments()" [value]="a.qiyas_assessment_id">{{ a.title_en }}</option>
          </select>
          <select [(ngModel)]="selectedDatasetId" class="input" aria-label="Select dataset">
            <option value="">Select Dataset</option>
            <option *ngFor="let ds of datasets()" [value]="ds.dataset_id">{{ ds.name_en }}</option>
          </select>
          <button class="btn-primary" (click)="runComparison()" [disabled]="!selectedAssessmentId || !selectedDatasetId">Compare</button>
        </div>

        <!-- Comparison results -->
        <div class="empty" *ngIf="comparisons().length === 0 && !comparing()">Select an assessment and dataset to compare</div>
        <div class="comparing-msg" *ngIf="comparing()">Computing comparison...</div>

        <div class="results-table" *ngIf="comparisons().length > 0">
          <div class="table-header">
            <span class="col-domain">Domain</span>
            <span class="col-score">Org Score</span>
            <span class="col-score">Avg</span>
            <span class="col-score">P25</span>
            <span class="col-score">P50</span>
            <span class="col-score">P75</span>
            <span class="col-rank">Percentile</span>
            <span class="col-delta">Delta</span>
          </div>
          <div *ngFor="let c of comparisons()" class="table-row">
            <span class="col-domain">{{ c.domain_name }}</span>
            <span class="col-score">{{ c.org_score | number:'1.1-1' }}</span>
            <span class="col-score">{{ c.benchmark_avg | number:'1.1-1' }}</span>
            <span class="col-score">{{ c.benchmark_p25 | number:'1.1-1' }}</span>
            <span class="col-score">{{ c.benchmark_p50 | number:'1.1-1' }}</span>
            <span class="col-score">{{ c.benchmark_p75 | number:'1.1-1' }}</span>
            <span class="col-rank">
              <div class="progress-bar-track">
                <div class="progress-bar-fill" [style.width.%]="c.percentile_rank"></div>
              </div>
              <span class="rank-label">{{ c.percentile_rank | number:'1.0-0' }}%</span>
            </span>
            <span class="col-delta" [class.positive]="c.delta >= 0" [class.negative]="c.delta < 0">
              {{ c.delta >= 0 ? '+' : '' }}{{ c.delta | number:'1.1-1' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary.btn-sm { padding: 6px 14px; font-size: var(--font-size-sm); }
    .btn-secondary { padding: 10px 20px; border-radius: var(--radius); border: 1px solid #cbd5e1; background: #fff; color: var(--text-heading); cursor: pointer; font-size: var(--font-size-base); }
    .tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border-subtle); margin-bottom: 20px; }
    .tabs button { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: var(--font-size-base); font-weight: 500; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .tabs button.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-content { min-height: 200px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-header h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0; }
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
    .form-grid { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    .form-actions { display: flex; gap: 10px; margin-top: 12px; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input.full { flex: 1; min-width: 200px; }
    .textarea { width: 100%; box-sizing: border-box; font-family: monospace; font-size: var(--font-size-sm); resize: vertical; }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
    .comparing-msg { color: var(--primary); text-align: center; padding: 24px; font-weight: 500; }
    .dataset-list { display: flex; flex-direction: column; gap: 8px; }
    .dataset-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .dataset-name { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); }
    .dataset-meta-row { display: flex; gap: 6px; margin-top: 4px; }
    .meta-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .dataset-date { font-size: var(--font-size-sm); color: var(--text-muted); }
    .compare-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
    .compare-controls .input { min-width: 200px; }
    .results-table { border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .table-header { display: flex; align-items: center; padding: 10px 16px; background: var(--surface-ice); font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
    .table-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); background: #fff; }
    .table-row:last-child { border-bottom: none; }
    .col-domain { flex: 2; font-weight: 500; color: var(--text-heading); }
    .col-score { flex: 1; text-align: center; font-size: var(--font-size-sm); }
    .col-rank { flex: 2; display: flex; align-items: center; gap: 8px; }
    .col-delta { flex: 1; text-align: center; font-weight: 600; font-size: var(--font-size-sm); }
    .col-delta.positive { color: var(--success); }
    .col-delta.negative { color: #dc2626; }
    .progress-bar-track { flex: 1; height: 8px; background: var(--border-subtle); border-radius: var(--radius-xs); overflow: hidden; }
    .progress-bar-fill { height: 100%; background: var(--primary); border-radius: var(--radius-xs); transition: width 0.3s ease; }
    .rank-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-heading); min-width: 36px; }
    @media (max-width: 768px) {
      .compare-controls { flex-direction: column; }
      .compare-controls .input { min-width: 100%; }
      .results-table { font-size: var(--font-size-sm); }
    }
  `]
})
export class QiyasBenchmarksComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);

  activeTab = signal<'datasets' | 'compare'>('datasets');
  datasets = signal<QiyasBenchmarkDataset[]>([]);
  assessments = signal<QiyasAssessment[]>([]);
  comparisons = signal<QiyasBenchmarkComparison[]>([]);
  loading = signal(false);
  comparing = signal(false);

  showCreateDataset = false;
  newDataset: Partial<QiyasBenchmarkDataset> = { name_en: '', sector: '', region: '', sample_size: 0 };
  datasetDataJson = '';
  selectedAssessmentId = '';
  selectedDatasetId = '';

  ngOnInit() {
    this.loadDatasets();
    this.svc.listAssessments({ status: 'finalized' }).subscribe({
      next: (a) => this.assessments.set(a),
      error: () => this.assessments.set([]),
    });
  }

  loadDatasets() {
    this.loading.set(true);
    this.svc.listBenchmarkDatasets().subscribe({
      next: (res) => { this.datasets.set(res.datasets); this.loading.set(false); },
      error: () => { this.datasets.set([]); this.loading.set(false); },
    });
  }

  createDataset() {
    let parsedData: unknown = null;
    try {
      parsedData = this.datasetDataJson ? JSON.parse(this.datasetDataJson) : null;
    } catch {
      return;
    }
    const payload: Partial<QiyasBenchmarkDataset> = {
      ...this.newDataset,
      data: parsedData,
    };
    this.svc.createBenchmarkDataset(payload).subscribe({
      next: () => {
        this.showCreateDataset = false;
        this.newDataset = { name_en: '', sector: '', region: '', sample_size: 0 };
        this.datasetDataJson = '';
        this.loadDatasets();
      },
    });
  }

  runComparison() {
    if (!this.selectedAssessmentId || !this.selectedDatasetId) return;
    this.comparing.set(true);
    this.comparisons.set([]);
    this.svc.computeBenchmarkComparison(this.selectedAssessmentId, this.selectedDatasetId).subscribe({
      next: (res) => { this.comparisons.set(res); this.comparing.set(false); },
      error: () => { this.comparisons.set([]); this.comparing.set(false); },
    });
  }
}
