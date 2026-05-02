import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ModuleKickstartService } from '@app/core/modules/module-kickstart.service';
import { ButtonModule, NotificationModule, PlaceholderModule } from 'carbon-components-angular';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { HealthStripComponent } from '@app/shared/components/status-indicators/health-strip.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { ModuleTabsBarComponent } from '@app/shared/components/module-chrome/module-tabs-bar.component';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';

import { KpiCardVM, HealthAlertVM, ActivityRowVM, ModuleTabVM } from '@app/shared/models/module-overview.vm';
import { AllowedActions, ComplianceOverviewDto } from '../../../models/compliance.models';
import { COMPLIANCE_EN } from '../../../config/compliance.labels.en';
import { COMPLIANCE_AR } from '../../../config/compliance.labels.ar';
import { GrcRecord } from '@app/core/models/shared.types';
import { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from '@app/shared/components/module-chrome/module-display/module-overview-kit.component';
import { EChartComponent } from '@app/shared/charts/echart.component';
import { buildComplianceGaugeOptions } from '@app/shared/charts/echarts/compliance-governance/compliance-gauge.options';
import type { AgentInfo } from '@app/shared/components/ai/agent-status-badge.component';
import { GrcOperationsService } from '@app/api';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-compliance-page',
    imports: [
        CommonModule, RouterLink,
        PageHeaderComponent, KpiCardGridComponent, HealthStripComponent,
        RecentActivityTableComponent, EmptyStateComponent, ModuleTabsBarComponent,
        PlaceholderModule, NotificationModule, ButtonModule,
        ModuleOverviewKitComponent, EChartComponent,
    ],
    providers: [],
    template: `
    <div class="comp-ov-page" [attr.dir]="dir()">

      <app-page-header
        titleEn="Compliance Overview"
        titleAr="نظرة عامة على الامتثال"
        subtitleEn="Frameworks, controls, obligations, gaps and audit readiness at a glance"
        subtitleAr="الأطر والضوابط والالتزامات والفجوات وجاهزية التدقيق في لمحة"
        icon="shield-check"
        [breadcrumbs]="[i18n.translate('common.breadcrumbDashboard'), i18n.translate('common.breadcrumbCompliance'), i18n.translate('common.breadcrumbOverview')]"
        [actions]="headerActions()"
        [isAr]="isAr()"
        [dir]="dir()"
        (actionClick)="onHeaderAction($event)" />

      <div class="scope-toggle-wrap">
        <button cdsButton [label]="scope() === 'my' ? (isAr() ? 'عرضي' : 'My view') : (isAr() ? 'الكل' : 'All')"
          icon="" class=" "
          (click)="toggleScope()" [attr.aria-pressed]="scope() === 'my'"></button>
      </div>

      <app-module-tabs-bar [tabs]="tabs" [isAr]="isAr()" />

      <div class="comp-ov-body">

        @if (loading()) {
          <div class="skeleton-kpi" aria-busy="true" aria-label="Loading compliance data">
            @for (i of [1,2,3,4,5,6]; track i) {
              <cds-placeholder></cds-placeholder>
            }
          </div>
          <cds-placeholder></cds-placeholder>
          <cds-placeholder></cds-placeholder>
        }

        @if (!loading() && error()) {
          <app-empty-state
            variant="error"
            [title]="i18n.translate('common.failedToLoad')"
            [description]="i18n.translate('common.checkConnection')"
            [actionLabel]="i18n.translate('common.retry')"
            [dir]="dir()"
            (action)="load()" />
        }

        @if (!loading() && !error()) {
          <app-kpi-card-grid
            [cards]="kpis()"
            [isAr]="isAr()"
            (cardClick)="onKpiClick($event)" />

          <app-health-strip
            [alerts]="healthAlerts()"
            [isAr]="isAr()"
            (alertClick)="onAlertClick($event)" />

          <!-- Framework Posture Grid -->
          @if (overview()) {
            <div class="comp-section-card">
              <div class="comp-section-header">
                <i class="" aria-hidden="true"></i>
                <span>{{ i18n.translate('common.frameworkPosture') }}</span>
                <a class="section-view-all" [routerLink]="'/compliance/frameworks'">
                  {{ i18n.translate('common.viewAll') }}
                  <i class="" aria-hidden="true"></i>
                </a>
              </div>

              @if ((overview()!.frameworks?.length ?? 0) > 0) {
                <div class="fw-posture-grid">
                  @for (fw of overview()!.frameworks; track fw.frameworkId) {
                    <div tabindex="0" role="button" (keyup.enter)="drillDown('frameworks', {frameworkId: fw.frameworkId})" class="fw-posture-card" (click)="drillDown('frameworks', {frameworkId: fw.frameworkId})">
                      <div class="fw-posture-name">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</div>
                      <div class="fw-posture-bar-row">
                        <div class="fw-posture-bar">
                          <div class="fw-posture-bar-fill" [style.width.%]="fw.score"></div>
                        </div>
                        <span class="fw-posture-score">{{ fw.score }}%</span>
                      </div>
                      <div class="fw-posture-meta">
                        <span>{{ fw.totalControls }} {{ i18n.translate('common.controlsUnit') }}</span>
                        <span>{{ fw.evidenceCoverage }}% {{ i18n.translate('common.evidenceUnit') }}</span>
                        @if (fw.openGaps) {
                          <span class="fw-posture-gaps">{{ fw.openGaps }} {{ i18n.translate('common.gapsUnit') }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <app-empty-state
                  variant="default"
                  [title]="i18n.translate('common.noActiveFrameworks')"
                  [description]="i18n.translate('common.startByAddingFramework')"
                  [actionLabel]="i18n.translate('common.addFramework')"
                  [dir]="dir()"
                  (action)="drillDown('frameworks')" />
              }
            </div>

            <!-- My Work & Team Work -->
            <div class="home-work-row">
              <div class="comp-section-card home-work-panel">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>My Work</span>
                  <a class="section-view-all" routerLink="/compliance/work-queue" [queryParams]="{scope:'my'}">View all <i class=""></i></a>
                </div>
                @if (myWorkItems().length) {
                  @for (item of myWorkItems().slice(0, 5); track item.id) {
                    <div class="home-work-item" (click)="navigateIssue(item)">
                      <span class="home-work-type">{{ item.type }}</span>
                      <span class="home-work-title">{{ item.title }}</span>
                      @if (item.dueDate) { <span class="home-work-due" [class.overdue-date]="isOverdueDate(item.dueDate)">{{ item.dueDate }}</span> }
                    </div>
                  }
                } @else {
                  <p class="text-muted-sm">No pending work items</p>
                }
              </div>
              <div class="comp-section-card home-work-panel">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>Team Work</span>
                  <a class="section-view-all" routerLink="/compliance/work-queue">View all <i class=""></i></a>
                </div>
                @if (teamWorkItems().length) {
                  @for (item of teamWorkItems().slice(0, 5); track item.id) {
                    <div class="home-work-item">
                      <span class="home-work-type">{{ item.type }}</span>
                      <span class="home-work-title">{{ item.title }}</span>
                      @if (item.owner) { <span class="home-work-owner">{{ item.owner }}</span> }
                    </div>
                  }
                } @else {
                  <p class="text-muted-sm">No team work items</p>
                }
              </div>
            </div>

            <!-- Business Unit Posture -->
            @if (buPosture().length) {
              <div class="comp-section-card">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>Business Unit Posture</span>
                  <a class="section-view-all" routerLink="/compliance/heatmap">Full heatmap <i class=""></i></a>
                </div>
                <div class="bu-grid">
                  @for (bu of buPosture().slice(0, 8); track bu.groupId) {
                    <div class="bu-chip">
                      <span class="bu-chip-name">{{ bu.groupName || bu.groupId }}</span>
                      <span class="bu-chip-score">{{ bu.complianceScore || 0 }}%</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Regulatory Change Feed -->
            @if (changeFeed().length) {
              <div class="comp-section-card">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>Regulatory Change Feed</span>
                  <a class="section-view-all" routerLink="/compliance/regulatory-changes">View all <i class=""></i></a>
                </div>
                @for (rc of changeFeed().slice(0, 5); track rc.id) {
                  <div class="change-feed-item">
                    <span class="severity-badge" [attr.data-severity]="rc.severity || 'info'">{{ rc.severity || 'info' }}</span>
                    <span class="change-feed-title">{{ rc.title }}</span>
                    <span class="change-feed-status">{{ rc.status }}</span>
                  </div>
                }
              </div>
            }

            <!-- Hotspots -->
            @if (hotspotFrameworks().length) {
              <div class="comp-section-card">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>Compliance Hotspots</span>
                </div>
                <div class="hotspot-row">
                  @for (fw of hotspotFrameworks(); track fw.frameworkId) {
                    <div class="hotspot-chip">
                      <span class="hotspot-chip-name">{{ fw.frameworkName }}</span>
                      <span class="hotspot-chip-gaps">{{ fw.openGaps || 0 }} gaps</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Priority Issues table -->
            @if (overview()!.priorityIssues?.length) {
              <div class="comp-section-card">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>{{ i18n.translate('common.priorityIssues') }}</span>
                </div>
                <div class="table-wrap">
                  <table aria-label="Data Table table" class="data-table">
                    <thead>
                      <tr>
                        <th>{{ i18n.translate('common.type') }}</th>
                        <th>{{ i18n.translate('common.title') }}</th>
                        <th>{{ i18n.translate('common.severity') }}</th>
                        <th>{{ i18n.translate('common.owner') }}</th>
                        <th>{{ i18n.translate('common.dueDate') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (issue of overview()!.priorityIssues; track issue.entityId) {
                        <tr tabindex="0" role="button" (keyup.enter)="navigateIssue(issue)" class="clickable-row" (click)="navigateIssue(issue)">
                          <td><span class="type-tag">{{ issue.type }}</span></td>
                          <td class="title-cell">{{ issue.title }}</td>
                          <td><span class="severity-badge" [attr.data-severity]="issue.severity">{{ issue.severity }}</span></td>
                          <td>{{ issue.owner || '—' }}</td>
                          <td class="date-cell" [class.overdue-date]="isOverdueDate(issue.dueDate)">{{ issue.dueDate || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }

          <!-- Recent Activity -->
          <app-recent-activity-table
            [rows]="activityRows()"
            titleEn="Recent Compliance Activity"
            titleAr="نشاط الامتثال الأخير"
            viewAllRoute="/compliance/assessments"
            [isAr]="isAr()" />

          <app-module-overview-kit [config]="moduleKitConfig()">
            @if (complianceGaugeOptions()) {
              <div class="comp-section-card">
                <div class="comp-section-header">
                  <i class="" aria-hidden="true"></i>
                  <span>{{ isAr() ? 'مقياس الامتثال' : 'Compliance Gauge' }}</span>
                </div>
                <app-echart [options]="complianceGaugeOptions()!" height="220px" />
              </div>
            }
          </app-module-overview-kit>
        }
      </div>

      <cds-notification></cds-notification>
    </div>
  `,
    styles: [`
    .comp-ov-page { display: flex; flex-direction: column; min-height: 100%; background: var(--surface-ground, var(--surface-ice)); }

    .comp-ov-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .scope-toggle-wrap { margin-top: -8px; margin-bottom: 4px; }

    .skeleton-kpi { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 12px; }

    .comp-section-card {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .comp-section-header {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border-subtle, var(--surface-ice));
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--text-heading, var(--text-heading));
    }
    .comp-section-header .pi { color: var(--primary-600, #2563eb); font-size: var(--font-size-base); }

    .section-view-all {
      margin-inline-start: auto;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-600, #2563eb);
      text-decoration: none;
    }
    .section-view-all:hover { text-decoration: underline; }
    .section-view-all .pi { font-size: var(--font-size-xs); }
    [dir="rtl"] .section-view-all .pi { transform: scaleX(-1); }

    .fw-posture-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; padding: 16px; }
    .fw-posture-card { padding: 14px; border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); border: 1px solid var(--border-subtle, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s; }
    .fw-posture-card:hover { box-shadow: var(--shadow-card); background: var(--surface-card, #fff); }
    .fw-posture-name { font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 8px; color: var(--text-heading, var(--text-heading)); }
    .fw-posture-bar-row { display: flex; align-items: center; gap: 8px; }
    .fw-posture-bar { flex: 1; height: 7px; border-radius: var(--radius-xs); background: var(--surface-200, var(--border-subtle)); overflow: hidden; }
    .fw-posture-bar-fill { height: 100%; border-radius: var(--radius-xs); background: linear-gradient(90deg, var(--primary), var(--success)); transition: width .3s; }
    .fw-posture-score { font-size: var(--font-size-sm); font-weight: 700; min-width: 38px; text-align: end; color: var(--text-heading, var(--text-heading)); }
    .fw-posture-meta { display: flex; gap: 10px; margin-top: 8px; font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); flex-wrap: wrap; }
    .fw-posture-gaps { color: var(--error, #b91c1c); font-weight: 600; }

    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    .data-table th { background: var(--surface-100, var(--surface-ice)); padding: 10px 12px; text-align: start; font-weight: 600; white-space: nowrap; border-bottom: 1px solid var(--border-subtle, var(--border-subtle)); }
    .data-table td { padding: 10px 12px; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: var(--surface-50, #f9fafb); }
    .title-cell { max-width: 280px; font-weight: 500; }
    .date-cell { white-space: nowrap; }
    .overdue-date { color: var(--error, #b91c1c); font-weight: 600; }
    .type-tag { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .4px; background: var(--surface-200, var(--border-subtle)); color: var(--text-muted, var(--text-muted)); }
    .severity-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .severity-badge[data-severity="critical"] { background: var(--severity-critical-bg, #fee2e2); color: var(--severity-critical, #991b1b); }
    .severity-badge[data-severity="high"]     { background: var(--severity-high-bg, #ffedd5); color: var(--severity-high, #9a3412); }
    .severity-badge[data-severity="medium"]   { background: var(--severity-medium-bg, #fef9c3); color: var(--severity-medium, #854d0e); }
    .severity-badge[data-severity="low"]      { background: var(--severity-low-bg, #dcfce7); color: var(--severity-low, #166534); }
    .severity-badge[data-severity="info"]     { background: #dbeafe; color: #1e40af; }

    /* G7: Home widgets */
    .home-work-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .home-work-panel { min-height: 120px; }
    .home-work-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-xs); cursor: pointer; }
    .home-work-item:hover { background: var(--surface-50, #f9fafb); }
    .home-work-type { font-size: 0.6rem; text-transform: uppercase; font-weight: 700; padding: 2px 6px; border-radius: 3px; background: var(--primary, #3b82f6); color: #fff; }
    .home-work-title { flex: 1; font-size: var(--font-size-sm); }
    .home-work-due { font-size: var(--font-size-xs); color: var(--text-muted); }
    .home-work-owner { font-size: var(--font-size-xs); color: var(--text-muted); }
    .text-muted-sm { font-size: var(--font-size-sm); color: var(--text-muted); font-style: italic; padding: 8px; }

    .bu-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; }
    .bu-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-subtle); background: var(--surface-ground, var(--surface-ice)); }
    .bu-chip-name { font-size: var(--font-size-sm); font-weight: 500; }
    .bu-chip-score { font-size: var(--font-size-sm); font-weight: 700; }

    .change-feed-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .change-feed-title { flex: 1; font-size: var(--font-size-sm); }
    .change-feed-status { font-size: var(--font-size-xs); text-transform: uppercase; color: var(--text-muted); }

    .hotspot-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; }
    .hotspot-chip { display: flex; flex-direction: column; align-items: center; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); border-left: 3px solid var(--error, #dc2626); background: var(--surface-ground, var(--surface-ice)); }
    .hotspot-chip-name { font-size: var(--font-size-sm); font-weight: 600; }
    .hotspot-chip-gaps { font-size: var(--font-size-xs); color: var(--error, #dc2626); }

    @media (max-width: 768px) {
      .home-work-row { grid-template-columns: 1fr; }
    }
  `]
})
export class CompliancePageComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  readonly i18n = inject(I18nService);
  private api    = inject(ComplianceFeatureApiService);
  private msg    = inject(MessageService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private kickstartSvc = inject(ModuleKickstartService);

  loading  = signal(true);
  error    = signal(false);
  isAr     = computed(() => this.i18n.currentLang() === 'ar');
  dir      = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');
  L        = computed(() => this.isAr() ? COMPLIANCE_AR : COMPLIANCE_EN);

  /** Role/workflow-scoped allowed actions; null until loaded */
  allowedActions = signal<AllowedActions | null>(null);
  /** Route query params as a signal via toSignal() */
  private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} as Record<string, string> });

  /** 'my' = scoped to current user (controls I own, findings assigned to me); 'all' = full view */
  scope = signal<'my' | 'all'>('all');

  private overview$ = signal<ComplianceOverviewDto | null>(null);
  private activity$ = signal<GrcRecord[]>([]);

  overview = computed(() => this.overview$());

  // G7: New home widgets
  myWorkItems = signal<any[]>([]);
  teamWorkItems = signal<any[]>([]);
  buPosture = signal<any[]>([]);
  changeFeed = signal<any[]>([]);
  hotspotFrameworks = computed(() => {
    const fws = this.overview$()?.frameworks || [];
    return [...fws].sort((a, b) => (b.openGaps || 0) - (a.openGaps || 0)).filter(f => (f.openGaps || 0) > 0).slice(0, 6);
  });

  readonly tabs: ModuleTabVM[] = [
    { id: 'overview',    labelEn: 'Overview',          labelAr: 'نظرة عامة',    route: '/compliance/overview',    icon: 'home' },
    { id: 'frameworks',  labelEn: 'Frameworks',        labelAr: 'الأطر',         route: '/compliance/frameworks',  icon: 'sitemap' },
    { id: 'controls',    labelEn: 'Controls',          labelAr: 'الضوابط',      route: '/compliance/controls',    icon: 'sliders-h' },
    { id: 'obligations', labelEn: 'Obligations',       labelAr: 'الالتزامات',   route: '/compliance/obligations', icon: 'list' },
    { id: 'assessments', labelEn: 'Assessments',       labelAr: 'التقييمات',    route: '/compliance/assessments', icon: 'clipboard' },
    { id: 'gaps',        labelEn: 'Gaps',              labelAr: 'الفجوات',      route: '/compliance/gaps',        icon: 'exclamation-triangle' },
    { id: 'findings',    labelEn: 'Findings',          labelAr: 'النتائج',      route: '/compliance/findings',    icon: 'flag' },
    { id: 'templates',   labelEn: 'Templates',         labelAr: 'القوالب',       route: '/compliance/templates',   icon: 'file' },
    { id: 'mappings',    labelEn: 'Mappings',          labelAr: 'الربط',         route: '/compliance/mappings',    icon: 'share-alt' },
    { id: 'posture',     labelEn: 'Posture Dashboard', labelAr: 'لوحة الوضع',   route: '/compliance/posture',     icon: 'chart-line' },
    { id: 'sox',         labelEn: 'SOX',               labelAr: 'SOX',           route: '/compliance/sox',         icon: 'briefcase' },
    { id: 'esg',         labelEn: 'ESG',               labelAr: 'ESG',           route: '/compliance/esg',         icon: 'globe' },
    { id: 'savings',     labelEn: 'Savings',           labelAr: 'التوفيرات',    route: '/compliance/savings',     icon: 'dollar' },
    { id: 'roadmap',     labelEn: 'Roadmap',           labelAr: 'خارطة الطريق', route: '/compliance/roadmap',     icon: 'map' },
    { id: 'calendar',    labelEn: 'Calendar',          labelAr: 'التقويم',      route: '/compliance/calendar',    icon: 'calendar' },
    { id: 'monitoring',  labelEn: 'Monitoring',        labelAr: 'المراقبة',     route: '/compliance/monitoring',  icon: 'shield' },
    { id: 'regulatory',  labelEn: 'Regulatory Changes', labelAr: 'التغييرات التنظيمية', route: '/compliance/regulatory-changes', icon: 'bell' },
  ];

  private fireStatus = signal<string>('pending');

  private _baseActions: PageHeaderAction[] = [
    { id: 'add-framework', labelEn: 'Add Framework', labelAr: 'إضافة إطار',  icon: 'plus',     primary: true },
    { id: 'new-gap',       labelEn: 'Log Gap',       labelAr: 'تسجيل فجوة',  icon: 'exclamation-triangle' },
    { id: 'export',        labelEn: 'Export',        labelAr: 'تصدير',         icon: 'download' },
    { id: 'download-audit-package', labelEn: 'Download audit package', labelAr: 'تحميل حزمة التدقيق', icon: 'file-export' },
    { id: 'export-pdf',    labelEn: 'Export PDF',    labelAr: 'تصدير PDF',    icon: 'file-pdf' },
    { id: 'export-xlsx',   labelEn: 'Export Excel',  labelAr: 'تصدير إكسل',   icon: 'file-excel' },
    { id: 'export-zip',    labelEn: 'Export ZIP',    labelAr: 'تصدير ZIP',     icon: 'file-archive' },
  ];

  headerActions = computed<PageHeaderAction[]>(() => {
    const a = this.allowedActions();
    const filter = (id: string): boolean => {
      if (!a) return true;
      if (id === 'add-framework') return a.canManageFrameworks;
      if (id === 'new-gap') return a.canLogGap ?? a.canSubmitEvidence;
      if (id === 'export' || id === 'download-audit-package' || id === 'export-pdf' || id === 'export-xlsx' || id === 'export-zip') return a.canExport;
      return true;
    };
    const base = this._baseActions.filter((ac) => filter(ac.id));
    const s = this.fireStatus();
    if (s === 'completed') return [...base, { id: 'kickstart-info', labelEn: 'Module Active ✓', labelAr: 'الوحدة نشطة ✓', icon: 'check-circle', chip: true }];
    const label = s === 'in_progress' ? 'Kickstarting…' : s === 'failed' ? 'Retry Kickstart' : 'Kickstart Compliance';
    const labelAr = s === 'in_progress' ? 'جارٍ التشغيل…' : s === 'failed' ? 'إعادة التشغيل' : 'تشغيل الامتثال';
    return [...base, { id: 'kickstart', labelEn: label, labelAr, icon: 'bolt', primary: s === 'pending' }];
  });

  kpis = computed<KpiCardVM[]>(() => {
    const s = this.overview$()?.summary;
    if (!s) return [];
    return [
      { id: 'overall',      labelEn: 'Overall Score',         labelAr: 'النتيجة الإجمالية',   value: s.overallScore + '%',   icon: 'shield',               color: 'var(--primary, #3b82f6)', bg: 'var(--primary-50, #eff6ff)', route: '/compliance/overview' },
      { id: 'frameworks',   labelEn: 'Active Frameworks',    labelAr: 'أطر نشطة',           value: s.activeFrameworks,     icon: 'sitemap',              color: 'var(--info, #1d4ed8)', bg: 'var(--info-bg, #dbeafe)', route: '/compliance/frameworks' },
      { id: 'controls',     labelEn: 'Controls Mapped',      labelAr: 'ضوابط مُربوطة',       value: s.controlsMapped,       icon: 'sliders-h',            color: 'var(--severity-medium, #7c3aed)', bg: 'var(--severity-medium-bg, #ede9fe)', route: '/compliance/controls' },
      { id: 'gaps',         labelEn: 'Open Gaps',            labelAr: 'فجوات مفتوحة',        value: s.openGaps,             icon: 'exclamation-triangle', color: 'var(--warning, #d97706)', bg: 'var(--status-warning-bg, #fcf4d6)', route: '/compliance/gaps',        severity: s.openGaps > 0 ? 'warning' : 'default' },
      { id: 'crit-gaps',    labelEn: 'Critical Gaps',        labelAr: 'فجوات حرجة',          value: s.criticalGaps,         icon: 'bolt',                 color: 'var(--error)', bg: 'var(--error-bg, #fee2e2)', route: '/compliance/gaps', queryParams: { severity: 'critical' }, severity: s.criticalGaps > 0 ? 'danger' : 'default' },
      { id: 'obligations',  labelEn: 'Obligations Covered',  labelAr: 'الالتزامات المشمولة', value: s.obligationsCovered + '%', icon: 'list',              color: 'var(--success, #059669)', bg: 'var(--success-bg, #d1fae5)', route: '/compliance/obligations' },
      { id: 'evidence',     labelEn: 'Evidence Coverage',    labelAr: 'تغطية الأدلة',        value: s.evidenceCoverage + '%', icon: 'folder-open',         color: 'var(--severity-medium, #8b5cf6)', bg: 'var(--severity-medium-bg, #ede9fe)', route: '/compliance/evidence-ops' },
      { id: 'audit-ready',  labelEn: 'Audit Readiness',      labelAr: 'جاهزية التدقيق',      value: s.auditReadiness + '%', icon: 'check-circle',         color: 'var(--success, #0891b2)', bg: 'var(--success-bg, #cffafe)', route: '/compliance/posture' },
    ];
  });

  healthAlerts = computed<HealthAlertVM[]>(() =>
    this.kpis()
      .filter(k => (k.severity === 'danger' || k.severity === 'warning') && (k.value as number) > 0)
      .map(k => ({
        id: k.id, labelEn: k.labelEn, labelAr: k.labelAr,
        count: typeof k.value === 'number' ? k.value : parseInt(String(k.value)) || 0,
        icon: k.icon, color: k.color,
        severity: k.severity as 'danger' | 'warning',
        route: k.route, queryParams: k.queryParams,
      }))
  );

  activityRows = computed<ActivityRowVM[]>(() =>
    (this.activity$() || []).slice(0, 8).map((r) => ({
      id:          r.id || String(Math.random()),
      timestamp:   r.timestamp || r.created_at || new Date().toISOString(),
      actorLabel:  r.actor_email || r.user_id || '—',
      action:      r.action || r.event_type || '—',
      entityType:  r.entity_type || 'Compliance',
      entityLabel: r.entity_name || r.resource_id,
    }))
  );

  /** React to scope query param changes */
  private readonly scopeEffect = effect(() => {
    const qp = this.queryParams();
    if (qp['scope'] === 'my') this.scope.set('my');
    else this.scope.set('all');
  });

  ngOnInit(): void {
    this.api.getAllowedActions().subscribe({
      next: (a) => this.allowedActions.set(a),
      error: () => this.allowedActions.set(null),
    });
    this.load();
    this.loadHomeWidgets();
    this.kickstartSvc.loadStatus().subscribe(s => {
      this.fireStatus.set(s['compliance']?.status ?? 'pending');
    });
  }

  toggleScope(): void {
    const next = this.scope() === 'my' ? 'all' : 'my';
    this.scope.set(next);
    this.router.navigate([], { queryParams: next === 'my' ? { scope: 'my' } : {}, queryParamsHandling: 'merge', replaceUrl: true });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const scopeParam = this.scope() === 'my' ? ('my' as const) : undefined;

    forkJoin({
      overview: this.api.getOverview(undefined, scopeParam).pipe(catchError(() => of(null))),
      activity: this.operationsSvc.getActivityFeed('compliance').pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        this.overview$.set(res.overview);
        this.activity$.set(Array.isArray(res.activity) ? res.activity : (res.activity as any)?.items || (res.activity as any)?.events || []);
        if (!res.overview) this.error.set(true);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  /** G7: Load data for My Work, Team Work, BU Posture, Change Feed widgets — all DB-driven */
  private loadHomeWidgets(): void {
    // My work items — from unified DB-driven work-queue endpoint
    this.api.getWorkQueue('my').pipe(catchError(() => of({ items: [] }))).subscribe(data => {
      this.myWorkItems.set((data?.items || []).slice(0, 5).map((i: any) => ({
        id: i.id, type: i.type || 'task', title: i.title, dueDate: i.due_date, owner: i.owner, severity: i.priority
      })));
    });

    // Team work — all open items from unified work-queue
    this.api.getWorkQueue().pipe(catchError(() => of({ items: [] }))).subscribe(data => {
      this.teamWorkItems.set((data?.items || []).slice(0, 5).map((i: any) => ({
        id: i.id, type: i.type || 'task', title: i.title, dueDate: i.due_date, owner: i.owner, severity: i.priority
      })));
    });

    // BU posture — DB-driven posture by org
    this.api.getPostureByOrg('business_unit').pipe(catchError(() => of([]))).subscribe(data => {
      this.buPosture.set(Array.isArray(data) ? data : []);
    });

    // Regulatory change feed — DB-driven
    this.api.getRegulatoryChanges().pipe(catchError(() => of([]))).subscribe(data => {
      this.changeFeed.set(Array.isArray(data) ? data.slice(0, 10) : []);
    });
  }

  onKpiClick(card: KpiCardVM): void {
    this.router.navigate([card.route], { queryParams: card.queryParams });
  }

  onAlertClick(alert: HealthAlertVM): void {
    this.router.navigate([alert.route], { queryParams: alert.queryParams });
  }

  onHeaderAction(id: string): void {
    if (id === 'kickstart') {
      const s = this.fireStatus();
      if (s === 'in_progress' || s === 'completed') return;
      this.fireStatus.set('in_progress');
      this.kickstartSvc.kickstart('compliance').subscribe({
        next: (r) => { this.fireStatus.set(r.status); this.load(); },
        error: () => this.fireStatus.set('failed'),
      });
      return;
    }
    if (id === 'download-audit-package') {
      this.api.getAuditPackage().subscribe({
        next: (data) => {
          this.api.downloadAuditPackageJson(data);
          this.msg.add({ severity: 'success', summary: this.i18n.translate('common.auditPackageDownloaded'), life: 3000 });
        },
        error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToGenerateAuditPackage'), life: 5000 }),
      });
      return;
    }
    const auditPackFormat = { 'export-pdf': 'pdf' as const, 'export-xlsx': 'xlsx' as const, 'export-zip': 'zip' as const }[id];
    if (auditPackFormat) {
      this.api.downloadAuditPack(auditPackFormat).subscribe({
        next: () => this.msg.add({ severity: 'success', summary: this.i18n.translate('common.downloadStarted'), life: 3000 }),
        error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.exportFailed'), life: 5000 }),
      });
      return;
    }
    const routes: Record<string, string> = {
      'add-framework': '/compliance/frameworks',
      'new-gap':       '/compliance/gaps',
      'export':        '/compliance/posture',
    };
    if (routes[id]) this.router.navigate([routes[id]]);
  }

  drillDown(route: string, queryParams?: Record<string, string>): void {
    this.router.navigate(['/compliance', route], { queryParams });
  }

  navigateIssue(issue: GrcRecord): void {
    if (issue.type === 'gap') this.drillDown('gaps');
    else if (issue.type === 'obligation') this.drillDown('obligations');
    else if (issue.type === 'control') this.drillDown('controls');
    else this.drillDown('frameworks');
  }

  isOverdueDate(date?: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  readonly complianceAgents: AgentInfo[] = [
    { id: 'A01', name: 'Control Mapper', nameAr: 'رابط الضوابط', icon: 'pi-sitemap', color: '#3b82f6', domain: 'Compliance', domainAr: 'الامتثال', autonomyLevel: 'hybrid', status: 'active' },
    { id: 'A04', name: 'Compliance Monitor', nameAr: 'مراقب الامتثال', icon: 'pi-shield', color: '#22c55e', domain: 'Compliance', domainAr: 'الامتثال', autonomyLevel: 'shadow_agent', status: 'active' },
  ];

  readonly complianceTransitions = [
    { from: 'not_assessed', to: 'in_progress' },
    { from: 'in_progress', to: 'assessed' },
    { from: 'assessed', to: 'compliant' },
    { from: 'assessed', to: 'non_compliant' },
    { from: 'non_compliant', to: 'remediating' },
    { from: 'remediating', to: 'assessed' },
    { from: 'compliant', to: 'not_assessed' },
  ];

  moduleKitConfig = computed<ModuleOverviewKitConfig>(() => ({
    moduleCode: 'compliance',
    tier: 'full',
    automationLevel: 'semi',
    slaHours: 168,
    transitions: this.complianceTransitions,
    currentStatus: 'in_progress',
    agents: this.complianceAgents,
    lang: this.isAr() ? 'ar' : 'en',
  }));

  complianceGaugeOptions = computed(() => {
    const s = this.overview$()?.summary;
    if (!s) return null;
    return buildComplianceGaugeOptions(s.overallScore || 0, 100);
  });
}
