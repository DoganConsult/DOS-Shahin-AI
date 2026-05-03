// Backend: GET /api/risk-scoring/posture, GET /api/risk-scoring/models, GET /api/risk-scoring/risks/:id/kri-trends.
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { riskLevelFromScore } from '@shahin-ai/shared-risk-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { ApiClientService } from "@app/core/services/api-client.service";
import { GrcOperationsService } from '@app/grc/services/grc-operations.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, ButtonModule, TagModule, TableModule, SelectModule, SkeletonModule],
  template: `
    <app-page-shell icon="chart-bar" [title]="i18n.translate('grcOs.riskScoring')"
      [subtitle]="'Configurable risk models, heat maps, and KRI trends'"
      [breadcrumbs]="['Dashboard', 'Risk Scoring']" [loading]="loading">
      <div *ngIf="!loading && loadError" class="error-state text-center p-4">
        <i class="pi pi-exclamation-triangle" style="font-size:2rem; color:var(--red-500)"></i>
        <p class="mt-2 mb-2">{{ i18n.translate('common.failedToLoad') }}</p>
        <p-button [label]="i18n.translate('common.retry')" icon="pi pi-refresh" (onClick)="retry()" [text]="true" />
      </div>
      <div class="grid" *ngIf="!loading && !loadError">
        <div class="col-8">
          <p-card [header]="i18n.translate('riskScoring.riskHeatMap')">
            @if (loading) {
              <div class="heatmap-grid heatmap-skeleton">
                @for (row of [1,2,3,4,5,6]; track row) {
                  <div class="heatmap-row">
                    @for (col of [1,2,3,4,5,6]; track col) {
                      <p-skeleton width="60px" height="60px" borderRadius="var(--radius-xs)" />
                    }
                  </div>
                }
              </div>
            } @else if (risks.length === 0) {
              <div class="text-center text-color-secondary p-4">
                <i class="pi pi-chart-bar" style="font-size:2rem; opacity:0.5"></i>
                <p class="mt-2 mb-0">No scored risks yet. Score risks to see the heatmap.</p>
              </div>
            } @else {
              <div class="heatmap-grid">
                @for (row of [5,4,3,2,1]; track row) {
                  <div class="heatmap-row">
                    <div class="heatmap-label">{{ row }}</div>
                    @for (col of [1,2,3,4,5]; track col) {
                      <div class="heatmap-cell" [style.background]="getCellColor(row, col)"
                           [title]="'L:' + col + ' I:' + row + ' (' + getCellCount(col, row) + ' risks)'">
                        {{ getCellCount(col, row) || '' }}
                      </div>
                    }
                  </div>
                }
                <div class="heatmap-row">
                  <div class="heatmap-label"></div>
                  @for (col of [1,2,3,4,5]; track col) { <div class="heatmap-label">{{ col }}</div> }
                </div>
              </div>
              <div class="text-center text-sm text-color-secondary mt-2">Likelihood → | Impact ↑</div>
            }
          </p-card>
          <p-card [header]="i18n.translate('riskScoring.kriTrends')" styleClass="mt-3">
            @if (risks.length > 0) {
              <div class="flex align-items-center gap-2 mb-3">
                <label class="font-medium">Risk</label>
                <p-select [options]="riskOptions" [(ngModel)]="selectedRiskId" optionLabel="label" optionValue="value"
                  placeholder="Select risk" [showClear]="true" (onChange)="onRiskSelected()" [style]="{'min-width':'220px'}" />
              </div>
            }
            @if (kriLoading) {
              <div class="text-center p-4"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
            } @else if (kriTrends.length > 0) {
              <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('riskScoring.kriTrendsTable')" [value]="kriTrends" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                  <tr><th>KRI</th><th>Current</th><th>Threshold</th><th>Trend</th><th>Status</th></tr>
                </ng-template>
                <ng-template pTemplate="body" let-kri>
                  <tr>
                    <td>{{ kri.name || kri.kri_name }}</td>
                    <td>{{ kri.current_value }}</td>
                    <td>{{ kri.threshold }}</td>
                    <td>
                      <i class="pi" [ngClass]="kri.trend === 'up' ? 'pi-arrow-up text-red-500' : kri.trend === 'down' ? 'pi-arrow-down text-green-500' : 'pi-minus text-yellow-500'"></i>
                      {{ kri.trend }}
                    </td>
                    <td><p-tag [value]="kri.status || (kri.current_value > kri.threshold ? 'Breached' : 'Normal')" [severity]="kri.current_value > kri.threshold ? 'danger' : 'success'" /></td>
                  </tr>
                </ng-template>
              </p-table>
            } @else {
              <div class="text-center text-color-secondary p-4">
                @if (selectedRiskId) { No KRI trend data available for this risk. }
                @else { Select a risk to view KRI trends. }
              </div>
            }
          </p-card>
        </div>
        <div class="col-4">
          <p-card [header]="i18n.translate('riskScoring.riskPosture')">
            <div class="grid">
              @for (zone of zones; track zone.name) {
                <div class="col-12 mb-2">
                  <div class="flex justify-content-between align-items-center">
                    <p-tag [value]="zone.name" [severity]="zone.severity" />
                    <strong>{{ zone.count }}</strong>
                  </div>
                </div>
              }
            </div>
          </p-card>
          <p-card header="Scoring models" styleClass="mt-3">
            @if (modelsLoading) {
              <p-skeleton width="100%" height="2rem" class="mb-2" />
              <p-skeleton width="100%" height="2rem" class="mb-2" />
              <p-skeleton width="80%" height="2rem" />
            } @else if (scoringModels.length > 0) {
              @for (m of scoringModels; track m.modelId) {
                <div class="mb-2 p-2 surface-ground border-round">
                  <div class="font-medium">{{ m.nameEn || m.name }}</div>
                  <div class="text-sm text-color-secondary">{{ (m.dimensions || []).length }} dimension(s)</div>
                </div>
              }
            } @else {
              <p class="text-color-secondary mb-0">No scoring models configured</p>
            }
          </p-card>
          <p-card [header]="i18n.translate('riskScoring.aiRecommendations')" styleClass="mt-3">
            @for (rec of recommendations; track $index) {
              <div class="mb-2 p-2 surface-ground border-round">{{ rec }}</div>
            }
            @if (recommendations.length === 0) {
              <p class="text-color-secondary">No recommendations yet</p>
            }
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .heatmap-grid { display: flex; flex-direction: column; gap: 2px; max-width: 400px; margin: 0 auto; }
    .heatmap-skeleton .heatmap-row { display: flex; gap: 2px; }
    .heatmap-row { display: flex; gap: 2px; }
    .heatmap-cell { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-xs); font-weight: 700; color: white; cursor: pointer; }
    .heatmap-label { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
  `]
})
export class RiskScoringComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  loadError = false;
  kriLoading = false;
  modelsLoading = false;
  risks: GrcRecord[] = [];
  zones: GrcRecord[] = [];
  recommendations: string[] = [];
  kriTrends: GrcRecord[] = [];
  scoringModels: GrcRecord[] = [];
  selectedRiskId: string | null = null;
  riskOptions: { label: string; value: string }[] = [];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  loadPosture(): void {
    this.loadError = false;
    this.loading = true;
    this.cdr.markForCheck();
    this.loadModels();
    this.apiclientSvc.get('/risk-scoring/posture').subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.risks = data?.risks ?? data?.topRisks ?? [];
        const byZone = data?.byZone;
        this.zones = [
          { name: 'Critical', severity: 'danger', count: byZone?.critical ?? this.risks.filter((r) => r.zone === 'critical').length },
          { name: 'High', severity: 'warning', count: byZone?.high ?? this.risks.filter((r) => r.zone === 'high').length },
          { name: 'Medium', severity: 'info', count: byZone?.medium ?? this.risks.filter((r) => r.zone === 'medium').length },
          { name: 'Low', severity: 'success', count: byZone?.low ?? this.risks.filter((r) => r.zone === 'low').length },
        ];
        this.recommendations = data?.recommendations ?? [];
        this.riskOptions = this.risks.map((r) => ({
          label: r.title || r.riskId || r.risk_id || '—',
          value: r.riskId ?? r.risk_id,
        }));
        if (!this.selectedRiskId && this.riskOptions.length > 0) {
          this.selectedRiskId = this.riskOptions[0].value;
        }
        this.loading = false;
        this.cdr.markForCheck();
        this.loadKRITrends();
      },
      error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); }
    });
  }

  retry(): void {
    this.loadPosture();
  }

  ngOnInit() {
    this.loadPosture();
  }

  loadModels() {
    this.modelsLoading = true;
    this.apiclientSvc.get('/risk-scoring/models').subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.scoringModels = Array.isArray(data) ? data : (data?.models ?? []);
        this.modelsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.modelsLoading = false; this.cdr.markForCheck(); }
    });
  }

  onRiskSelected() {
    this.loadKRITrends();
  }

  loadKRITrends() {
    const riskId = this.selectedRiskId ?? this.risks?.[0]?.riskId ?? this.risks?.[0]?.risk_id;
    if (!riskId) {
      this.kriTrends = [];
      this.kriLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.kriLoading = true;
    this.apiclientSvc.get(`/risk-scoring/risks/${riskId}/kri-trends`).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        const raw = data?.trends ?? data ?? [];
        // Backend returns { date, score, zone }[]; map to table shape { name, current_value, threshold, trend, status }
        let prev: number | null = null;
        this.kriTrends = (Array.isArray(raw) ? raw : []).map((t) => {
          const score = Number(t?.score ?? t?.current_value ?? 0);
          const trend = prev !== null ? (score > prev ? 'up' : score < prev ? 'down' : 'flat') : 'flat';
          prev = score;
          return {
            name: t?.date ?? t?.name ?? '—',
            kri_name: t?.date ?? t?.name,
            current_value: score,
            threshold: t?.threshold ?? '—',
            trend,
            status: t?.zone ?? t?.status ?? 'Normal',
          };
        });
        this.kriLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.kriLoading = false; this.cdr.markForCheck(); }
    });
  }
  exportPDF() { this.operationsSvc.exportPDF('risk-scoring'); }
  exportExcel() { this.operationsSvc.exportExcel('risk-scoring'); }
  getCellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    const level = riskLevelFromScore(score);
    switch (level) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      default: return '#28a745';
    }
  }
  getCellCount(likelihood: number, impact: number): number {
    return this.risks.filter((r) => r.likelihood === likelihood && r.impact === impact).length;
  }
}
