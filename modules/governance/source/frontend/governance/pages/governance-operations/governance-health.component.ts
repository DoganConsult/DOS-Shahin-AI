import { Component, OnInit, computed, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { GOVERNANCE_TABS } from '../../governance.constants';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-health',
    imports: [CommonModule, AppNumberPipe, FormsModule, RouterModule, PageHeaderComponent, ModuleTabsBarComponent, ButtonModule, ToastModule, TagModule, ProgressBarModule],
    providers: [MessageService],
    template: `
    <div class="gov-page" [attr.dir]="dir()">
      <app-page-header titleEn="Health Score" titleAr="مؤشر الصحة" subtitleEn="8-dimension governance health assessment" subtitleAr="تقييم صحة الحوكمة عبر 8 أبعاد" icon="heartbeat"
        [breadcrumbs]="[i18n.translate('Dashboard'), i18n.translate('Governance'), i18n.translate('Health Score')]" [actions]="headerActions" [isAr]="i18n.currentLang() === 'ar'" [dir]="dir()" (actionClick)="onHeaderAction($event)" />
      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.currentLang() === 'ar'" />
      <div class="gov-body">
        <p-toast />
        <div class="overall-card">
          <div class="overall-score" [style.color]="gradeColor(score.overall_grade)">{{ score.overall_score | appNumber:'decimal':'1.1-1' }}</div>
          <div class="overall-label">{{ i18n.translate('Overall Score') }}</div>
          <p-tag [value]="(score.overall_grade || 'red').toUpperCase()" [severity]="score.overall_grade === 'green' ? 'success' : score.overall_grade === 'yellow' ? 'warning' : 'danger'" />
          <div class="trend-indicator" *ngIf="score.trend !== null && score.trend !== undefined">
            <span [style.color]="score.trend >= 0 ? 'var(--success)' : 'var(--error)'">
              <i class="pi" [ngClass]="score.trend >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'" ></i>
              {{ score.trend > 0 ? '+' : '' }}{{ score.trend | appNumber:'decimal':'1.1-1' }}
            </span>
            <span class="trend-label">{{ i18n.translate('vs previous') }}</span>
          </div>
          <p-button [label]="i18n.translate('Recalculate')" icon="pi pi-refresh" styleClass="p-button-outlined p-button-sm" (onClick)="recalculate()" [style]="{'margin-top':'12px'}" />
        </div>
        <div class="dims-grid">
          <div class="dim-card" *ngFor="let d of dimensions">
            <div class="dim-label">{{ i18n.localize(d.labelEn, d.labelAr) }}</div>
            <p-progressBar [value]="score[d.key] || 0" [showValue]="true" [style]="{height:'22px'}" />
          </div>
        </div>

        <div class="maturity-section">
          <h3 class="section-heading">{{ i18n.isAr() ? 'مستوى النضج' : 'Maturity Level' }}</h3>
          <div class="maturity-grid">
            <div class="maturity-card" *ngFor="let lvl of maturityLevels" [class.active]="lvl.threshold <= score.overall_score">
              <div class="maturity-level">{{ lvl.level }}</div>
              <div class="maturity-name">{{ i18n.isAr() ? lvl.nameAr : lvl.nameEn }}</div>
              <div class="maturity-desc">{{ i18n.isAr() ? lvl.descAr : lvl.descEn }}</div>
            </div>
          </div>
        </div>

        <div class="trend-section">
          <h3 class="section-heading">{{ i18n.isAr() ? 'الاتجاه عبر الزمن' : 'Trend Over Time' }}</h3>
          <div class="trend-chart">
            <div class="trend-bars">
              <div class="trend-bar-group" *ngFor="let point of trendHistory">
                <div class="trend-bar" [style.height.%]="point.score" [ngClass]="'bar-' + point.grade">
                  <span class="trend-bar-val">{{ point.score | appNumber:'decimal':'1.0-0' }}</span>
                </div>
                <span class="trend-bar-label">{{ point.date }}</span>
              </div>
            </div>
            <div class="trend-empty" *ngIf="trendHistory.length === 0">
              {{ i18n.isAr() ? 'لا توجد بيانات تاريخية بعد. أعد الحساب عدة مرات لبناء الاتجاه.' : 'No historical data yet. Recalculate multiple times to build trend.' }}
            </div>
          </div>
        </div>

        <div class="domain-map-section">
          <h3 class="section-heading">{{ i18n.isAr() ? 'خريطة النطاقات' : 'R/Y/G Domain Map' }}</h3>
          <div class="domain-map-grid">
            <div class="domain-map-card" *ngFor="let d of dimensions" [ngClass]="'dm-' + getDimensionGrade(d.key)">
              <div class="dm-indicator" [attr.aria-label]="getDimensionGrade(d.key) === 'green' ? 'Good' : getDimensionGrade(d.key) === 'yellow' ? 'Warning' : 'Critical'"></div>
              <div class="dm-body">
                <span class="dm-name">{{ i18n.isAr() ? d.labelAr : d.labelEn }}</span>
                <span class="dm-score">{{ score[d.key] || 0 | appNumber:'decimal':'1.0-0' }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="board-watchlist-section" *ngIf="boardWatchlist.length > 0">
          <h3 class="section-heading">{{ i18n.isAr() ? 'قائمة مراقبة المجلس' : 'Board Watchlist' }}</h3>
          <div class="watchlist-items">
            <div class="watchlist-item" *ngFor="let item of boardWatchlist">
              <i class="pi pi-exclamation-circle" style="color:var(--error)"></i>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div class="cross-links-section">
          <h3 class="section-heading">{{ i18n.isAr() ? 'روابط المنصة' : 'Cross-Module Links' }}</h3>
          <div class="cross-links-grid">
            <a class="cross-link-card" routerLink="/governance/overview">
              <i class="pi pi-home"></i>
              <span>{{ i18n.isAr() ? 'نظرة عامة' : 'Governance Overview' }}</span>
              <small>{{ i18n.isAr() ? 'العودة للوحة الرئيسية' : 'Back to main dashboard' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/policies">
              <i class="pi pi-file"></i>
              <span>{{ i18n.isAr() ? 'السياسات' : 'Policies' }}</span>
              <small>{{ i18n.isAr() ? 'تؤثر على صحة السياسات' : 'Impacts policy health score' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/committees">
              <i class="pi pi-users"></i>
              <span>{{ i18n.isAr() ? 'اللجان' : 'Committees' }}</span>
              <small>{{ i18n.isAr() ? 'تؤثر على فعالية اللجان' : 'Impacts committee effectiveness' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/actions">
              <i class="pi pi-bolt"></i>
              <span>{{ i18n.isAr() ? 'الإجراءات' : 'Actions' }}</span>
              <small>{{ i18n.isAr() ? 'تؤثر على التزام المواعيد' : 'Impacts action timeliness' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/governance/exceptions">
              <i class="pi pi-exclamation-triangle"></i>
              <span>{{ i18n.isAr() ? 'الاستثناءات' : 'Exceptions' }}</span>
              <small>{{ i18n.isAr() ? 'تؤثر على التعرض للاستثناءات' : 'Impacts exception exposure' }}</small>
            </a>
            <a class="cross-link-card" routerLink="/qiyas">
              <i class="pi pi-chart-bar"></i>
              <span>{{ i18n.isAr() ? 'قياس' : 'Qiyas' }}</span>
              <small>{{ i18n.isAr() ? 'نضج الحوكمة في قياس' : 'Governance maturity in Qiyas' }}</small>
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .gov-page { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .gov-body { flex: 1; padding: 16px 24px 32px; display: flex; flex-direction: column; gap: 16px; overflow: auto; }
    .overall-card { text-align: center; padding: 24px; background: var(--surface-card, #fff); border-radius: var(--radius-lg); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .overall-score { font-size: var(--font-size-6xl); font-weight: 800; }
    .overall-label { font-size: var(--font-size-base); color: var(--text-muted, var(--text-muted)); margin: 4px 0 8px; }
    .dims-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .dim-card { padding: 14px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .dim-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-heading, #111); margin-bottom: 8px; }
    .trend-indicator { margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: var(--font-size-base); font-weight: 600; }
    .trend-label { font-size: var(--font-size-xs); font-weight: 400; color: var(--text-muted, var(--text-muted)); }

    .section-heading { font-size: var(--font-size-md); font-weight: 700; margin: 8px 0 12px; color: var(--text-heading, #111); }
    .maturity-section { margin-top: 8px; }
    .maturity-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .maturity-card { padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff); opacity: 0.45; transition: all 0.2s; }
    .maturity-card.active { opacity: 1; border-color: var(--success); background: var(--status-success-bg, #defbe6); }
    .maturity-level { font-size: var(--font-size-2xl); font-weight: 800; color: var(--success); }
    .maturity-name { font-size: var(--font-size-sm); font-weight: 600; margin: 2px 0; }
    .maturity-desc { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); }

    .cross-links-section { margin-top: 8px; }
    .cross-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .cross-link-card {
      display: flex; flex-direction: column; gap: 4px; padding: 16px;
      border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md);
      background: var(--surface-card, #fff); text-decoration: none; color: inherit;
      transition: all 0.15s; cursor: pointer;
    }
    .cross-link-card:hover { box-shadow: var(--shadow-md); border-color: var(--primary-500, var(--primary)); transform: translateY(-2px); }
    .cross-link-card i { font-size: var(--font-size-xl); color: var(--primary-500, var(--primary)); margin-bottom: 4px; }
    .cross-link-card span { font-size: var(--font-size-base); font-weight: 600; }
    .cross-link-card small { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }

    .trend-section, .domain-map-section, .board-watchlist-section { margin-top: 8px; }
    .trend-chart { background: var(--surface-card, #fff); border-radius: var(--radius-lg); border: 1px solid var(--surface-border, var(--border-subtle)); padding: 16px; min-height: 200px; }
    .trend-bars { display: flex; align-items: flex-end; gap: 8px; height: 180px; padding: 0 8px; }
    .trend-bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .trend-bar { width: 100%; max-width: 48px; border-radius: var(--radius-sm) 6px 0 0; display: flex; align-items: flex-start; justify-content: center; min-height: 8px; transition: height 0.4s ease; }
    .trend-bar-val { font-size: var(--font-size-xs); font-weight: 700; color: #fff; padding-top: 4px; }
    .bar-green { background: var(--success); } .bar-yellow { background: var(--warning); } .bar-red { background: var(--error); }
    .trend-bar-label { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); white-space: nowrap; }
    .trend-empty { text-align: center; padding: 40px; color: var(--text-muted, #9ca3af); font-size: var(--font-size-sm); }
    .domain-map-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    .domain-map-card { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--surface-card, #fff); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .dm-indicator { width: 10px; height: 10px; border-radius: var(--radius-pill); flex-shrink: 0; }
    .dm-green .dm-indicator { background: var(--success); } .dm-yellow .dm-indicator { background: var(--warning); } .dm-red .dm-indicator { background: var(--error); }
    .dm-body { flex: 1; display: flex; justify-content: space-between; align-items: center; }
    .dm-name { font-size: var(--font-size-sm); font-weight: 600; } .dm-score { font-size: var(--font-size-base); font-weight: 700; }
    .watchlist-items { display: flex; flex-direction: column; gap: 8px; }
    .watchlist-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--status-danger-bg, #fff1f1); border-radius: var(--radius-md); border: 1px solid #fee2e2; font-size: var(--font-size-sm); font-weight: 500; }
  `]
})
export class GovernanceHealthComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  i18n = inject(I18nService);
 private msg = inject(MessageService);
  readonly dir = computed<'ltr'|'rtl'>(() => this.i18n.direction() as 'ltr'|'rtl');
  readonly tabs = GOVERNANCE_TABS;
  readonly headerActions: PageHeaderAction[] = [{ id: 'recalc', labelEn: 'Recalculate', labelAr: 'إعادة الحساب', icon: 'refresh' }];
  onHeaderAction(id: string): void { if (id === 'recalc') this.recalculate(); }

  dimensions = [
    { key: 'policy_health', labelEn: 'Policy Health', labelAr: 'صحة السياسات' },
    { key: 'accountability', labelEn: 'Accountability', labelAr: 'المساءلة' },
    { key: 'committee_effectiveness', labelEn: 'Committee Effectiveness', labelAr: 'فعالية اللجان' },
    { key: 'decision_execution', labelEn: 'Decision Execution', labelAr: 'تنفيذ القرارات' },
    { key: 'exception_exposure', labelEn: 'Exception Exposure', labelAr: 'التعرض للاستثناءات' },
    { key: 'action_timeliness', labelEn: 'Action Timeliness', labelAr: 'التزام المواعيد' },
    { key: 'mandate_validity', labelEn: 'Mandate Validity', labelAr: 'صلاحية التفويضات' },
    { key: 'review_discipline', labelEn: 'Review Discipline', labelAr: 'انضباط المراجعات' },
  ];

  score: Record<string, any> = { overall_score: 0, overall_grade: 'red', policy_health: 0, accountability: 0, committee_effectiveness: 0, decision_execution: 0, exception_exposure: 0, action_timeliness: 0, mandate_validity: 0, review_discipline: 0, trend: null };

  maturityLevels = [
    { level: 1, threshold: 0, nameEn: 'Initial', nameAr: 'أولي', descEn: 'Ad-hoc governance', descAr: 'حوكمة عشوائية' },
    { level: 2, threshold: 25, nameEn: 'Developing', nameAr: 'متطور', descEn: 'Basic structures defined', descAr: 'هياكل أساسية محددة' },
    { level: 3, threshold: 50, nameEn: 'Defined', nameAr: 'محدد', descEn: 'Formal processes in place', descAr: 'عمليات رسمية قائمة' },
    { level: 4, threshold: 75, nameEn: 'Managed', nameAr: 'مُدار', descEn: 'Measured and controlled', descAr: 'مُقاس ومُسيطر عليه' },
    { level: 5, threshold: 90, nameEn: 'Optimized', nameAr: 'مُحسّن', descEn: 'Continuous improvement', descAr: 'تحسين مستمر' },
  ];

  trendHistory: Record<string, any>[] = [];
  boardWatchlist: string[] = [];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.apiclientSvc.get('/governance/health').subscribe({ next: res => {
      this.score = res || this.score;
      this.buildBoardWatchlist();
    } });
    this.apiclientSvc.get('/governance/health/trend').subscribe({
      next: res => { this.trendHistory = (res.history || res || []).map((p: any) => ({ ...p, grade: p.score >= 75 ? 'green' : p.score >= 50 ? 'yellow' : 'red' })); },
      error: () => { this.trendHistory = []; }
    });
  }
  recalculate(): void {
    this.apiclientSvc.post('/governance/health/recalculate', {}).subscribe({
      next: res => {
        this.score = res || this.score;
        this.buildBoardWatchlist();
        this.load();
        this.msg.add({ severity: 'success', summary: this.i18n.translate('governance.healthScoreRecalculated') });
      },
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error') })
    });
  }
  gradeColor(grade: string): string { return grade === 'green' ? 'var(--success)' : grade === 'yellow' ? 'var(--warning)' : 'var(--error)'; }
  getDimensionGrade(key: string): string {
    const val = this.score[key] || 0;
    return val >= 75 ? 'green' : val >= 50 ? 'yellow' : 'red';
  }
  buildBoardWatchlist(): void {
    const items: string[] = [];
    for (const d of this.dimensions) {
      const val = this.score[d.key] || 0;
      if (val < 50) items.push(`${d.labelEn}: ${val}% — requires board attention`);
    }
    if (this.score.overall_score < 60) items.push(`Overall governance health critically low at ${this.score.overall_score}%`);
    this.boardWatchlist = items;
  }

}
