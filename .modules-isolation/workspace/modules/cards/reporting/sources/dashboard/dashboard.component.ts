import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectionStrategy, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SessionService } from '@app/dauth/session/session.service';
import { DashboardData } from '@app/core/models/grc.models';
import { WidgetRegistryService } from '@app/shared/widgets/widget-core/widget-infra/widget-registry.service';
import type { WidgetManifest } from '@app/shared/widgets/widget-core/core/models/widget-manifest.model';
import { registerAllWidgets } from '@app/shared/widgets/register-widgets';
import { getWidgetsForRole, resolveDashboardWidgets, filterWidgetsByProfile, DashboardRole } from '@app/shared/widgets/role-widget-map';
import { DrillThroughPanelComponent } from '@app/shared/widgets/features/drill-through/drill-through-panel.component';
import { DrillThroughService } from '@app/shared/widgets/features/drill-through/drill-through.service';
import { WidgetActionsService } from '@app/shared/widgets/widget-core/core/services/widget-actions.service';
import { LayoutPreferencesService } from '@app/shared/widgets/features/layout-grid/layout-preferences.service';
import { GridWidget } from '@app/shared/widgets/features/layout-grid/layout-grid.types';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { Subscription, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { resolveTheme, D3Theme } from '@app/shared/widgets/d3-charts';
import * as d3 from 'd3';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

interface AgentCard {
  id: string; name: string; nameAr: string; domain: string; domainAr: string; icon: string; color: string;
}

/** Compat shape for template bindings that still use WidgetDef field names */
interface WidgetDefCompat {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  component: unknown;
  defaultWidth: number;
  defaultHeight: number;
}

function manifestToCompat(m: import('@app/widgets/core/models/widget-manifest.model').WidgetManifest): WidgetDefCompat {
  return {
    id: m.id,
    nameEn: m.title,
    nameAr: m.titleAr ?? m.title,
    icon: m.icon ?? '',
    component: m.component,
    defaultWidth: Math.ceil(m.defaultSize.cols / 3) || 1,
    defaultHeight: m.defaultSize.rows,
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink, PageShellComponent, StatCardComponent,
    CardModule, SkeletonModule, TagModule, WidgetContainerComponent,
    LayoutGridComponent, DrillThroughPanelComponent, DisplayModeToggleComponent,
  ],
  template: `
    <app-page-shell
      icon="chart-bar"
      [title]="i18n.translate('dashboard.title')"
      [subtitle]="i18n.translate('app.tagline')"
      [breadcrumbs]="['Dashboard']"
      [loading]="!data">

      <ng-container *ngIf="data">
        <div aria-live="polite" class="sr-only" *ngIf="data">{{ i18n.translate('dashboard.lastUpdated') || 'Dashboard updated' }}</div>
        <div class="last-updated-bar" *ngIf="lastUpdated()">
          <span class="last-updated-text"><i class="pi pi-clock"></i> {{ i18n.translate('dashboard.lastUpdated') || 'Last updated' }}: {{ lastUpdated() | date:'HH:mm:ss' }}</span>
          <button class="refresh-btn" (click)="loadDashboard()" aria-label="Refresh dashboard"><i class="pi pi-refresh"></i></button>
        </div>
        <!-- Hijri Date & KSA Holiday Banner -->
        <div class="hijri-banner" *ngIf="hijriDate">
          <div class="hijri-date">
            <i class="pi pi-calendar"></i>
            <span>{{ hijriDate }}</span>
            <span class="gregorian-date">{{ today | date:'fullDate' }}</span>
          </div>
          <div class="holiday-badge" *ngIf="ksaHoliday">
            <i class="pi pi-star-fill"></i>
            <span>{{ ksaHoliday }}</span>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-row">
          <a routerLink="/frameworks" class="kpi-card kpi-sky">
            <div class="kpi-icon-ring"><i class="pi pi-sitemap"></i></div>
            <div class="kpi-value">{{ i18n.formatNumber(data.summary.totalFrameworks) }}</div>
            <div class="kpi-label">{{ i18n.translate('dashboard.totalFrameworks') }}</div>
          </a>
          <a routerLink="/risks" class="kpi-card kpi-red">
            <div class="kpi-icon-ring"><i class="pi pi-exclamation-triangle"></i></div>
            <div class="kpi-value">{{ i18n.formatNumber(data.summary.totalRisks) }}</div>
            <div class="kpi-label">{{ i18n.translate('dashboard.totalRisks') }}</div>
          </a>
          <a routerLink="/controls" class="kpi-card kpi-green">
            <div class="kpi-icon-ring"><i class="pi pi-lock"></i></div>
            <div class="kpi-value">{{ i18n.formatNumber(data.summary.totalControls) }}</div>
            <div class="kpi-label">{{ i18n.translate('dashboard.totalControls') }}</div>
          </a>
          <a routerLink="/policies" class="kpi-card kpi-purple">
            <div class="kpi-icon-ring"><i class="pi pi-file"></i></div>
            <div class="kpi-value">{{ i18n.formatNumber(data.summary.totalPolicies) }}</div>
            <div class="kpi-label">{{ i18n.translate('dashboard.totalPolicies') }}</div>
          </a>
        </div>

        <!-- KSA Compliance Posture Row -->
        <div class="section-title"><i class="pi pi-shield"></i> {{ i18n.translate('dashboard.ksaCompliancePosture') }}</div>
        <div class="ksa-posture-row">
          <a routerLink="/nca-assessment" class="ksa-card ksa-nca">
            <div class="ksa-icon"><i class="pi pi-shield"></i></div>
            <div class="ksa-value">{{ ksaPosture.ncaScore }}%</div>
            <div class="ksa-label">{{ i18n.translate('dashboard.ncaEccScore') }}</div>
          </a>
          <a routerLink="/regulator-heatmap" class="ksa-card ksa-reg">
            <div class="ksa-icon"><i class="pi pi-chart-bar"></i></div>
            <div class="ksa-value">{{ ksaPosture.regulatorsAssessed }}/{{ ksaPosture.regulatorsTotal }}</div>
            <div class="ksa-label">{{ i18n.translate('dashboard.regulators') }}</div>
          </a>
          <a routerLink="/framework-mapping" class="ksa-card ksa-fw">
            <div class="ksa-icon"><i class="pi pi-sitemap"></i></div>
            <div class="ksa-value">{{ ksaPosture.efficiencyRatio }}x</div>
            <div class="ksa-label">{{ i18n.translate('dashboard.frameworkEfficiency') }}</div>
          </a>
          <a routerLink="/dpia" class="ksa-card ksa-dpia">
            <div class="ksa-icon"><i class="pi pi-file-edit"></i></div>
            <div class="ksa-value">{{ ksaPosture.dpiaCount }}</div>
            <div class="ksa-label">{{ i18n.translate('dashboard.dpiaAssessments') }}</div>
          </a>
        </div>

        <!-- D3 Charts Row — theme-aware SVG -->
        <div class="charts-row">
          <div class="chart-card">
            <div class="chart-title"><i class="pi pi-chart-pie"></i> {{ i18n.translate('dashboard.complianceScore') }}</div>
            <div class="chart-wrap" #complianceChart></div>
          </div>
          <div class="chart-card">
            <div class="chart-title"><i class="pi pi-exclamation-triangle"></i> {{ i18n.translate('dashboard.risksByLevel') }}</div>
            <div class="chart-wrap" #riskChart></div>
          </div>
          <div class="chart-card">
            <div class="chart-title"><i class="pi pi-check-circle"></i> {{ i18n.translate('dashboard.controlStatus') }}</div>
            <div class="chart-wrap" #controlChart></div>
          </div>
        </div>

        <!-- AI Agent Toolkit -->
        <div class="section-title"><i class="pi pi-microchip-ai"></i> {{ i18n.translate('dashboard.aiAgentNetwork') }}</div>
        <div class="agents-grid">
          <a *ngFor="let agent of agents" [routerLink]="'/ai-hub'" class="agent-card" [style.--agent-color]="agent.color">
            <img loading="eager" [src]="agent.icon" [alt]="agent.name" class="agent-avatar" />
            <div class="agent-info">
              <div class="agent-name">{{ i18n.localize(agent.name, agent.nameAr) }}</div>
              <div class="agent-domain">{{ i18n.localize(agent.domain, agent.domainAr) }}</div>
            </div>
            <div class="agent-id">{{ agent.id }}</div>
          </a>
        </div>

        <!-- Widget Section — LayoutGrid + DisplayMode + SlideIn -->
        <div class="widget-section-header" *ngIf="activeWidgets.length">
          <div class="section-title"><i class="pi pi-th-large"></i> {{ i18n.translate('dashboard.dashboardWidgets') }}</div>
          <app-display-mode-toggle
            [currentMode]="displayMode"
            (modeChanged)="onDisplayModeChange($event)">
          </app-display-mode-toggle>
        </div>
        <div class="widget-grid">
          <app-widget-container *ngFor="let w of activeWidgets; let idx = index"
            [widgetComponent]="w.component"
            [icon]="w.icon"
            [nameAr]="w.nameAr"
            [nameEn]="w.nameEn"
            [width]="w.defaultWidth"
            [height]="w.defaultHeight"
            [displayMode]="displayMode"
            [widgetId]="w.id"
            (drillDown)="openDrillDown(w.id, $event)" />
        </div>

        <!-- Advanced drill-through panel (breadcrumbs, multi-level, payload-driven) -->
        <app-drill-through-panel />
      </ng-container>
    </app-page-shell>
  `,
  styles: [`
    /* KPI Cards — sky-blue elevated */
    .kpi-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .kpi-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: var(--space-lg); border-radius: var(--radius); text-decoration: none; color: inherit;
      background: var(--surface); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card); position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: var(--accent-color, var(--primary));
    }
    .kpi-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .kpi-sky::before { background: linear-gradient(90deg, var(--primary), var(--primary-light)); }
    .kpi-red::before { background: linear-gradient(90deg, var(--error), #f87171); }
    .kpi-green::before { background: linear-gradient(90deg, var(--success), var(--success)); }
    .kpi-purple::before { background: linear-gradient(90deg, var(--secondary, #8b5cf6), #a78bfa); }
    .kpi-icon-ring {
      width: 52px; height: 52px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
      backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      -webkit-backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      box-shadow: var(--glass-icon-shadow);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .kpi-card:hover .kpi-icon-ring {
      box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255, 255, 255, 0.5);
      transform: scale(1.12);
      backdrop-filter: blur(16px) saturate(1.8);
    }
    .kpi-sky .kpi-icon-ring { background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.22); color: var(--primary); }
    .kpi-red .kpi-icon-ring { background: rgba(239, 68, 68, 0.10); border: 1px solid rgba(239, 68, 68, 0.20); color: var(--error); }
    .kpi-green .kpi-icon-ring { background: rgba(34, 197, 94, 0.10); border: 1px solid rgba(34, 197, 94, 0.20); color: var(--success); }
    .kpi-purple .kpi-icon-ring { background: rgba(139, 92, 246, 0.10); border: 1px solid rgba(139, 92, 246, 0.20); color: var(--secondary, #8b5cf6); }
    .kpi-icon-ring .pi { font-size: var(--font-size-2xl); }
    .kpi-value { font-size: var(--font-size-4xl); font-weight: var(--font-black); color: var(--text-heading); letter-spacing: -0.02em; line-height: 1; margin-bottom: 6px; }
    .kpi-label { font-size: var(--font-size-sm); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

    /* KSA Posture Row */
    .ksa-posture-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .ksa-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: var(--space-lg); border-radius: var(--radius); text-decoration: none; color: inherit;
      background: var(--surface); border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-card); position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ksa-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
    .ksa-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .ksa-nca::before { background: linear-gradient(90deg, var(--primary-dark), var(--primary)); }
    .ksa-reg::before { background: linear-gradient(90deg, var(--success), var(--success)); }
    .ksa-fw::before { background: linear-gradient(90deg, #7c3aed, #a855f7); }
    .ksa-dpia::before { background: linear-gradient(90deg, #9333ea, #c084fc); }
    .ksa-icon {
      width: 44px; height: 44px; border-radius: var(--radius-pill); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;
      backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      -webkit-backdrop-filter: blur(var(--glass-icon-blur)) saturate(1.6);
      box-shadow: var(--glass-icon-shadow);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .ksa-card:hover .ksa-icon {
      box-shadow: var(--shadow-xl), inset 0 1px 0 rgba(255, 255, 255, 0.5);
      transform: scale(1.12);
      backdrop-filter: blur(16px) saturate(1.8);
    }
    .ksa-nca .ksa-icon { background: rgba(3, 105, 161, 0.12); border: 1px solid rgba(3, 105, 161, 0.22); color: var(--primary-dark); }
    .ksa-reg .ksa-icon { background: rgba(34, 197, 94, 0.10); border: 1px solid rgba(34, 197, 94, 0.20); color: var(--success); }
    .ksa-fw .ksa-icon { background: rgba(124, 58, 237, 0.10); border: 1px solid rgba(124, 58, 237, 0.20); color: #7c3aed; }
    .ksa-dpia .ksa-icon { background: rgba(147, 51, 234, 0.10); border: 1px solid rgba(147, 51, 234, 0.20); color: #9333ea; }
    .ksa-icon .pi { font-size: var(--font-size-xl); }
    .ksa-value { font-size: var(--font-size-xl); font-weight: var(--font-black); color: var(--text-heading); line-height: 1; margin-bottom: var(--space-xs); }
    .ksa-label { font-size: var(--font-size-xs); font-weight: var(--font-medium); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }

    /* Charts Row — D3 SVG containers */
    .charts-row {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .chart-card {
      background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
      padding: var(--space-lg); transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .chart-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .chart-title {
      font-size: var(--font-size-base); font-weight: var(--font-bold); color: var(--text-heading);
      margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);
    }
    .chart-title .pi {
      color: var(--primary); width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius); background: var(--glass-icon-bg);
      backdrop-filter: blur(var(--glass-icon-blur)); -webkit-backdrop-filter: blur(var(--glass-icon-blur));
      border: 1px solid var(--glass-icon-border); box-shadow: var(--glass-icon-shadow);
    }
    .chart-wrap { position: relative; height: 200px; }
    .chart-wrap svg { width: 100%; height: 100%; }

    /* Section Title */
    .section-title {
      font-size: var(--font-size-lg); font-weight: var(--font-black); color: var(--text-heading);
      margin-bottom: var(--space-md); display: flex; align-items: center; gap: var(--space-sm);
      letter-spacing: -0.01em;
    }
    .section-title .pi {
      color: var(--primary); font-size: var(--font-size-lg); width: 36px; height: 36px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: var(--radius-md); background: var(--glass-icon-bg);
      backdrop-filter: blur(var(--glass-icon-blur)); -webkit-backdrop-filter: blur(var(--glass-icon-blur));
      border: 1px solid var(--glass-icon-border); box-shadow: var(--glass-icon-shadow);
    }

    /* Agent Toolkit Grid */
    .agents-grid {
      display: grid; grid-template-columns: repeat(5, 1fr);
      gap: var(--space-md); margin-bottom: 28px;
    }
    .agent-card {
      display: flex; align-items: center; gap: 10px; padding: var(--space-md);
      background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border-subtle); box-shadow: var(--shadow-card);
      text-decoration: none; color: inherit; position: relative; overflow: hidden;
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .agent-card::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, var(--agent-color, var(--primary)) 0%, transparent 60%);
      opacity: 0; transition: opacity 250ms;
    }
    .agent-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-card-hover); }
    .agent-card:hover::after { opacity: 0.04; }
    .agent-avatar {
      width: 36px; height: 36px; border-radius: var(--radius-pill); object-fit: cover; flex-shrink: 0; position: relative; z-index: var(--z-base);
      border: 2px solid color-mix(in srgb, var(--agent-color, var(--primary)) 20%, transparent);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .agent-card:hover .agent-avatar {
      box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    .agent-info { flex: 1; min-width: 0; position: relative; z-index: var(--z-base); }
    .agent-name { font-size: var(--font-size-sm); font-weight: var(--font-bold); color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-domain { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .agent-id {
      font-size: var(--font-size-xs); font-weight: var(--font-bold); color: var(--agent-color, var(--primary));
      background: color-mix(in srgb, var(--agent-color, var(--primary)) 8%, transparent);
      padding: 2px 6px; border-radius: var(--space-xs); flex-shrink: 0; position: relative; z-index: var(--z-base);
    }

    /* Widget Section Header — title + display mode toggle */
    .widget-section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-md);
    }
    .widget-section-header .section-title { margin-bottom: 0; }

    /* Widget Grid */
    .widget-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-md); margin-bottom: 28px;
    }

    @media (max-width: 1200px) {
      .kpi-row { grid-template-columns: repeat(2, 1fr); }
      .charts-row { grid-template-columns: 1fr; }
      .agents-grid { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 768px) {
      .kpi-row { grid-template-columns: 1fr; }
      .agents-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .last-updated-bar {
      display: flex; align-items: center; justify-content: flex-end; gap: var(--space-sm);
      padding: var(--space-xs) var(--space-lg); margin-bottom: var(--space-sm);
      font-size: var(--font-size-sm); color: var(--text-muted);
    }
    .last-updated-text { display: flex; align-items: center; gap: 6px; }
    .refresh-btn {
      background: none; border: 1px solid var(--border); border-radius: var(--radius-sm);
      padding: 4px 8px; cursor: pointer; color: var(--primary); font-size: var(--font-size-sm);
    }
    .refresh-btn:hover { background: var(--surface-ice); }
    .hijri-banner {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-md);
      padding: var(--space-md) var(--space-lg); margin-bottom: var(--space-lg); border-radius: var(--radius);
      background: linear-gradient(135deg, var(--surface-ice), var(--surface-sunken)); border: 1px solid var(--border-primary);
    }
    .hijri-date { display: flex; align-items: center; gap: 10px; font-size: var(--font-size-base); font-weight: var(--font-medium); color: var(--primary-dark); }
    .hijri-date .pi { font-size: var(--font-size-md); }
    .gregorian-date { font-weight: var(--font-regular); color: var(--text-muted); font-size: var(--font-size-sm); }
    .holiday-badge {
      display: flex; align-items: center; gap: 6px; padding: var(--space-xs) 14px; border-radius: var(--radius-pill);
      background: var(--surface-amber); border: 1px solid var(--accent-gold); font-size: var(--font-size-sm); font-weight: var(--font-medium); color: #92400e;
    }
  `],
})
export class DashboardComponent implements OnInit, OnDestroy {
    private complianceSvc = inject(GrcComplianceService);
  @ViewChild('complianceChart') complianceChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('riskChart') riskChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('controlChart') controlChartRef!: ElementRef<HTMLDivElement>;

  data: DashboardData | null = null;
  activeWidgets: WidgetDefCompat[] = [];
  lastUpdated = signal<Date | null>(null);

  agents: AgentCard[] = [];
  hijriDate = '';
  ksaHoliday = '';
  today = new Date();

  // Widget layout state
  displayMode: 'compact' | 'expanded' = 'expanded';
  gridWidgets: GridWidget[] = [];

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private refreshSeconds = 60;
  private refreshPaused = false;
  private subscriptions: Subscription[] = [];
  private visibilityHandler = this.onVisibilityChange.bind(this);
  private wsSubscription: Subscription | null = null;
  private keycloakAuth = inject(GrcAuthService);
  private layoutPrefs = inject(LayoutPreferencesService);
  private live = inject(GrcLiveService);
  private drill = inject(DrillThroughService);
  private widgetActions = inject(WidgetActionsService);

  constructor(
    public i18n: I18nService,
    private widgetRegistry: WidgetRegistryService, private operationsSvc: GrcOperationsService
  ) {
    registerAllWidgets(this.widgetRegistry);
  }

  ksaPosture = { ncaScore: 0, regulatorsAssessed: 0, regulatorsTotal: 0, efficiencyRatio: '0', dpiaCount: 0 };

  ngOnInit(): void {
    this.computeHijriDate();
    this.loadDashboard();
    this.loadKSAPosture();
    this.loadAgents();
    this.resolveWidgets();
    this.loadLayoutPreferences();
    this.setupAutoRefresh();
    this.setupWebSocket();
    this.subscriptions.push(this.live.debounced(600).subscribe(() => this.loadDashboard()));
    this.subscriptions.push(
      this.widgetActions.stream$.subscribe((action) => {
        if (action.type === 'drilldown' && action.widgetId) {
          this.drill.open(action.widgetId, action.payload);
        }
      })
    );
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy(): void {
    this.clearAutoRefresh();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.subscriptions.forEach(s => s.unsubscribe());
    this.wsSubscription?.unsubscribe();
  }

  // ── Drill-through panel (header button or programmatic from widgets) ──

  openDrillDown(widgetId: string, payload?: Record<string, unknown>): void {
    this.drill.open(widgetId, payload);
  }

  // ── Display Mode Toggle ──

  onDisplayModeChange(mode: 'compact' | 'expanded'): void {
    this.displayMode = mode;
    const userId = this.keycloakAuth.userProfile()?.userId || 'default';
    this.layoutPrefs.save(userId, {
      widgets: this.gridWidgets,
      displayMode: mode,
      version: 2,
    });
  }

  // ── Data Loading ──

  loadDashboard(): void {
      const sub = this.operationsSvc.getDashboard().subscribe({
        next: (d: DashboardData) => {
          this.data = d;
          this.lastUpdated.set(new Date());
          setTimeout(() => this.renderD3Charts(), 100);
        },
        error: (e) => devError("[API]", e),
      });
      this.subscriptions.push(sub);
    }


  private loadAgents(): void {
    this.operationsSvc.getPublicAgents().subscribe({
      next: (res) => {
        this.agents = (res.agents || []).map((a) => ({
          id: a.id, name: a.name, nameAr: a.nameAr || a.name,
          domain: a.domain || '', domainAr: a.domainAr || '',
          icon: a.image || `agents/${a.id}.png`, color: a.color || '#0ea5e9',
        }));
      },
      error: (e) => devError("[API]", e),
    });
  }

  private loadKSAPosture(): void {
    this.complianceSvc.getKSAHeatmap().subscribe({
      next: (h) => {
        const regs = h.regulators || [];
        const assessed = regs.filter((r) => r.controlsAssessed > 0).length;
        const avgScore = regs.length > 0 ? Math.round(regs.reduce((s: number, r: GrcRecord) => s + r.overallScore, 0) / regs.length) : 0;
        this.ksaPosture.ncaScore = avgScore;
        this.ksaPosture.regulatorsAssessed = assessed;
        this.ksaPosture.regulatorsTotal = regs.length;
      },
      error: (e) => devError("[API]", e),
    });
    this.complianceSvc.getKSAFrameworkMapping().subscribe({
      next: (m) => { this.ksaPosture.efficiencyRatio = String(m.efficiencyRatio || '0'); },
      error: (e) => devError("[API]", e),
    });
    this.complianceSvc.listDPIAs().subscribe({
      next: (d) => { this.ksaPosture.dpiaCount = (d.assessments || []).length; },
      error: (e) => devError("[API]", e),
    });
  }

  // ── D3 Charts (theme-aware, replaces Chart.js) ──

  private renderD3Charts(): void {
    if (!this.data) return;
    const t = resolveTheme();
    const s = this.data.summary;

    this.renderComplianceDonut(t, s);
    this.renderRiskBar(t, s);
    this.renderControlBar(t, s);
  }

  private renderComplianceDonut(t: D3Theme, s: GrcRecord): void {
    const el = this.complianceChartRef?.nativeElement;
    if (!el) return;
    d3.select(el).selectAll('*').remove();

    const width = el.clientWidth || 300;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;
    const innerRadius = radius * 0.7;

    const total = s.controlStatus.implemented + s.controlStatus.in_progress + s.controlStatus.not_started;
    const pct = total > 0 ? Math.round((s.controlStatus.implemented / total) * 100) : 0;

    const data = [
      { label: this.i18n.translate('dashboardCharts.implemented'), value: s.controlStatus.implemented, color: t.primary },
      { label: this.i18n.translate('dashboardCharts.inProgress'), value: s.controlStatus.in_progress, color: t.warning },
      { label: this.i18n.translate('dashboardCharts.notStarted'), value: s.controlStatus.not_started, color: t.borderSubtle },
    ];

    const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2 - 10})`);

    const pie = d3.pie<unknown>().value((d: GrcRecord) => d.value).sort(null);
    const arc = d3.arc<unknown>().innerRadius(innerRadius).outerRadius(radius).cornerRadius(4);

    g.selectAll('path')
      .data(pie(data))
      .enter().append('path')
      .attr('d', arc)
      .attr('fill', (d: GrcRecord) => d.data.color)
      .style('transition', 'opacity 200ms')
      .on('mouseover', function(this: SVGPathElement) { d3.select(this).style('opacity', '0.8'); })
      .on('mouseout', function(this: SVGPathElement) { d3.select(this).style('opacity', '1'); });

    // Center text
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
      .attr('fill', t.textHeading).attr('font-size', '28px').attr('font-weight', t.fontBlack)
      .text(`${pct}%`);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('fill', t.textMuted).attr('font-size', '11px')
      .text(this.i18n.translate('dashboardCharts.compliance'));

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width / 2 - 80},${height - 14})`);
    data.forEach((d, i) => {
      const lg = legend.append('g').attr('transform', `translate(${i * 90},0)`);
      lg.append('circle').attr('r', 4).attr('fill', d.color);
      lg.append('text').attr('x', 8).attr('dy', '0.35em').attr('fill', t.textMuted).attr('font-size', '10px').text(d.label);
    });
  }

  private renderRiskBar(t: D3Theme, s: GrcRecord): void {
    const el = this.riskChartRef?.nativeElement;
    if (!el) return;
    d3.select(el).selectAll('*').remove();

    const width = el.clientWidth || 300;
    const height = 200;
    const margin = { top: 10, right: 20, bottom: 20, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const data = [
      { label: this.i18n.translate('dashboardCharts.critical'), value: s.risksByLevel.critical, color: t.error },
      { label: this.i18n.translate('dashboardCharts.high'), value: s.risksByLevel.high, color: '#f97316' },
      { label: this.i18n.translate('dashboardCharts.medium'), value: s.risksByLevel.medium, color: t.warning },
      { label: this.i18n.translate('dashboardCharts.low'), value: s.risksByLevel.low, color: t.success },
    ];

    const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(data.map((d: { label: string }) => d.label)).range([0, innerH]).padding(0.3);
    const x = d3.scaleLinear().domain([0, d3.max(data, (d: { value: number }) => d.value) || 1]).range([0, innerW]);

    // Y axis
    g.append('g').call(d3.axisLeft(y).tickSize(0))
      .selectAll('text').attr('fill', t.textHeading).attr('font-size', '12px').attr('font-weight', t.fontBold);
    g.select('.domain').remove();

    // Bars
    g.selectAll('rect')
      .data(data)
      .enter().append('rect')
      .attr('y', (d: GrcRecord) => y(d.label)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', (d: GrcRecord) => x(d.value))
      .attr('fill', (d: GrcRecord) => d.color)
      .attr('rx', 6);

    // Value labels
    g.selectAll('.val-label')
      .data(data)
      .enter().append('text')
      .attr('x', (d: GrcRecord) => x(d.value) + 6)
      .attr('y', (d: GrcRecord) => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', t.textMuted).attr('font-size', '11px')
      .text((d: GrcRecord) => d.value);
  }

  private renderControlBar(t: D3Theme, s: GrcRecord): void {
    const el = this.controlChartRef?.nativeElement;
    if (!el) return;
    d3.select(el).selectAll('*').remove();

    const width = el.clientWidth || 300;
    const height = 200;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const data = [
      { label: this.i18n.translate('dashboardCharts.implemented'), value: s.controlStatus.implemented, color: t.primary },
      { label: this.i18n.translate('dashboardCharts.inProgress'), value: s.controlStatus.in_progress, color: t.warning },
      { label: this.i18n.translate('dashboardCharts.notStarted'), value: s.controlStatus.not_started, color: t.borderSubtle },
    ];

    const svg = d3.select(el).append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map((d: { label: string }) => d.label)).range([0, innerW]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(data, (d: { value: number }) => d.value) || 1]).range([innerH, 0]);

    // X axis
    g.append('g').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(x).tickSize(0))
      .selectAll('text').attr('fill', t.textMuted).attr('font-size', '11px');
    g.selectAll('.domain').remove();

    // Y grid lines
    g.append('g').call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(() => ''))
      .selectAll('line').attr('stroke', t.borderSubtle).attr('stroke-dasharray', '3,3');
    g.select('.domain').remove();

    // Bars
    g.selectAll('rect')
      .data(data)
      .enter().append('rect')
      .attr('x', (d: GrcRecord) => x(d.label)!)
      .attr('width', x.bandwidth())
      .attr('y', (d: GrcRecord) => y(d.value))
      .attr('height', (d: GrcRecord) => innerH - y(d.value))
      .attr('fill', (d: GrcRecord) => d.color)
      .attr('rx', 6);

    // Value labels on top
    g.selectAll('.val-label')
      .data(data)
      .enter().append('text')
      .attr('x', (d: GrcRecord) => x(d.label)! + x.bandwidth() / 2)
      .attr('y', (d: GrcRecord) => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', t.textHeading).attr('font-size', '12px').attr('font-weight', t.fontBold)
      .text((d: GrcRecord) => d.value);
  }

  // ── Widget Resolution ──

  private resolveWidgets(): void {
    const role = this.getUserRole();
    const allManifests = this.widgetRegistry.list();
    const allWidgetIds = allManifests.map(m => m.id);
    const toCompat = (ids: string[]) =>
      allManifests.filter(m => ids.includes(m.id)).map(manifestToCompat);

    this.operationsSvc.getMyRoleProfile().subscribe({
      next: (profile) => {
        const profileWidgetIds = profile?.defaultWidgets ?? null;
        const resolvedIds = filterWidgetsByProfile(profileWidgetIds, allWidgetIds);
        this.activeWidgets = toCompat(resolvedIds);
      },
      error: () => {
        const sub = this.operationsSvc.getDashboardConfig().subscribe({
          next: (config) => {
            const savedWidgetIds: string[] | null = config?.widgets?.map((w) => w.id || w.type) ?? null;
            const resolvedIds = resolveDashboardWidgets(savedWidgetIds, role, allWidgetIds);
            this.activeWidgets = toCompat(resolvedIds);
          },
          error: () => {
            const roleWidgetIds = getWidgetsForRole(role, allWidgetIds);
            this.activeWidgets = toCompat(roleWidgetIds);
          }
        });
        this.subscriptions.push(sub);
      }
    });
  }

  // ── Layout Preferences ──

  private loadLayoutPreferences(): void {
    const userId = this.keycloakAuth.userProfile()?.userId || 'default';
    const sub = this.layoutPrefs.load(userId).subscribe((prefs) => {
      if (prefs) {
        this.gridWidgets = prefs.widgets;
        this.displayMode = prefs.displayMode || 'expanded';
      } else {
        const role = this.getUserRole();
        const defaults = this.layoutPrefs.getDefaults(role);
        this.gridWidgets = defaults.widgets;
        this.displayMode = defaults.displayMode;
      }
    });
    this.subscriptions.push(sub);
  }

  private getUserRole(): DashboardRole {
    return this.keycloakAuth.currentRole() as DashboardRole;
  }

  private setupAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (!this.refreshPaused) this.loadDashboard();
    }, this.refreshSeconds * 1000);
  }

  private clearAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.refreshPaused = true;
    } else {
      this.refreshPaused = false;
      this.loadDashboard();
    }
  }

  private setupWebSocket(): void {
    try {
      const wsUrl = (window as GrcRecord).__GRC_WS_URL__;
      if (!wsUrl || typeof wsUrl !== 'string') return;
      let parsed: URL;
      try {
        parsed = new URL(wsUrl);
      } catch {
        return;
      }
      if (!['ws:', 'wss:'].includes(parsed.protocol)) return;
      const ws = new WebSocket(parsed.toString());
      const sub = new Subscription(() => ws.close());
      ws.onmessage = (event: MessageEvent) => {
        try { const msg = JSON.parse(event.data); if (msg.type === 'kpi_update') this.loadDashboard(); } catch (e) { devError("[catch]", e); }
      };
      this.wsSubscription = sub;
    } catch (e) { devError("[catch]", e); }
  }

  private computeHijriDate(): void {
    try {
      const now = new Date();
      this.today = now;
      const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      this.hijriDate = hijriFormatter.format(now);

      // Check for KSA national holidays
      const month = now.getMonth() + 1;
      const day = now.getDate();
      if (month === 9 && day === 23) this.ksaHoliday = this.i18n.translate('dashboard.saudiNationalDay');
      if (month === 2 && day === 22) this.ksaHoliday = this.i18n.translate('dashboard.foundingDay');
    } catch (e) { devError("[catch]", e); }
  }

}
