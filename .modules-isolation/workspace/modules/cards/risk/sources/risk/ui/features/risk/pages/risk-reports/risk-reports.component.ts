import { Component, OnInit, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RiskApiService } from '@app/features/risk/services/risk-api.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RISK_PRIMARY_TABS, getRiskSubTabs } from '@app/features/risk/risk.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { devError } from '@app/runtime/utils/dev-logger';

/**
 * Risk Reports page — per spec section 8.J.
 *
 * Report catalog with quick-launch cards for:
 *   Executive Risk Pack, Board Risk Report, Top Risks, Appetite Breach,
 *   KRI Breach, Treatment Overdue, Scenario Summary, BU Risk Report.
 *
 * Sub-pages (extras): Heatmap, Metrics — accessible via sub-tab links.
 */

interface ReportCard {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: string;
  route?: string;
  action?: string;
}

const REPORT_CATALOG: ReportCard[] = [
  { id: 'executive-pack',     titleEn: 'Executive Risk Pack',    titleAr: 'حزمة المخاطر التنفيذية',   descEn: 'C-suite risk summary with top risks, trends, and appetite alignment', descAr: 'ملخص مخاطر للإدارة العليا', icon: 'briefcase', action: 'executive_pack' },
  { id: 'board-report',       titleEn: 'Board Risk Report',      titleAr: 'تقرير مخاطر مجلس الإدارة', descEn: 'Board-ready report with heatmaps and risk appetite status', descAr: 'تقرير جاهز لمجلس الإدارة', icon: 'building-2', action: 'board_report' },
  { id: 'top-risks',          titleEn: 'Top Risks Report',       titleAr: 'تقرير أعلى المخاطر',       descEn: 'Ranked list of highest residual risks with treatment status', descAr: 'قائمة مرتبة بأعلى المخاطر', icon: 'arrow-up', action: 'top_risks' },
  { id: 'appetite-breach',    titleEn: 'Appetite Breach Report',  titleAr: 'تقرير تجاوزات الشهية',     descEn: 'Risks exceeding appetite thresholds requiring escalation', descAr: 'مخاطر تجاوزت حدود الشهية', icon: 'alert-triangle', action: 'appetite_breach' },
  { id: 'kri-breach',         titleEn: 'KRI Breach Report',       titleAr: 'تقرير تجاوزات المؤشرات',   descEn: 'Key risk indicators in breach with trend analysis', descAr: 'مؤشرات المخاطر المتجاوزة', icon: 'arrow-up-right', action: 'kri_breach' },
  { id: 'treatment-overdue',  titleEn: 'Treatment Overdue',       titleAr: 'معالجات متأخرة',           descEn: 'Overdue treatment plans and remediation actions', descAr: 'خطط المعالجة المتأخرة', icon: 'clock', action: 'treatment_overdue' },
  { id: 'scenario-summary',   titleEn: 'Scenario Summary',        titleAr: 'ملخص السيناريوهات',        descEn: 'Scenario analysis results with Monte Carlo outputs', descAr: 'نتائج تحليل السيناريوهات', icon: 'sitemap', action: 'scenario_summary' },
  { id: 'bu-risk',            titleEn: 'BU Risk Report',          titleAr: 'تقرير مخاطر وحدات الأعمال', descEn: 'Risk distribution and status by business unit', descAr: 'توزيع المخاطر حسب وحدة الأعمال', icon: 'layers', action: 'bu_risk' },
  // Sub-pages (extras)
  { id: 'heatmap',            titleEn: 'Risk Heatmap',            titleAr: 'الخريطة الحرارية',          descEn: 'Interactive 5x5 likelihood-impact matrix', descAr: 'مصفوفة احتمال-أثر تفاعلية', icon: 'chart-bar', route: '/risk/heatmap' },
  { id: 'metrics',            titleEn: 'Risk Metrics Dashboard',  titleAr: 'لوحة المقاييس',            descEn: 'KPIs, variance analysis, and trend charts', descAr: 'مؤشرات أداء وتحليل الانحراف', icon: 'gauge', route: '/risk/metrics' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-reports',
    imports: [
        CommonModule, RouterModule,
        PageHeaderComponent, ModuleTabsBarComponent,
        CardModule, ButtonModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <div class="rr-page" [attr.dir]="dir()">
      <app-page-header
        titleEn="Reports"
        titleAr="التقارير"
        subtitleEn="Risk reporting catalog — executive packs, board reports, and visual analytics"
        subtitleAr="كتالوج تقارير المخاطر — حزم تنفيذية وتقارير مجلس إدارة وتحليلات مرئية"
        icon="bar-chart-2"
      />
      <app-module-tabs-bar [tabs]="tabs" />

      <div class="rr-catalog">
        <div class="rr-card" *ngFor="let r of reports" (click)="onReportClick(r)" tabindex="0" role="button" (keyup.enter)="onReportClick(r)">
          <div class="rr-card-icon"><i class="pi pi-{{ r.icon }}"></i></div>
          <div class="rr-card-body">
            <h3 class="rr-card-title">{{ isAr() ? r.titleAr : r.titleEn }}</h3>
            <p class="rr-card-desc">{{ isAr() ? r.descAr : r.descEn }}</p>
          </div>
          <i class="pi pi-arrow-right rr-card-arrow"></i>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .rr-page { padding: 0; }
    .rr-catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; padding: 16px 20px; }
    .rr-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); cursor: pointer; transition: all .15s; }
    .rr-card:hover { border-color: var(--primary-200, #93c5fd); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .rr-card-icon { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); background: var(--primary-50, #eff6ff); color: var(--primary); font-size: var(--font-size-body-lg); flex-shrink: 0; }
    .rr-card-body { flex: 1; }
    .rr-card-title { margin: 0 0 4px; font-size: var(--font-size-sm); font-weight: 600; }
    .rr-card-desc { margin: 0; font-size: var(--font-size-xs); color: var(--text-muted); line-height: 1.4; }
    .rr-card-arrow { color: var(--text-muted); font-size: var(--font-size-sm); }
    [dir='rtl'] .rr-card-arrow { transform: scaleX(-1); }
  `]
})
export class RiskReportsComponent implements OnInit {
  private api = inject(RiskApiService);
  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private msg = inject(MessageService);
  readonly i18n = inject(I18nService);

  readonly tabs = RISK_PRIMARY_TABS;
  readonly reports = REPORT_CATALOG;
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  ngOnInit(): void {
    this.live.risk$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {});
  }

  onReportClick(report: ReportCard): void {
    if (report.route) {
      this.router.navigate([report.route]);
    } else if (report.action) {
      this.api.runReport(report.action).subscribe({
        next: () => this.msg.add({ severity: 'success', summary: 'Report', detail: `${report.titleEn} generated` }),
        error: () => this.msg.add({ severity: 'warn', summary: 'Report', detail: 'Report generation in progress...' }),
      });
    }
  }
}
