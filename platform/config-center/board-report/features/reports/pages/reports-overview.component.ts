import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe} from '@app/shared/pipes';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ReportsApiService, REPORT_TEMPLATES } from '../services/reports-api.service';
import { ModuleKickstartService } from '@app/modules';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonModule } from 'primeng/skeleton';
import { KpiCardVM, HealthAlertVM } from '@app/shared/models/module-overview.vm';
import { REPORT_TABS } from '../reports.constants';
import { GrcRecord } from '@app/core/models/shared.types';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { GrcOperationsService } from '@app/api';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

interface QuickLink {
  id: string; labelEn: string; labelAr: string;
  icon: string; color: string; bg: string; route: string;
  descEn: string; descAr: string;
}

const QUICK_LINKS: QuickLink[] = [
  { id: 'executive',  labelEn: 'Executive Dashboard',  labelAr: 'لوحة التنفيذيين',   icon: 'chart-bar',          color: '#1d4ed8', bg: '#eff6ff', route: '/reports/executive',  descEn: 'Board-level KPIs & compliance gauge',        descAr: 'مؤشرات مجلس الإدارة ومقياس الامتثال' },
  { id: 'risk',       labelEn: 'Risk Analytics',        labelAr: 'تحليلات المخاطر',   icon: 'exclamation-triangle',color: '#991b1b', bg: 'var(--status-danger-bg, #fff1f1)', route: '/reports/risk',       descEn: 'Heatmap, distribution and top risks',         descAr: 'الخريطة الحرارية والتوزيع وأبرز المخاطر' },
  { id: 'compliance', labelEn: 'Compliance Analytics',  labelAr: 'تحليلات الامتثال',  icon: 'shield',             color: '#065f46', bg: '#d1fae5', route: '/reports/compliance', descEn: 'Framework coverage and anomaly detection',    descAr: 'تغطية الأطر واكتشاف الشذوذ' },
  { id: 'evidence',   labelEn: 'Evidence Analytics',    labelAr: 'تحليلات الأدلة',    icon: 'folder',             color: '#1e40af', bg: '#dbeafe', route: '/reports/evidence',   descEn: 'Evidence status donut and pending queue',     descAr: 'حالة الأدلة وقائمة الانتظار' },
  { id: 'audit',      labelEn: 'Audit Analytics',       labelAr: 'تحليلات التدقيق',   icon: 'search',             color: '#6d28d9', bg: 'var(--purple-50, #f5f3ff)', route: '/reports/audit',      descEn: 'Findings, aging and control drift',           descAr: 'النتائج والتقادم وانحراف الضوابط' },
  { id: 'builder',    labelEn: 'Report Builder',         labelAr: 'منشئ التقارير',    icon: 'file-edit',          color: '#0f766e', bg: '#ccfbf1', route: '/reports/builder',    descEn: '4-step wizard: template → params → generate', descAr: 'معالج ٤ خطوات: قالب ← معاملات ← إنشاء' },
  { id: 'scheduled',  labelEn: 'Scheduled Reports',      labelAr: 'التقارير المجدولة',icon: 'calendar',           color: '#b45309', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/reports/scheduled',  descEn: 'Recurring delivery — daily to quarterly',     descAr: 'توصيل متكرر — يومياً حتى ربع سنوي' },
  { id: 'exports',    labelEn: 'Exports & Catalog',      labelAr: 'التصدير والكتالوج', icon: 'download',           color: '#374151', bg: '#f3f4f6', route: '/reports/exports',    descEn: 'Download from 11 pre-built templates',        descAr: 'تنزيل من ١١ قالباً جاهزاً' },
];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-reports-overview',
    imports: [
        CommonModule, RouterModule, SkeletonModule,
        PageHeaderComponent, KpiCardGridComponent, ModuleTabsBarComponent, EmptyStateComponent, AppDatePipe, ModuleOverviewKitComponent,
    ],
    template: `
    <div class="ro-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Reports Center"
        titleAr="مركز التقارير"
        subtitleEn="Generate, schedule and export GRC reports — executive to audit — in PDF, Excel and HTML"
        subtitleAr="أنشئ وجدول وصدّر تقارير الحوكمة — من التنفيذي إلى التدقيق — بتنسيقات PDF وExcel وHTML"
        icon="file-bar-chart"
        [breadcrumbs]="i18n.isAr() ? ['لوحة التحكم','التقارير','نظرة عامة'] : ['Dashboard','Reports','Overview']"
        [actions]="headerActions()"
        [isAr]="i18n.isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <app-module-tabs-bar [tabs]="tabs" [isAr]="i18n.isAr()" />

      <div class="ro-body">

        <!-- ══ Loading skeleton ══ -->
        @if (loading()) {
          <div class="skeleton-kpi">
            @for (i of [1,2,3,4,5,6]; track i) {
              <p-skeleton height="76px" borderRadius="10px" />
            }
          </div>
          <p-skeleton height="60px" borderRadius="10px" />
          <div class="skeleton-grid">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <p-skeleton height="110px" borderRadius="12px" />
            }
          </div>
        }

        <!-- ══ Error state ══ -->
        @if (!loading() && error()) {
          <app-empty-state
            variant="error"
            [title]="i18n.isAr() ? 'تعذّر تحميل البيانات' : 'Failed to load data'"
            [description]="i18n.isAr() ? 'تحقق من الاتصال وأعد المحاولة' : 'Check your connection and try again'"
            [actionLabel]="i18n.isAr() ? 'إعادة المحاولة' : 'Retry'"
            [dir]="dir()"
            (action)="load()" />
        }

        @if (!loading() && !error()) {

          <!-- ══ KPI Band ══ -->
          <app-kpi-card-grid
            [cards]="kpis()"
            [isAr]="i18n.isAr()"
            (cardClick)="onKpiClick($event.id)" />

          <!-- ══ Activity bar ══ -->
          @if (lastGenerated()) {
            <div class="ro-activity-bar">
              <div class="ab-item">
                <i class="pi pi-clock" aria-hidden="true"></i>
                <span class="ab-label">{{ i18n.isAr() ? 'آخر تقرير:' : 'Last Generated:' }}</span>
                <span class="ab-val">{{ lastGenerated() }}</span>
              </div>
              <div class="ab-sep"></div>
              <div class="ab-item">
                <i class="pi pi-list" aria-hidden="true"></i>
                <span class="ab-label">{{ i18n.isAr() ? 'القوالب المتاحة:' : 'Templates Available:' }}</span>
                <span class="ab-val">{{ templates.length }}</span>
              </div>
              <div class="ab-sep"></div>
              <div tabindex="0" role="button" (keyup.enter)="drill('/reports/builder')" class="ab-item ab-clickable" (click)="drill('/reports/builder')">
                <i class="pi pi-plus-circle" aria-hidden="true"></i>
                <span class="ab-label">{{ i18n.isAr() ? 'تقرير مخصص جديد' : 'New Custom Report' }}</span>
                <i class="pi pi-arrow-right ab-arrow" aria-hidden="true"></i>
              </div>
            </div>
          }

          <!-- ══ Quick Access Links ══ -->
          <div class="ro-section">
            <h2 class="ro-section-title">
              <i class="pi pi-th-large" aria-hidden="true"></i>
              {{ i18n.isAr() ? 'الوصول السريع' : 'Quick Access' }}
            </h2>
            <div class="ro-links-grid">
              @for (link of quickLinks; track link.id) {
                <div class="ro-link-card" [routerLink]="[link.route]">
                  <div class="rlc-icon-wrap" [style.background]="link.bg">
                    <i class="pi" [ngClass]="'pi-' + link.icon" [style.color]="link.color" aria-hidden="true"></i>
                  </div>
                  <div class="rlc-text">
                    <div class="rlc-title">{{ i18n.isAr() ? link.labelAr : link.labelEn }}</div>
                    <div class="rlc-desc">{{ i18n.isAr() ? link.descAr : link.descEn }}</div>
                  </div>
                  <i class="pi pi-chevron-right rlc-arrow" aria-hidden="true"></i>
                </div>
              }
            </div>
          </div>

          <!-- ══ Recent Catalog Entries ══ -->
          <div class="ro-section">
            <div class="ro-section-header">
              <h2 class="ro-section-title">
                <i class="pi pi-history" aria-hidden="true"></i>
                {{ i18n.isAr() ? 'آخر التقارير المُنشأة' : 'Recently Generated Reports' }}
              </h2>
              <button class="ro-link-btn" (click)="drill('/reports/exports')">
                {{ i18n.isAr() ? 'عرض الكل' : 'View all' }}
                <i class="pi pi-arrow-right" aria-hidden="true"></i>
              </button>
            </div>

            @if (catalogState() === 'loading') {
              @for (i of [1,2,3]; track i) {
                <p-skeleton height="44px" borderRadius="8px" [style]="{'margin-bottom':'8px'}" />
              }
            } @else if (catalog()?.length) {
              <div class="ro-catalog-table">
                <table>
                  <thead>
                    <tr>
                      <th>{{ i18n.isAr() ? 'العنوان' : 'Title' }}</th>
                      <th>{{ i18n.isAr() ? 'الوحدة' : 'Module' }}</th>
                      <th>{{ i18n.isAr() ? 'التاريخ' : 'Date' }}</th>
                      <th>{{ i18n.isAr() ? 'التنسيق' : 'Format' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of catalog()!.slice(0, 8); track item.reportId || $index) {
                      <tr tabindex="0" role="button" (keyup.enter)="drill('/reports/exports')" class="cat-row" (click)="drill('/reports/exports')">
                        <td class="cat-title">{{ item.title }}</td>
                        <td><span class="module-chip">{{ item.module }}</span></td>
                        <td class="cat-date">{{ item.generatedAt | appDate:'medium' }}</td>
                        <td>
                          <span class="fmt-chip" [class]="'fmt-' + (item.format || 'pdf')">
                            {{ (item.format || 'PDF').toUpperCase() }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <app-empty-state
                variant="default"
                [title]="i18n.isAr() ? 'لا توجد تقارير بعد' : 'No reports yet'"
                [description]="i18n.isAr() ? 'استخدم المنشئ لإنشاء أول تقرير' : 'Use the Builder to create your first report'"
                [actionLabel]="i18n.isAr() ? 'انتقل إلى المنشئ' : 'Go to Builder'"
                [dir]="dir()"
                (action)="drill('/reports/builder')" />
            }
          </div>

        }

        <app-module-overview-kit [config]="moduleKitConfig()"></app-module-overview-kit>
      </div>
    </div>
  `,
    styles: [`
    .ro-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }

    .ro-body { flex: 1; padding: 20px 28px 40px; display: flex; flex-direction: column; gap: 24px; }

    .skeleton-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

    /* ── Activity bar ── */
    .ro-activity-bar {
      display: flex; align-items: center; gap: 0;
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md);
      padding: 12px 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .ab-item { display: flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); }
    .ab-label { color: var(--text-muted, var(--text-muted)); font-weight: 500; }
    .ab-val { font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .ab-sep { width: 1px; height: 18px; background: var(--border-subtle, var(--border-subtle)); margin: 0 8px; }
    .ab-clickable {
      cursor: pointer; color: var(--primary-600, #2563eb); font-weight: 600;
      .ab-label { color: var(--primary-600, #2563eb); }
      &:hover { text-decoration: underline; }
    }
    .ab-arrow { font-size: var(--font-size-xs); margin-inline-start: 2px; }
    [dir="rtl"] .ab-arrow { transform: scaleX(-1); }

    /* ── Section ── */
    .ro-section { display: flex; flex-direction: column; gap: 14px; }
    .ro-section-header { display: flex; align-items: center; justify-content: space-between; }
    .ro-section-title {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading, var(--text-heading)); margin: 0;
      .pi { color: var(--primary-600, #2563eb); }
    }
    .ro-link-btn {
      display: flex; align-items: center; gap: 4px; font-size: var(--font-size-sm); font-weight: 600;
      color: var(--primary-600, #2563eb); background: none; border: none; cursor: pointer;
      &:hover { text-decoration: underline; }
      [dir="rtl"] .pi-arrow-right { transform: scaleX(-1); }
    }

    /* ── Quick links grid ── */
    .ro-links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }

    .ro-link-card {
      display: flex; align-items: center; gap: 14px;
      padding: 16px; border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      background: var(--surface-card, #fff);
      cursor: pointer; transition: all .15s; text-decoration: none;
      &:hover { border-color: var(--primary-300, #93c5fd); box-shadow: 0 2px 10px rgba(var(--color-blue-600-rgb), .08); }
    }

    .rlc-icon-wrap {
      width: 40px; height: 40px; border-radius: var(--radius-md); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      .pi { font-size: var(--font-size-lg); }
    }

    .rlc-text { flex: 1; min-width: 0; }
    .rlc-title { font-size: var(--font-size-sm); font-weight: 700; color: var(--text-heading, var(--text-heading)); }
    .rlc-desc { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); margin-top: 2px; line-height: 1.4; }
    .rlc-arrow { font-size: var(--font-size-sm); color: var(--text-muted, #9ca3af); flex-shrink: 0; }
    [dir="rtl"] .rlc-arrow { transform: scaleX(-1); }

    /* ── Catalog table ── */
    .ro-catalog-table { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    th {
      text-align: start; padding: 10px 12px; font-weight: 600;
      color: var(--text-muted, var(--text-muted)); border-bottom: 2px solid var(--surface-border, var(--border-subtle));
    }
    td { padding: 10px 12px; border-bottom: 1px solid var(--surface-border, var(--surface-ice)); }
    .cat-row { cursor: pointer; transition: background .1s; &:hover { background: var(--surface-50, #f9fafb); } }
    .cat-title { font-weight: 600; color: var(--text-heading, var(--text-heading)); }
    .cat-date { color: var(--text-muted, var(--text-muted)); font-size: var(--font-size-sm); }
    .module-chip {
      display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm);
      font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
      background: var(--surface-100, var(--surface-ice)); color: var(--text-muted, var(--text-muted));
    }
    .fmt-chip {
      display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 700;
      &.fmt-pdf   { background: #fee2e2; color: #991b1b; }
      &.fmt-excel { background: #d1fae5; color: #065f46; }
      &.fmt-html  { background: var(--purple-50, #f5f3ff); color: #6d28d9; }
    }

    @media (max-width: 768px) {
      .ro-body { padding: 16px 16px 32px; }
      .ro-links-grid { grid-template-columns: 1fr; }
      .ab-sep { display: none; }
    }
  `]
})
export class ReportsOverviewComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private reportsApi = inject(ReportsApiService);
  private router = inject(Router);
  private kickstartSvc = inject(ModuleKickstartService);

  dir  = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly reportingAgents: AgentInfo[] = [];

  readonly reportingTransitions = [
    { from: 'draft', to: 'scheduled' },
    { from: 'scheduled', to: 'generating' },
    { from: 'generating', to: 'review', requiresApproval: true },
    { from: 'review', to: 'published' },
    { from: 'review', to: 'draft' },
    { from: 'published', to: 'archived' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'reporting',
    tier: 'platform',
    automationLevel: null,
    slaHours: null,
    transitions: this.reportingTransitions,
    currentStatus: 'published',
    agents: this.reportingAgents,
    lang: this.i18n.isAr() ? 'ar' : 'en',
  }));

  readonly tabs      = REPORT_TABS;
  readonly templates = REPORT_TEMPLATES;
  readonly quickLinks = QUICK_LINKS;

  private fireStatus = signal<string>('pending');

  private _baseActions: PageHeaderAction[] = [
    { id: 'builder', labelEn: 'Build Report', labelAr: 'أنشئ تقريراً', icon: 'file-edit', primary: true },
    { id: 'exports', labelEn: 'Exports',       labelAr: 'التصدير',       icon: 'download' },
  ];

  headerActions = computed<PageHeaderAction[]>(() => {
    const s = this.fireStatus();
    if (s === 'completed') return [...this._baseActions, { id: 'kickstart-info', labelEn: 'Module Active ✓', labelAr: 'الوحدة نشطة ✓', icon: 'check-circle', chip: true }];
    const label = s === 'in_progress' ? 'Kickstarting…' : s === 'failed' ? 'Retry Kickstart' : 'Kickstart Reports';
    const labelAr = s === 'in_progress' ? 'جارٍ التشغيل…' : s === 'failed' ? 'إعادة التشغيل' : 'تشغيل التقارير';
    return [...this._baseActions, { id: 'kickstart', labelEn: label, labelAr, icon: 'bolt', primary: s === 'pending' }];
  });

  loading      = signal(true);
  error        = signal(false);
  kpis         = signal<KpiCardVM[]>([]);
  catalog      = signal<GrcRecord[]>([]);
  catalogState = signal<LoadState>('loading');
  lastGenerated = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.load();
    this.kickstartSvc.loadStatus().subscribe(s => {
      this.fireStatus.set(s['reports']?.status ?? 'pending');
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      await Promise.all([this.loadKpis(), this.loadCatalog()]);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadKpis(): Promise<void> {
    try {
      const [analyticsData, schedulesData] = await Promise.all([
        firstValueFrom(this.operationsSvc.getAnalyticsKPIs()).catch((): null => null),
        firstValueFrom(this.operationsSvc.getReportCenterSchedules()).catch((): null => null),
      ]);

      const scheduleCount = Array.isArray(schedulesData) ? schedulesData.length : ((schedulesData as any)?.schedules?.length ?? 0);
      const complianceScore = (analyticsData as any)?.complianceScore ?? 0;
      const riskScore       = (analyticsData as any)?.riskScore ?? 0;
      const evidenceCoverage = (analyticsData as any)?.evidenceCoverage ?? 0;

      this.kpis.set([
        {
          id: 'templates', labelEn: 'Templates',       labelAr: 'القوالب المتاحة',
          value: this.templates.length, icon: 'file',
          color: '#1d4ed8', bg: '#eff6ff', route: '/reports/exports',
        },
        {
          id: 'schedules', labelEn: 'Active Schedules', labelAr: 'الجداول النشطة',
          value: scheduleCount, icon: 'calendar',
          color: '#b45309', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/reports/scheduled',
          severity: scheduleCount === 0 ? 'warning' : 'default',
        },
        {
          id: 'compliance', labelEn: 'Compliance Score', labelAr: 'نسبة الامتثال',
          value: `${complianceScore}%`, icon: 'check-circle',
          color: '#065f46', bg: '#d1fae5', route: '/reports/compliance',
          severity: complianceScore < 60 ? 'danger' : complianceScore < 80 ? 'warning' : 'success',
        },
        {
          id: 'risk', labelEn: 'Risk Score', labelAr: 'درجة المخاطر',
          value: riskScore, icon: 'exclamation-triangle',
          color: '#991b1b', bg: 'var(--status-danger-bg, #fff1f1)', route: '/reports/risk',
          severity: riskScore > 7 ? 'danger' : riskScore > 5 ? 'warning' : 'default',
        },
        {
          id: 'evidence', labelEn: 'Evidence Coverage', labelAr: 'تغطية الأدلة',
          value: `${evidenceCoverage}%`, icon: 'folder',
          color: '#1e40af', bg: '#dbeafe', route: '/reports/evidence',
          severity: evidenceCoverage < 70 ? 'warning' : 'default',
        },
        {
          id: 'builder', labelEn: 'Report Builder', labelAr: 'منشئ التقارير',
          value: '→', icon: 'file-edit',
          color: '#0f766e', bg: '#ccfbf1', route: '/reports/builder',
        },
      ]);
    } catch { /* non-fatal — KPIs default to static */ }
  }

  private async loadCatalog(): Promise<void> {
    this.catalogState.set('loading');
    try {
      const res = await firstValueFrom(this.reportsApi.getCatalog({ limit: '8' }));
      const items = (res?.['items'] ?? []) as GrcRecord[];
      this.catalog.set(items);
      this.catalogState.set(items.length ? 'ready' : 'empty');
      if (items[0]?.['generatedAt']) {
        this.lastGenerated.set(new Date(String(items[0]['generatedAt'])).toLocaleDateString(this.i18n.isAr() ? 'ar-SA' : 'en-US'));
      }
    } catch { this.catalogState.set('error'); }
  }

  onKpiClick(id: string): void {
    const link = this.quickLinks.find(l => l.id === id);
    if (link) this.router.navigate([link.route]);
    else if (id === 'templates') this.router.navigate(['/reports/exports']);
    else if (id === 'schedules') this.router.navigate(['/reports/scheduled']);
    else if (id === 'builder')   this.router.navigate(['/reports/builder']);
  }

  onHeaderAction(id: string): void {
    if (id === 'kickstart') {
      const s = this.fireStatus();
      if (s === 'in_progress' || s === 'completed') return;
      this.fireStatus.set('in_progress');
      this.kickstartSvc.kickstart('reporting').subscribe({
        next: (r) => { this.fireStatus.set(r.status); this.load(); },
        error: () => this.fireStatus.set('failed'),
      });
      return;
    }
    if (id === 'builder') this.router.navigate(['/reports/builder']);
    if (id === 'exports') this.router.navigate(['/reports/exports']);
  }

  drill(path: string): void { this.router.navigate([path]); }
}
