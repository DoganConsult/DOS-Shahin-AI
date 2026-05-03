import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

interface BowTieNode {
  id: string;
  name: string;
  likelihood?: number;
  impact?: number;
  effectiveness?: number;
}

interface BowTieModel {
  riskId: string;
  riskTitle: string;
  threats: BowTieNode[];
  preventiveControls: BowTieNode[];
  consequences: BowTieNode[];
  mitigatingControls: BowTieNode[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-bowtie',
    imports: [CommonModule, AppNumberPipe, FormsModule, PageShellComponent, ModuleTabsBarComponent, SelectModule, ButtonModule],
    template: `
    <app-page-shell icon="share-alt"
      [title]="L().pageTitle"
      [subtitle]="L().pageSubtitle"
      [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbRisk'), L().pageTitle]"
      [loading]="loading()">

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="page-toolbar">
        <div class="risk-selector">
          <p-select [(ngModel)]="selectedRiskId" [options]="riskOptions()" optionLabel="label" optionValue="value" [filter]="true" filterBy="label" [placeholder]="L().selectRisk" styleClass="risk-dropdown" appendTo="body" />
          <button class="load-btn" (click)="loadBowTie()" [disabled]="!selectedRiskId || loading()">
            <i class="pi pi-eye" aria-hidden="true"></i>
            {{ L().load }}
          </button>
          <p-button [label]="L().viewScenarios" icon="pi pi-sitemap" severity="secondary" [outlined]="true" size="small" (onClick)="router.navigate(['/risk/scenarios'])" />
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state" aria-live="polite" role="status" aria-busy="true">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
        </div>
      } @else if (!model()) {
        <div class="empty-state">
          <i class="pi pi-share-alt" aria-hidden="true"></i>
          <p>{{ i18n.direction() === 'rtl' ? 'أدخل معرف مخاطرة لعرض مخطط ربطة العنقود' : 'Enter a risk ID to visualize the bow-tie diagram' }}</p>
        </div>
      } @else {
        <div class="bowtie-container" role="img" [attr.aria-label]="(i18n.direction() === 'rtl' ? 'مخطط ربطة العنقود لـ ' : 'Bow-tie diagram for ') + model()!.riskTitle">
          <div class="bowtie-title">
            <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
            {{ model()!.riskTitle }}
          </div>

          <div class="bowtie-layout">
            <!-- Left: Threats -->
            <div class="bowtie-side left-side">
              <div class="side-label">{{ i18n.direction() === 'rtl' ? 'التهديدات' : 'Threats' }}</div>
              <div class="nodes-list">
                @for (threat of model()!.threats; track threat.id) {
                  <div class="bowtie-node threat-node">
                    <span class="node-name">{{ threat.name }}</span>
                    @if (threat.likelihood !== undefined) {
                      <span class="node-badge likelihood-badge">
                        {{ i18n.direction() === 'rtl' ? 'ا:' : 'L:' }}{{ threat.likelihood | appNumber:'decimal':'1.1-1' }}
                      </span>
                    }
                  </div>
                }
                @if (!model()!.threats.length) {
                  <div class="no-data">{{ i18n.direction() === 'rtl' ? 'لا توجد تهديدات مرتبطة' : 'No threats mapped' }}</div>
                }
              </div>
            </div>

            <!-- Left arrow + Preventive controls -->
            <div class="barrier-column">
              <div class="side-label">{{ i18n.direction() === 'rtl' ? 'ضوابط وقائية' : 'Preventive Controls' }}</div>
              <div class="barrier-nodes">
                @for (ctrl of model()!.preventiveControls; track ctrl.id) {
                  <div class="bowtie-node control-node preventive">
                    <i class="pi pi-shield" aria-hidden="true"></i>
                    <span class="node-name">{{ ctrl.name }}</span>
                    @if (ctrl.effectiveness !== undefined) {
                      <span class="eff-bar-wrap" [attr.aria-label]="'Effectiveness ' + (ctrl.effectiveness * 100 | appNumber:'decimal':'1.0-0') + '%'">
                        <span class="eff-bar" [style.width.%]="ctrl.effectiveness * 100"></span>
                      </span>
                    }
                  </div>
                }
                @if (!model()!.preventiveControls.length) {
                  <div class="no-data">—</div>
                }
              </div>
            </div>

            <!-- Centre: Risk event -->
            <div class="bowtie-centre">
              <div class="risk-event-circle">
                <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
                <span>{{ i18n.direction() === 'rtl' ? 'الحادثة' : 'Event' }}</span>
              </div>
            </div>

            <!-- Right: Mitigating controls -->
            <div class="barrier-column">
              <div class="side-label">{{ i18n.direction() === 'rtl' ? 'ضوابط تخفيفية' : 'Mitigating Controls' }}</div>
              <div class="barrier-nodes">
                @for (ctrl of model()!.mitigatingControls; track ctrl.id) {
                  <div class="bowtie-node control-node mitigating">
                    <i class="pi pi-shield" aria-hidden="true"></i>
                    <span class="node-name">{{ ctrl.name }}</span>
                    @if (ctrl.effectiveness !== undefined) {
                      <span class="eff-bar-wrap" [attr.aria-label]="'Effectiveness ' + (ctrl.effectiveness * 100 | appNumber:'decimal':'1.0-0') + '%'">
                        <span class="eff-bar" [style.width.%]="ctrl.effectiveness * 100"></span>
                      </span>
                    }
                  </div>
                }
                @if (!model()!.mitigatingControls.length) {
                  <div class="no-data">—</div>
                }
              </div>
            </div>

            <!-- Right: Consequences -->
            <div class="bowtie-side right-side">
              <div class="side-label">{{ i18n.direction() === 'rtl' ? 'العواقب' : 'Consequences' }}</div>
              <div class="nodes-list">
                @for (con of model()!.consequences; track con.id) {
                  <div class="bowtie-node consequence-node">
                    <span class="node-name">{{ con.name }}</span>
                    @if (con.impact !== undefined) {
                      <span class="node-badge impact-badge">
                        {{ i18n.direction() === 'rtl' ? 'ت:' : 'I:' }}{{ con.impact | appNumber:'decimal':'1.1-1' }}
                      </span>
                    }
                  </div>
                }
                @if (!model()!.consequences.length) {
                  <div class="no-data">{{ i18n.direction() === 'rtl' ? 'لا توجد عواقب مرتبطة' : 'No consequences mapped' }}</div>
                }
              </div>
            </div>
          </div>

          <div class="bowtie-legend">
            <span class="legend-item"><span class="leg-dot threat"></span> {{ i18n.direction() === 'rtl' ? 'تهديد' : 'Threat' }}</span>
            <span class="legend-item"><span class="leg-dot preventive"></span> {{ i18n.direction() === 'rtl' ? 'ضابط وقائي' : 'Preventive Control' }}</span>
            <span class="legend-item"><span class="leg-dot mitigating"></span> {{ i18n.direction() === 'rtl' ? 'ضابط تخفيفي' : 'Mitigating Control' }}</span>
            <span class="legend-item"><span class="leg-dot consequence"></span> {{ i18n.direction() === 'rtl' ? 'عاقبة' : 'Consequence' }}</span>
          </div>
        </div>
      }
    </app-page-shell>
  `,
    styles: [`
    .bowtie-page { padding: 24px; }
    .risk-dropdown { min-width: 300px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .page-toolbar h2 { margin: 0; font-size: 1.4rem; font-weight: 600; }
    .risk-selector { display: flex; gap: 8px; align-items: center; }
    .risk-id-input { padding: 9px 14px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); font-size: var(--font-size-body-sm); width: 260px; background: var(--surface-card, #fff); color: var(--text-color); }
    .load-btn { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: var(--primary-color, var(--primary)); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-body-sm); font-weight: 500; }
    .load-btn:disabled { opacity: .5; cursor: not-allowed; }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; color: var(--text-color-secondary); }
    .loading-state i, .empty-state i { font-size: var(--font-size-6xl); }
    .bowtie-container { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 1px 6px rgba(var(--color-black-rgb), .08); overflow-x: auto; }
    .bowtie-title { text-align: center; font-size: var(--font-size-body-md); font-weight: 700; color: var(--text-color); margin-bottom: 24px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .bowtie-title i { color: var(--error); }
    .bowtie-layout { display: flex; align-items: stretch; gap: 0; min-width: 800px; }
    .bowtie-side, .barrier-column { display: flex; flex-direction: column; align-items: stretch; }
    .bowtie-side { flex: 1.2; }
    .barrier-column { flex: 0.8; border-left: 2px dashed var(--surface-border, var(--border-subtle)); border-right: 2px dashed var(--surface-border, var(--border-subtle)); }
    .side-label { font-size: var(--font-size-caption); font-weight: 600; color: var(--text-color-secondary); text-align: center; padding: 6px 0 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    .nodes-list, .barrier-nodes { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 10px; align-items: stretch; }
    .bowtie-node { border-radius: var(--radius); padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; font-size: var(--font-size-tag); }
    .threat-node { background: #fee2e2; border-left: 3px solid var(--error); }
    .consequence-node { background: var(--status-warning-bg, #fcf4d6); border-right: 3px solid var(--warning); }
    .control-node { background: var(--surface-100, var(--surface-ice)); }
    .control-node.preventive { border-left: 3px solid var(--success); }
    .control-node.mitigating { border-right: 3px solid var(--primary); }
    .control-node i { color: var(--text-muted); font-size: var(--font-size-body-sm); }
    .node-name { font-weight: 600; color: var(--text-color); }
    .node-badge { display: inline-block; padding: 2px 6px; border-radius: var(--radius-xs); font-size: 0.72rem; font-weight: 700; }
    .likelihood-badge { background: #fee2e2; color: #b91c1c; }
    .impact-badge { background: #fef9c3; color: #854d0e; }
    .eff-bar-wrap { display: block; height: 5px; background: var(--border-subtle); border-radius: var(--radius-xs); margin-top: 4px; overflow: hidden; }
    .eff-bar { display: block; height: 100%; background: linear-gradient(90deg, var(--success), var(--primary)); border-radius: var(--radius-xs); }
    .bowtie-centre { flex: 0 0 100px; display: flex; align-items: center; justify-content: center; }
    .risk-event-circle { width: 80px; height: 80px; border-radius: var(--radius-pill); background: linear-gradient(135deg, var(--error), var(--error)); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-size: var(--font-size-xs); font-weight: 700; text-align: center; box-shadow: var(--shadow-md); }
    .risk-event-circle i { font-size: var(--font-size-body-lg); margin-bottom: 3px; }
    .no-data { font-size: var(--font-size-caption); color: var(--text-color-secondary); text-align: center; padding: 12px 0; font-style: italic; }
    .bowtie-legend { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; padding-top: 20px; border-top: 1px solid var(--surface-border, var(--border-subtle)); margin-top: 16px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .leg-dot { width: 10px; height: 10px; border-radius: var(--radius-pill); display: inline-block; }
    .leg-dot.threat { background: var(--error); }
    .leg-dot.preventive { background: var(--success); }
    .leg-dot.mitigating { background: var(--primary); }
    .leg-dot.consequence { background: var(--warning); }
  `]
})
export class RiskBowtieComponent implements OnInit {
  protected i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  public router = inject(Router);

  tabs = RISK_PRIMARY_TABS;
  L = computed(() => this.i18n.isAr() ? BT_AR : BT_EN);

  model = signal<BowTieModel | null>(null);
  loading = signal(false);
  selectedRiskId = '';
  riskOptions = signal<Array<{ label: string; value: string }>>([]);

  ngOnInit(): void {
    this.loadRiskOptions();
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadRiskOptions());
  }

  private loadRiskOptions(): void {
    this.api.getRegister({}).subscribe({
      next: (d: Record<string, any>) => this.riskOptions.set((d.risks || []).map((r: Record<string, any>) => ({ label: `${r.riskId} — ${r.title}`, value: r.riskId }))),
      error: () => {},
    });
  }

  navigateToControl(controlId: string): void {
    this.router.navigate(['/compliance/controls'], { queryParams: { id: controlId } });
  }

  navigateToRisk(riskId: string): void {
    this.router.navigate(['/risk/register'], { queryParams: { id: riskId } });
  }

  loadBowTie(): void {
    if (!this.selectedRiskId) return;
    this.loading.set(true);
    this.http.get<BowTieModel>(`/api/risk-quantification/${this.selectedRiskId}/bow-tie`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.model.set(res);
        this.loading.set(false);
      });
  }
}

const BT_EN = {
  pageTitle: 'Bow-Tie Analysis', pageSubtitle: 'Visual risk analysis with threats, controls, and consequences',
  selectRisk: 'Select a risk...', load: 'Load', viewScenarios: 'Monte Carlo Scenarios',
  threats: 'Threats', preventive: 'Preventive Controls', mitigating: 'Mitigating Controls',
  consequences: 'Consequences', event: 'Event',
  noThreats: 'No threats mapped', noConsequences: 'No consequences mapped',
  enterRisk: 'Select a risk to visualize the bow-tie diagram',
  threat: 'Threat', preventiveCtrl: 'Preventive Control', mitigatingCtrl: 'Mitigating Control', consequence: 'Consequence',
};

const BT_AR: typeof BT_EN = {
  pageTitle: 'تحليل ربطة القوس', pageSubtitle: 'تحليل بصري للمخاطر مع التهديدات والضوابط والعواقب',
  selectRisk: 'اختر مخاطرة...', load: 'تحميل', viewScenarios: 'سيناريوهات مونت كارلو',
  threats: 'التهديدات', preventive: 'ضوابط وقائية', mitigating: 'ضوابط تخفيفية',
  consequences: 'العواقب', event: 'الحادثة',
  noThreats: 'لا توجد تهديدات مرتبطة', noConsequences: 'لا توجد عواقب مرتبطة',
  enterRisk: 'اختر مخاطرة لعرض مخطط ربطة القوس',
  threat: 'تهديد', preventiveCtrl: 'ضابط وقائي', mitigatingCtrl: 'ضابط تخفيفي', consequence: 'عاقبة',
};
