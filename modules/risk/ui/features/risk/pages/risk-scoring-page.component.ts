import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { RISK_PRIMARY_TABS, RISK_TABS } from '@app/features/risk/risk.constants';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-risk-scoring-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, ModuleTabsBarComponent, ExportButtonComponent, CardModule, ButtonModule, TagModule, TableModule],
  template: `
    <app-page-shell icon="chart-bar"
      [title]="L().pageTitle"
      [subtitle]="L().pageSubtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().pageTitle]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="health-strip" *ngIf="!loading()">
        <div class="health-card">
          <div class="health-value">{{ totalRisks() }}</div>
          <div class="health-label">{{ L().total }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--error)">{{ zones()[0]?.count || 0 }}</div>
          <div class="health-label">{{ L().critical }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:#d97706">{{ zones()[1]?.count || 0 }}</div>
          <div class="health-label">{{ L().high }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--primary)">{{ zones()[2]?.count || 0 }}</div>
          <div class="health-label">{{ L().medium }}</div>
        </div>
        <div class="health-card">
          <div class="health-value" style="color:var(--success)">{{ zones()[3]?.count || 0 }}</div>
          <div class="health-label">{{ L().low }}</div>
        </div>
      </div>

      <div class="toolbar-row mb-3">
        <app-export-button module="risk-scoring" [label]="L().export" [data]="risks()" />
      </div>

      <!-- Interactive Score Calculator -->
      <p-card [header]="L().scoreCalculator" styleClass="mb-3">
        <div class="calc-grid">
          <div class="calc-slider">
            <label>{{ L().likelihood }} <strong>{{ calcLikelihood }}</strong></label>
            <input type="range" min="1" max="5" [(ngModel)]="calcLikelihood" (input)="calcScore()" class="slider-input" />
          </div>
          <div class="calc-slider">
            <label>{{ L().impact }} <strong>{{ calcImpact }}</strong></label>
            <input type="range" min="1" max="5" [(ngModel)]="calcImpact" (input)="calcScore()" class="slider-input" />
          </div>
          <div class="calc-slider">
            <label>{{ L().controlEff }} <strong>{{ calcEffectiveness }}%</strong></label>
            <input type="range" min="0" max="100" step="5" [(ngModel)]="calcEffectiveness" (input)="calcScore()" class="slider-input" />
          </div>
          <div class="calc-result">
            <div class="calc-box">
              <span class="calc-label">{{ L().inherentScore }}</span>
              <span class="calc-num" [style.color]="getCellColor(calcImpact, calcLikelihood)">{{ calcInherent }}</span>
            </div>
            <i class="pi pi-arrow-right calc-arrow"></i>
            <div class="calc-box">
              <span class="calc-label">{{ L().residualScore }}</span>
              <span class="calc-num" [style.color]="getCellColor(Math.ceil(calcResidual / 5), Math.ceil(calcResidual % 5 || 5))">{{ calcResidual }}</span>
            </div>
            <span class="calc-severity" [class]="'sev-' + calcSeverity">{{ calcSeverity | titlecase }}</span>
          </div>
        </div>
        <div class="calc-whatif" *ngIf="calcWhatIfDelta !== null">
          <span>{{ L().whatIf }} {{ L().likelihood }} {{ calcLikelihood }} → {{ calcLikelihood < 5 ? calcLikelihood + 1 : calcLikelihood }}:</span>
          <strong [style.color]="'var(--error)'">{{ calcInherent }} → {{ calcWhatIfDelta }}</strong>
          <p-button [label]="L().viewScenarios" icon="pi pi-sitemap" severity="secondary" [outlined]="true" size="small" (onClick)="navigateToScenarios()" styleClass="ms-auto" />
        </div>
      </p-card>

      <div class="scoring-grid">
        <div class="scoring-main">
          <p-card [header]="L().heatMap">
            <div class="heatmap-grid">
              @for (row of [5,4,3,2,1]; track row) {
                <div class="heatmap-row">
                  <div class="heatmap-label">{{ row }}</div>
                  @for (col of [1,2,3,4,5]; track col) {
                    <div class="heatmap-cell" [style.background]="getCellColor(row, col)"
                         [title]="'L:' + col + ' I:' + row + ' (' + getCellCount(col, row) + ' risks)'"
                         (click)="navigateHeatmapCell(col, row)">
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
            <div class="axis-label">{{ L().axisLabel }}</div>
            <div class="heatmap-links mt-3">
              <p-button [label]="L().viewFullHeatmap" icon="pi pi-th-large" severity="secondary" [outlined]="true" size="small" (onClick)="router.navigate(['/risk/heatmap'])" />
            </div>
          </p-card>
          <p-card [header]="L().kriTrends" styleClass="mt-3">
            <div *ngIf="kriLoading()" class="loading-spinner"><i class="pi pi-spin pi-spinner" style="font-size:2rem"></i></div>
            <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" *ngIf="!kriLoading() && kriTrends().length > 0" [value]="kriTrends()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr><th>KRI</th><th>{{ L().current }}</th><th>{{ L().threshold }}</th><th>{{ L().trend }}</th><th>{{ L().status }}</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-kri>
                <tr class="clickable" (click)="navigateToKRI(kri)">
                  <td>{{ kri.name || kri.kri_name }}</td>
                  <td>{{ kri.current_value }}</td>
                  <td>{{ kri.threshold }}</td>
                  <td>
                    <i class="pi" [ngClass]="kri.trend === 'up' ? 'pi-arrow-up text-danger' : kri.trend === 'down' ? 'pi-arrow-down text-success' : 'pi-minus text-muted'"></i>
                    {{ kri.trend }}
                  </td>
                  <td><p-tag [value]="kri.status || (kri.current_value > kri.threshold ? 'Breached' : 'Normal')" [severity]="kri.current_value > kri.threshold ? 'danger' : 'success'" /></td>
                </tr>
              </ng-template>
            </p-table>
            <div *ngIf="!kriLoading() && kriTrends().length === 0" class="empty-inline">{{ L().noKRI }}</div>
          </p-card>
        </div>
        <div class="scoring-sidebar">
          <p-card [header]="L().posture">
            @for (zone of zones(); track zone.name) {
              <div tabindex="0" role="button" (keyup.enter)="navigateToSeverity(zone.name)" class="posture-row clickable" (click)="navigateToSeverity(zone.name)">
                <p-tag [value]="zone.name" [severity]="zone.severity" />
                <strong>{{ zone.count }}</strong>
              </div>
            }
          </p-card>
          <p-card [header]="L().aiRec" styleClass="mt-3">
            @for (rec of recommendations(); track $index) {
              <div class="rec-item">{{ rec }}</div>
            }
            @if (recommendations().length === 0) { <p class="empty-inline">{{ L().noRec }}</p> }
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .health-strip { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .health-card { flex: 1; min-width: 120px; text-align: center; padding: 14px 8px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: default; transition: box-shadow .15s; }
    .health-card:hover { box-shadow: var(--shadow-card); }
    .health-value { font-size: var(--font-size-2xl); font-weight: 700; }
    .health-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: .5px; margin-top: 2px; }
    .toolbar-row { display: flex; align-items: center; gap: var(--space-md, 12px); }
    .mb-3 { margin-bottom: var(--space-md, 12px); }
    .mt-3 { margin-top: var(--space-md, 12px); }
    .scoring-grid { display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-lg, 16px); }
    @media (max-width: 900px) { .scoring-grid { grid-template-columns: 1fr; } }
    .scoring-main { min-width: 0; }
    .scoring-sidebar { min-width: 0; }
    .heatmap-grid { display: flex; flex-direction: column; gap: 2px; max-width: 400px; margin: 0 auto; direction: ltr; }
    .heatmap-row { display: flex; gap: 2px; }
    .heatmap-cell { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-xs); font-weight: 700; color: white; cursor: pointer; }
    .heatmap-label { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
    .axis-label { text-align: center; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--space-sm, 8px); }
    .posture-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle, var(--border-subtle)); }
    .rec-item { padding: 8px; margin-bottom: 8px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-sm, 4px); font-size: var(--font-size-sm); }
    .loading-spinner { text-align: center; padding: var(--space-lg, 16px); }
    .text-danger { color: var(--error); }
    .text-success { color: var(--success); }
    .text-muted { color: var(--text-muted, var(--text-muted)); }
    .empty-inline { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: var(--space-md, 12px) 0; }
    .clickable { cursor: pointer; }
    .clickable:hover { background: var(--surface-ice, rgba(0,0,0,.03)); }
    .ms-auto { margin-inline-start: auto; }
    .heatmap-links { text-align: center; }
    .calc-grid { display: flex; flex-wrap: wrap; gap: var(--space-lg, 16px); align-items: center; }
    .calc-slider { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 4px; }
    .calc-slider label { font-size: var(--font-size-sm); font-weight: 500; }
    .slider-input { width: 100%; accent-color: var(--primary); }
    .calc-result { display: flex; align-items: center; gap: var(--space-md, 12px); flex-wrap: wrap; }
    .calc-box { display: flex; flex-direction: column; align-items: center; background: var(--surface-ice, #f5f5f5); border-radius: var(--radius-md); padding: 10px 16px; min-width: 80px; }
    .calc-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: uppercase; }
    .calc-num { font-size: var(--font-size-2xl); font-weight: 700; }
    .calc-arrow { color: var(--text-muted); font-size: 1.2rem; }
    .calc-severity { font-size: var(--font-size-sm); font-weight: 700; padding: 4px 10px; border-radius: var(--radius-lg); }
    .sev-critical { background: rgba(239,68,68,.12); color: var(--error); }
    .sev-high { background: rgba(245,158,11,.12); color: #d97706; }
    .sev-medium { background: rgba(59,130,246,.12); color: var(--primary); }
    .sev-low { background: rgba(34,197,94,.12); color: var(--success); }
    .calc-whatif { display: flex; align-items: center; gap: var(--space-md, 12px); margin-top: var(--space-md, 12px); padding-top: var(--space-md, 12px); border-top: 1px solid var(--border-subtle); font-size: var(--font-size-sm); flex-wrap: wrap; }
  `]
})
export class RiskScoringPageComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  public router = inject(Router);
  public i18n = inject(I18nService);

  Math = Math;
  loading = signal(false);
  kriLoading = signal(false);
  risks = signal<Record<string, any>[]>([]);
  zones = signal<Record<string, any>[]>([]);
  recommendations = signal<string[]>([]);
  kriTrends = signal<Record<string, any>[]>([]);
  totalRisks = computed(() => this.risks().length);

  tabs = RISK_TABS;
  L = computed(() => this.i18n.isAr() ? AR : EN);

  ngOnInit() {
    this.loadScoring();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadScoring());
  }

  private loadScoring(): void {
    this.loading.set(true);
    this.api.getRegister({}).subscribe({
      next: (data: any) => {
        const r = data.risks || [];
        this.risks.set(r);
        this.zones.set([
          { name: 'Critical', severity: 'danger', count: r.filter((x: Record<string, any>) => (x.inherentScore || x.zone === 'critical') && (x.inherentScore >= 20)).length || r.filter((x: Record<string, any>) => x.zone === 'critical').length },
          { name: 'High', severity: 'warning', count: r.filter((x: Record<string, any>) => x.inherentScore >= 12 && x.inherentScore < 20).length || r.filter((x: Record<string, any>) => x.zone === 'high').length },
          { name: 'Medium', severity: 'info', count: r.filter((x: Record<string, any>) => x.inherentScore >= 5 && x.inherentScore < 12).length || r.filter((x: Record<string, any>) => x.zone === 'medium').length },
          { name: 'Low', severity: 'success', count: r.filter((x: Record<string, any>) => x.inherentScore < 5).length || r.filter((x: Record<string, any>) => x.zone === 'low').length },
        ]);
        this.recommendations.set(data.recommendations || []);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
    this.loadKRITrends();
  }

  loadKRITrends() {
    this.kriLoading.set(true);
    this.api.getKRITrends().subscribe({
      next: (data: any) => { this.kriTrends.set(Array.isArray(data) ? data : data.trends || []); this.kriLoading.set(false); },
      error: () => { this.kriLoading.set(false); }
    });
  }

  getCellColor(impact: number, likelihood: number): string {
    const score = impact * likelihood;
    if (score >= 16) return '#dc3545';
    if (score >= 9) return '#fd7e14';
    if (score >= 4) return '#ffc107';
    return '#28a745';
  }

  getCellCount(likelihood: number, impact: number): number {
    return this.risks().filter((r: Record<string, any>) => r.likelihood === likelihood && r.impact === impact).length;
  }

  // Interactive calculator
  calcLikelihood = 3;
  calcImpact = 3;
  calcEffectiveness = 50;
  calcInherent = 9;
  calcResidual = 5;
  calcSeverity = 'medium';
  calcWhatIfDelta: number | null = null;

  calcScore(): void {
    this.calcInherent = this.calcLikelihood * this.calcImpact;
    this.calcResidual = Math.max(1, Math.round(this.calcInherent * (1 - this.calcEffectiveness / 100)));
    this.calcSeverity = this.calcResidual >= 20 ? 'critical' : this.calcResidual >= 12 ? 'high' : this.calcResidual >= 5 ? 'medium' : 'low';
    const nextL = Math.min(5, this.calcLikelihood + 1);
    this.calcWhatIfDelta = nextL * this.calcImpact;
  }

  navigateHeatmapCell(likelihood: number, impact: number): void {
    this.router.navigate(['/risk/register'], { queryParams: { likelihood: likelihood.toString(), impact: impact.toString() } });
  }

  navigateToSeverity(zone: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { severity: zone.toLowerCase() } });
  }

  navigateToKRI(kri: Record<string, any>): void {
    this.router.navigate(['/risk/kris'], { queryParams: { kriId: kri.kri_id || kri.id } });
  }

  navigateToScenarios(): void {
    this.router.navigate(['/risk/scenarios']);
  }
}

const EN = {
  pageTitle: 'Risk Scoring', pageSubtitle: 'Configurable risk models, heat maps, and KRI trends',
  heatMap: 'Risk Heat Map', axisLabel: 'Likelihood → | Impact ↑',
  kriTrends: 'KRI Trends', current: 'Current', threshold: 'Threshold', trend: 'Trend', status: 'Status',
  noKRI: 'No KRI trend data available',
  posture: 'Risk Posture', aiRec: 'AI Recommendations', noRec: 'No recommendations yet',
  total: 'Total', critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', export: 'Export',
  scoreCalculator: 'Interactive Score Calculator', likelihood: 'Likelihood', impact: 'Impact',
  controlEff: 'Control Effectiveness', inherentScore: 'Inherent', residualScore: 'Residual',
  whatIf: 'What if', viewScenarios: 'Full Scenarios', viewFullHeatmap: 'View Full Heatmap',
};

const AR: typeof EN = {
  pageTitle: 'تقييم المخاطر', pageSubtitle: 'نماذج المخاطر القابلة للتكوين وخرائط الحرارة واتجاهات المؤشرات',
  heatMap: 'خريطة حرارة المخاطر', axisLabel: 'الاحتمالية → | التأثير ↑',
  kriTrends: 'اتجاهات المؤشرات', current: 'الحالي', threshold: 'الحد', trend: 'الاتجاه', status: 'الحالة',
  noKRI: 'لا تتوفر بيانات اتجاهات المؤشرات',
  posture: 'وضع المخاطر', aiRec: 'توصيات الذكاء الاصطناعي', noRec: 'لا توجد توصيات بعد',
  total: 'الإجمالي', critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض', export: 'تصدير',
  scoreCalculator: 'حاسبة الدرجات التفاعلية', likelihood: 'الاحتمالية', impact: 'التأثير',
  controlEff: 'فعالية الضوابط', inherentScore: 'الجوهري', residualScore: 'المتبقي',
  whatIf: 'ماذا لو', viewScenarios: 'السيناريوهات الكاملة', viewFullHeatmap: 'عرض الخريطة الكاملة',
};
