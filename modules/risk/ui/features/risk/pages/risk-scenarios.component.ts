import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FocusTrapDirective } from '@app/shared/directives/focus-trap.directive';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { RISK_PRIMARY_TABS } from '@app/features/risk/risk.constants';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

interface RiskScenario {
  scenarioId: string;
  riskId: string;
  scenarioName: string;
  likelihoodOverride: number | null;
  impactOverride: number | null;
  assumptions: string[];
  computedScore: number | null;
  createdAt: string;
}

interface MonteCarloResult {
  meanLoss: number;
  p95Loss: number;
  p99Loss: number;
  var95: number;
  distribution: number[];
  iterations: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-scenarios',
    imports: [FocusTrapDirective, CommonModule, AppNumberPipe, FormsModule, PageShellComponent, ModuleTabsBarComponent, SelectModule, ButtonModule],
    template: `
    <app-page-shell icon="sitemap"
      [title]="L().pageTitle"
      [subtitle]="L().pageSubtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().pageTitle]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="page-toolbar">
        <div class="toolbar-actions">
          <button class="create-btn" (click)="showCreate = true">
            <i class="pi pi-plus" aria-hidden="true"></i>
            {{ L().newScenario }}
          </button>
          <p-button [label]="L().viewBowTie" icon="pi pi-share-alt" severity="secondary" [outlined]="true" size="small" (onClick)="router.navigate(['/risk/bowtie'])" />
        </div>
      </div>

      <div class="health-strip">
        <div class="hs-card">
          <span class="hs-num">{{ scenarios().length }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'إجمالي السيناريوهات' : 'Total Scenarios' }}</span>
        </div>
        <div class="hs-card">
          <span class="hs-num">{{ avgScore() | appNumber:'decimal':'1.1-1' }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'متوسط الدرجة' : 'Avg Score' }}</span>
        </div>
        <div class="hs-card highlight">
          <span class="hs-num">{{ highRiskCount() }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'مخاطر عالية' : 'High Risk' }}</span>
        </div>
      </div>

      @if (monteCarloResult()) {
        <div class="monte-carlo-panel">
          <div class="mc-header">
            <h3>{{ i18n.direction() === 'rtl' ? 'نتائج محاكاة مونت كارلو' : 'Monte Carlo Simulation Results' }}</h3>
            <span class="mc-iterations">{{ monteCarloResult()!.iterations.toLocaleString() }} {{ i18n.direction() === 'rtl' ? 'تكرار' : 'iterations' }}</span>
          </div>
          <div class="mc-metrics">
            <div class="mc-metric">
              <span class="metric-val">{{ monteCarloResult()!.meanLoss | appNumber:'decimal':'1.0-0' }}</span>
              <span class="metric-label">{{ i18n.direction() === 'rtl' ? 'متوسط الخسارة' : 'Mean Loss' }}</span>
            </div>
            <div class="mc-metric highlight">
              <span class="metric-val">{{ monteCarloResult()!.p95Loss | appNumber:'decimal':'1.0-0' }}</span>
              <span class="metric-label">P95 VaR</span>
            </div>
            <div class="mc-metric danger">
              <span class="metric-val">{{ monteCarloResult()!.p99Loss | appNumber:'decimal':'1.0-0' }}</span>
              <span class="metric-label">P99 VaR</span>
            </div>
          </div>
          <div class="distribution-bar">
            @for (bucket of distributionBuckets(); track $index) {
              <div class="dist-bucket" [style.height.%]="bucket.height"
                [title]="bucket.label" [attr.aria-label]="bucket.label"></div>
            }
          </div>
        </div>
      }

      @if (loading()) {
        <div class="loading-state" aria-live="polite" role="status" aria-busy="true">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        </div>
      } @else if (scenarios().length === 0) {
        <div class="empty-state">
          <i class="pi pi-sitemap" aria-hidden="true"></i>
          <p>{{ i18n.direction() === 'rtl' ? 'لا توجد سيناريوهات. أنشئ أول سيناريو لك.' : 'No scenarios yet. Create your first what-if scenario.' }}</p>
        </div>
      } @else {
        <div class="scenarios-list">
          @for (s of scenarios(); track s.scenarioId) {
            <div class="scenario-row">
              <div class="scenario-info">
                <span class="scenario-name">{{ s.scenarioName }}</span>
                <span class="scenario-meta">{{ i18n.direction() === 'rtl' ? 'المخاطرة:' : 'Risk:' }} {{ s.riskId }}</span>
              </div>
              <div class="scenario-overrides">
                @if (s.likelihoodOverride !== null) {
                  <span class="override-badge likelihood">
                    {{ i18n.direction() === 'rtl' ? 'الاحتمالية:' : 'L:' }} {{ s.likelihoodOverride }}
                  </span>
                }
                @if (s.impactOverride !== null) {
                  <span class="override-badge impact">
                    {{ i18n.direction() === 'rtl' ? 'التأثير:' : 'I:' }} {{ s.impactOverride }}
                  </span>
                }
              </div>
              @if (s.computedScore !== null) {
                <div class="score-chip" [class.score-high]="s.computedScore >= 15" [class.score-med]="s.computedScore >= 6 && s.computedScore < 15">
                  {{ s.computedScore | appNumber:'decimal':'1.1-1' }}
                </div>
              }
              <div class="scenario-actions">
                <button class="icon-btn" (click)="runMonteCarlo(s.riskId)"
                  [attr.aria-label]="i18n.direction() === 'rtl' ? 'تشغيل مونت كارلو' : 'Run Monte Carlo'">
                  <i class="pi pi-chart-line" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      @if (showCreate) {
        <div class="modal-overlay" role="dialog" aria-modal="true" appFocusTrap (keydown.escape)="showCreate = false">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ i18n.direction() === 'rtl' ? 'سيناريو ماذا لو' : 'What-If Scenario' }}</h3>
              <button class="close-btn" (click)="showCreate = false" aria-label="Close">
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <label for="scRiskId">{{ i18n.direction() === 'rtl' ? 'معرف المخاطرة' : 'Risk ID' }}</label>
              <input id="scRiskId" class="form-input" [(ngModel)]="newScenario.riskId"
                placeholder="e.g. risk-uuid" aria-label="e.g. risk-uuid" aria-required="true" />

              <label for="scName">{{ i18n.direction() === 'rtl' ? 'اسم السيناريو' : 'Scenario Name' }}</label>
              <input id="scName" class="form-input" [(ngModel)]="newScenario.scenarioName"
                [placeholder]="i18n.direction() === 'rtl' ? 'مثال: سيناريو التهديد الإلكتروني' : 'e.g. Cyber threat escalation'" [attr.aria-label]="i18n.direction() === 'rtl' ? 'مثال: سيناريو التهديد الإلكتروني' : 'e.g. Cyber threat escalation'"
                aria-required="true" />

              <label for="scLikelihood">{{ i18n.direction() === 'rtl' ? 'تعديل الاحتمالية (1-5)' : 'Likelihood Override (1-5)' }}</label>
              <input id="scLikelihood" type="number" min="1" max="5" class="form-input" [(ngModel)]="newScenario.likelihoodOverride" />

              <label for="scImpact">{{ i18n.direction() === 'rtl' ? 'تعديل التأثير (1-5)' : 'Impact Override (1-5)' }}</label>
              <input id="scImpact" type="number" min="1" max="5" class="form-input" [(ngModel)]="newScenario.impactOverride" />
            </div>
            <div class="modal-footer">
              <button class="action-btn secondary" (click)="showCreate = false">
                {{ i18n.direction() === 'rtl' ? 'إلغاء' : 'Cancel' }}
              </button>
              <button class="action-btn primary" (click)="createScenario()" [disabled]="!newScenario.riskId || !newScenario.scenarioName">
                {{ i18n.direction() === 'rtl' ? 'تشغيل التحليل' : 'Run Analysis' }}
              </button>
            </div>
          </div>
        </div>
      }
    </app-page-shell>
  `,
    styles: [`
    .scenarios-page { padding: 24px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-toolbar h2 { margin: 0; font-size: 1.4rem; font-weight: 600; }
    .toolbar-actions { display: flex; gap: 8px; }
    .create-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary-color, var(--primary)); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-body-sm); font-weight: 500; }
    .health-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .hs-card { background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 14px 20px; display: flex; flex-direction: column; align-items: center; min-width: 120px; box-shadow: var(--shadow-sm); }
    .hs-card.highlight { border: 2px solid var(--error)44; }
    .hs-num { font-size: 1.6rem; font-weight: 700; color: var(--text-color); }
    .hs-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .monte-carlo-panel { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow-sm); border-top: 3px solid var(--primary-color, var(--primary)); }
    .mc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .mc-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .mc-iterations { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .mc-metrics { display: flex; gap: 24px; margin-bottom: 16px; flex-wrap: wrap; }
    .mc-metric { display: flex; flex-direction: column; align-items: center; }
    .mc-metric.highlight .metric-val { color: var(--warning); }
    .mc-metric.danger .metric-val { color: var(--error); }
    .metric-val { font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-color); }
    .metric-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .distribution-bar { display: flex; align-items: flex-end; gap: 2px; height: 60px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-sm); padding: 4px; }
    .dist-bucket { flex: 1; background: var(--primary-color, var(--primary)); border-radius: var(--radius-xs); min-height: 2px; opacity: 0.7; transition: opacity .15s; }
    .dist-bucket:hover { opacity: 1; }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--text-color-secondary); }
    .loading-state i, .empty-state i { font-size: var(--font-size-4xl); }
    .scenarios-list { display: flex; flex-direction: column; gap: 10px; }
    .scenario-row { display: flex; align-items: center; gap: 16px; background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 14px 18px; box-shadow: var(--shadow-sm); }
    .scenario-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .scenario-name { font-weight: 600; color: var(--text-color); }
    .scenario-meta { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .scenario-overrides { display: flex; gap: 6px; }
    .override-badge { padding: 3px 8px; border-radius: var(--radius-xl); font-size: var(--font-size-sm); font-weight: 600; }
    .likelihood { background: #eff6ff; color: #1d4ed8; }
    .impact { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .score-chip { padding: 6px 12px; border-radius: var(--radius-xl); font-weight: 700; font-size: var(--font-size-body-sm); background: var(--surface-100, var(--surface-ice)); color: var(--text-color); }
    .score-chip.score-high { background: #fee2e2; color: #b91c1c; }
    .score-chip.score-med { background: #fef9c3; color: #854d0e; }
    .scenario-actions { display: flex; gap: 4px; }
    .icon-btn { background: none; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); padding: 7px 10px; cursor: pointer; color: var(--text-color-secondary); }
    .icon-btn:hover { background: var(--surface-100, var(--surface-ice)); }
    .modal-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .5); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
    .modal-card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .modal-header h3 { margin: 0; font-size: var(--font-size-body-md); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-color-secondary); font-size: var(--font-size-body-lg); }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
    .modal-body label { font-size: var(--font-size-tag); font-weight: 500; color: var(--text-color-secondary); }
    .form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); color: var(--text-color); font-size: var(--font-size-body-sm); box-sizing: border-box; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radius); border: none; cursor: pointer; font-size: var(--font-size-body-sm); font-weight: 500; }
    .action-btn.primary { background: var(--primary-color, var(--primary)); color: #fff; }
    .action-btn.secondary { background: var(--surface-100, var(--surface-ice)); color: var(--text-color); }
    .action-btn:disabled { opacity: .5; cursor: not-allowed; }
  `]
})
export class RiskScenariosComponent implements OnInit {
  protected i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  public router = inject(Router);

  tabs = RISK_PRIMARY_TABS;
  L = computed(() => this.i18n.isAr() ? SC_AR : SC_EN);

  scenarios = signal<RiskScenario[]>([]);
  riskOptions = signal<Array<{ label: string; value: string }>>([]);
  loading = signal(true);
  monteCarloResult = signal<MonteCarloResult | null>(null);
  showCreate = false;

  newScenario: Partial<RiskScenario & { iterations: number }> = {
    riskId: '',
    scenarioName: '',
    likelihoodOverride: null,
    impactOverride: null,
    assumptions: [],
    iterations: 10000,
  };

  avgScore = computed(() => {
    const s = this.scenarios().filter(sc => sc.computedScore !== null);
    if (!s.length) return 0;
    return s.reduce((a, b) => a + (b.computedScore ?? 0), 0) / s.length;
  });

  highRiskCount = computed(() =>
    this.scenarios().filter(s => (s.computedScore ?? 0) >= 15).length
  );

  distributionBuckets = computed((): Array<{ height: number; label: string }> => {
    const dist = this.monteCarloResult()?.distribution ?? [];
    if (!dist.length) return [];
    const max = Math.max(...dist);
    const bucketSize = Math.max(1, Math.floor(dist.length / 40));
    const buckets: Array<{ height: number; label: string }> = [];
    for (let i = 0; i < dist.length; i += bucketSize) {
      const slice = dist.slice(i, i + bucketSize);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      buckets.push({ height: max > 0 ? (avg / max) * 100 : 0, label: `≈ ${Math.round(avg).toLocaleString()}` });
    }
    return buckets;
  });

  ngOnInit(): void {
    this.loadScenariosAndRisks();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadScenariosAndRisks());
  }

  private loadScenariosAndRisks(): void {
    this.loading.set(true);
    this.http.get<{ data: RiskScenario[] }>('/api/risk-quantification/scenarios')
      .pipe(catchError(() => of({ data: [] })))
      .subscribe(res => {
        this.scenarios.set(res.data ?? []);
        this.loading.set(false);
      });
    this.api.getRegister({}).subscribe({
      next: (d: Record<string, any>) => this.riskOptions.set((d.risks || []).map((r: Record<string, any>) => ({ label: `${r.riskId} — ${r.title}`, value: r.riskId }))),
      error: () => {},
    });
  }

  navigateToRisk(riskId: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { id: riskId } });
  }

  createScenario(): void {
    if (!this.newScenario.riskId || !this.newScenario.scenarioName) return;
    const payload = {
      riskId: this.newScenario.riskId,
      scenarioName: this.newScenario.scenarioName,
      likelihoodOverride: this.newScenario.likelihoodOverride,
      impactOverride: this.newScenario.impactOverride,
      assumptions: this.newScenario.assumptions,
    };
    this.http.post<{ scenario: RiskScenario; monteCarlo: MonteCarloResult }>(
      `/api/risk-quantification/${this.newScenario.riskId}/scenario`,
      payload,
    ).pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) {
          if (res.scenario) this.scenarios.update(s => [res.scenario, ...s]);
          if (res.monteCarlo) this.monteCarloResult.set(res.monteCarlo);
        }
        this.showCreate = false;
        this.newScenario = { riskId: '', scenarioName: '', likelihoodOverride: null, impactOverride: null, assumptions: [], iterations: 10000 };
      });
  }

  runMonteCarlo(riskId: string): void {
    this.http.post<MonteCarloResult>(`/api/risk-quantification/${riskId}/monte-carlo`, { iterations: 10000 })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res) this.monteCarloResult.set(res);
      });
  }
}

const SC_EN = {
  pageTitle: 'Scenarios', pageSubtitle: 'What-if scenario analysis and Monte Carlo simulation',
  newScenario: 'New Scenario', viewBowTie: 'View Bow-Tie',
  totalScenarios: 'Total Scenarios', avgScore: 'Avg Score', highRisk: 'High Risk',
  monteCarloTitle: 'Monte Carlo Simulation Results', iterations: 'iterations',
  meanLoss: 'Mean Loss', noScenarios: 'No scenarios yet. Create your first what-if scenario.',
  riskLabel: 'Risk:', likelihoodLabel: 'L:', impactLabel: 'I:',
  whatIfTitle: 'What-If Scenario', riskId: 'Risk ID', scenarioName: 'Scenario Name',
  likelihoodOverride: 'Likelihood Override (1-5)', impactOverride: 'Impact Override (1-5)',
  cancel: 'Cancel', runAnalysis: 'Run Analysis', runMonteCarlo: 'Run Monte Carlo',
  threats: 'Threats', event: 'Event',
};

const SC_AR: typeof SC_EN = {
  pageTitle: 'السيناريوهات', pageSubtitle: 'تحليل سيناريوهات ماذا لو ومحاكاة مونت كارلو',
  newScenario: 'سيناريو جديد', viewBowTie: 'عرض ربطة القوس',
  totalScenarios: 'إجمالي السيناريوهات', avgScore: 'متوسط الدرجة', highRisk: 'مخاطر عالية',
  monteCarloTitle: 'نتائج محاكاة مونت كارلو', iterations: 'تكرار',
  meanLoss: 'متوسط الخسارة', noScenarios: 'لا توجد سيناريوهات. أنشئ أول سيناريو لك.',
  riskLabel: 'المخاطرة:', likelihoodLabel: 'ا:', impactLabel: 'ت:',
  whatIfTitle: 'سيناريو ماذا لو', riskId: 'معرف المخاطرة', scenarioName: 'اسم السيناريو',
  likelihoodOverride: 'تعديل الاحتمالية (1-5)', impactOverride: 'تعديل التأثير (1-5)',
  cancel: 'إلغاء', runAnalysis: 'تشغيل التحليل', runMonteCarlo: 'تشغيل مونت كارلو',
  threats: 'التهديدات', event: 'الحادثة',
};
