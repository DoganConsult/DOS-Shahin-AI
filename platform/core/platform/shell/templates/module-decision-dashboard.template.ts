/**
 * Template T1 — Decision Dashboard
 * Selector: dos-decision-dashboard
 * component_key: module.dashboard.page
 *
 * Story: "Here is everything you need to decide RIGHT NOW."
 * Answers: What changed? What is urgent? Who owns it? What is blocked? What next?
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ContainedListModule,
  StructuredListModule, LinkModule, ProgressBarModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole,
  resolveViewMode, ModuleAction
} from './module-template.types';

export interface DecisionKpi {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: 'up' | 'down';
  deltaMeaning?: 'positive' | 'negative' | 'neutral';
  status?: 'critical' | 'warning' | 'success' | 'info';
  aiInsight?: string;
}

export interface UrgentItem {
  id: string;
  title: string;
  owner?: string;
  dueIn?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'task' | 'approval' | 'evidence' | 'workflow' | 'agent';
  isBlocked?: boolean;
  blockReason?: string;
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  time: string;
  type?: 'create' | 'update' | 'approve' | 'ai' | 'escalate';
}

@Component({
  selector: 'dos-decision-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContainedListModule,
    StructuredListModule, LinkModule, ProgressBarModule,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- ── MASTHEAD: AI-generated decision headline ───────────────────── -->
    <cds-tile class="ddd-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <cds-ai-label kind="inline" size="sm" class="ddd-ai-headline-label">
        {{ aiHeadline }}
      </cds-ai-label>
      <h1 class="ddd-title">{{ headline }}</h1>
      <div class="ddd-masthead-row">
        <div class="ddd-masthead-tags">
          @for (tag of statusTags; track tag.label) {
            <cds-tag [type]="tagType(tag.severity)">{{ tag.label }}</cds-tag>
          }
        </div>
        @if (viewMode() !== 'limited' && primaryAction) {
          <button cdsButton="primary" size="sm"
            (click)="primaryAction!.action?.()">
            {{ primaryAction!.label }}
          </button>
        }
      </div>
    </cds-tile>

    <!-- ── 5-PILLAR INSIGHT BAR ───────────────────────────────────────── -->
    <dos-insight-bar [pillars]="pillars" archetype="decision-dashboard"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- ── KPI STRIP: 5 decision metrics ─────────────────────────────── -->
    @if (loading) {
      <div class="ddd-kpi-strip">
        @for (n of [1,2,3,4,5]; track n) {
          <cds-tile><div cdsSkeletonText [lines]="3"></div></cds-tile>
        }
      </div>
    } @else {
      <div class="ddd-kpi-strip">
        @for (kpi of kpis; track kpi.id) {
          <cds-tile class="ddd-kpi" [class]="'ddd-kpi--' + (kpi.status ?? 'info')">
            <p class="ddd-kpi-label">{{ kpi.label }}</p>
            <p class="ddd-kpi-value">{{ kpi.value }}</p>
            @if (kpi.delta) {
              <span class="ddd-kpi-delta"
                [class]="'ddd-delta--' + (kpi.deltaDir ?? 'neutral')">
                {{ kpi.delta }}
              </span>
            }
            @if (kpi.aiInsight) {
              <cds-ai-label kind="inline" size="sm">{{ kpi.aiInsight }}</cds-ai-label>
            }
          </cds-tile>
        }
      </div>
    }

    <!-- ── MAIN BODY ──────────────────────────────────────────────────── -->
    <div class="ddd-body">

      <!-- LEFT: Trend charts + blockers ────────────────────────────────── -->
      <div class="ddd-left">
        <!-- Chart slots: score movement / trend -->
        <cds-tile class="ddd-chart-tile">
          <div class="ddd-section-hd">
            <cds-ai-label kind="inline" size="sm">AI Trend Analysis</cds-ai-label>
            <p class="ddd-section-title">Score Movement</p>
          </div>
          <ng-content select="[dosDashTrendChart]"></ng-content>
        </cds-tile>

        <!-- WHAT IS BLOCKED? ─────────────────────────────────────────── -->
        <cds-tile class="ddd-blockers-tile">
          <p class="ddd-section-title ddd-section-title--warn">
            ⛔ What is Blocked?
          </p>
          @if (loading) {
            <div cdsSkeletonText [lines]="3"></div>
          } @else if (blockedItems.length === 0) {
            <p class="ddd-empty">No blockers — all workflows are moving.</p>
          } @else {
            <cds-contained-list label="" kind="on-page">
              @for (item of blockedItems; track item.id) {
                <cds-contained-list-item class="ddd-blocked-item">
                  <div class="ddd-blocked-row">
                    <cds-tag type="red">Blocked</cds-tag>
                    <div class="ddd-blocked-content">
                      <p class="ddd-blocked-title">{{ item.title }}</p>
                      @if (item.blockReason) {
                        <p class="ddd-blocked-reason">{{ item.blockReason }}</p>
                      }
                      @if (item.owner) {
                        <p class="ddd-blocked-owner">Owner: {{ item.owner }}</p>
                      }
                    </div>
                    @if (viewMode() !== 'limited') {
                      <button cdsButton="ghost" size="sm"
                        (click)="resolveBlock.emit(item)">
                        Resolve
                      </button>
                    }
                  </div>
                </cds-contained-list-item>
              } 
            </cds-contained-list>
          }
        </cds-tile>
      </div>

      <!-- RIGHT: AI NBA + urgent items ─────────────────────────────────── -->
      <div class="ddd-right">

        <!-- WHAT SHOULD I DO NOW? ────────────────────────────────────── -->
        <cds-tile class="ddd-nba-tile">
          <cds-ai-label kind="inline" size="sm">AI Next Best Actions</cds-ai-label>
          <p class="ddd-section-title">What Should I Do Now?</p>
          @if (loading) {
            <div cdsSkeletonText [lines]="4"></div>
          } @else {
            <cds-contained-list label="" kind="disclosed">
              @for (item of urgentItems.slice(0,7); track item.id) {
                <cds-contained-list-item>
                  <div class="ddd-urgent-row">
                    <cds-tag [type]="tagType(item.severity)">
                      {{ item.severity }}
                    </cds-tag>
                    <div class="ddd-urgent-content">
                      <p class="ddd-urgent-title">{{ item.title }}</p>
                      <div class="ddd-urgent-meta">
                        @if (item.owner) {
                          <span class="ddd-meta-chip">{{ item.owner }}</span>
                        }
                        @if (item.dueIn) {
                          <span class="ddd-meta-chip ddd-meta-chip--due">
                            Due {{ item.dueIn }}
                          </span>
                        }
                        <cds-tag type="gray">{{ item.type }}</cds-tag>
                      </div>
                    </div>
                    @if (viewMode() !== 'limited') {
                      <button cdsButton="primary" size="sm"
                        (click)="itemAction.emit(item)">
                        Act
                      </button>
                    }
                  </div>
                </cds-contained-list-item>
              } @empty {
                <cds-contained-list-item>
                  <p class="ddd-empty">All clear — no urgent actions.</p>
                </cds-contained-list-item>
              }
            </cds-contained-list>
          }
        </cds-tile>

        <!-- Agent status mini-card ───────────────────────────────────── -->
        @if (agentStatus) {
          <cds-tile class="ddd-agent-tile">
            <cds-ai-label kind="inline" size="sm">
              Module Agent {{ agentStatus.running ? '● Running' : '○ Idle' }}
            </cds-ai-label>
            <p class="ddd-agent-label">Last run: {{ agentStatus.lastRun }}</p>
            <div class="ddd-agent-stats">
              <span>{{ agentStatus.discoveries }} discoveries</span>
              <span>{{ agentStatus.proposals }} proposals</span>
            </div>
            <cds-progress-bar
              [value]="agentStatus.confidence"
              [max]="100" size="sm"
              [label]="'Confidence: ' + agentStatus.confidence + '%'">
            </cds-progress-bar>
          </cds-tile>
        }
      </div>
    </div>

    <!-- ── BOTTOM: Recent activity ────────────────────────────────────── -->
    <cds-tile class="ddd-activity-tile">
      <p class="ddd-section-title">Recent Activity</p>
      @if (loading) {
        <div cdsSkeletonText [lines]="4"></div>
      } @else {
        <cds-structured-list>
          @for (event of recentActivity.slice(0,8); track event.id) {
            <cds-list-row>
              <cds-list-column class="ddd-act-dot-col">
                <span class="ddd-act-dot"
                  [class]="'ddd-dot--' + (event.type ?? 'update')"></span>
              </cds-list-column>
              <cds-list-column>
                <strong>{{ event.actor }}</strong> {{ event.action }}
                <a cdsLink>{{ event.entity }}</a>
              </cds-list-column>
              <cds-list-column class="ddd-act-time">{{ event.time }}</cds-list-column>
            </cds-list-row>
          } @empty {
            <cds-list-row>
              <cds-list-column>No recent activity.</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      }
    </cds-tile>
  `,
  styles: [`
    :host { display: block; }

    /* Masthead */
    .ddd-masthead { padding: 1.5rem 2rem; }
    .ddd-ai-headline-label { margin-bottom: 0.5rem; }
    .ddd-title { font-size: 1.75rem; font-weight: 300; margin: 0.25rem 0 1rem; line-height: 1.2; }
    .ddd-masthead-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .ddd-masthead-tags { display: flex; gap: 0.375rem; flex-wrap: wrap; }

    /* KPI Strip */
    .ddd-kpi-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; margin-top: 0.5rem; }
    .ddd-kpi { padding: 1rem; }
    .ddd-kpi--critical { border-top: 3px solid var(--cds-support-error); }
    .ddd-kpi--warning  { border-top: 3px solid var(--cds-support-warning); }
    .ddd-kpi--success  { border-top: 3px solid var(--cds-support-success); }
    .ddd-kpi--info     { border-top: 3px solid var(--cds-interactive); }
    .ddd-kpi-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .ddd-kpi-value { font-size: 2rem; font-weight: 300; margin: 0; }
    .ddd-kpi-delta { font-size: 0.75rem; }
    .ddd-delta--up   { color: var(--cds-support-success); }
    .ddd-delta--down { color: var(--cds-support-error); }

    /* Body grid */
    .ddd-body { display: grid; grid-template-columns: 1fr 360px; gap: 1rem; margin-top: 1rem; }
    .ddd-left  { display: flex; flex-direction: column; gap: 1rem; }
    .ddd-right { display: flex; flex-direction: column; gap: 1rem; }

    /* Chart tile */
    .ddd-chart-tile { padding: 1.5rem; min-height: 240px; }
    .ddd-section-hd { margin-bottom: 1rem; }
    .ddd-section-title { font-size: 0.9375rem; font-weight: 600; margin: 0.25rem 0 0.75rem; }
    .ddd-section-title--warn { color: var(--cds-support-error); }

    /* Blockers */
    .ddd-blockers-tile { padding: 1rem; }
    .ddd-blocked-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; }
    .ddd-blocked-content { flex: 1; }
    .ddd-blocked-title { font-size: 0.875rem; font-weight: 500; margin: 0 0 0.25rem; }
    .ddd-blocked-reason { font-size: 0.75rem; color: var(--cds-support-error); margin: 0 0 0.125rem; }
    .ddd-blocked-owner { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0; }

    /* NBA / Urgent */
    .ddd-nba-tile { padding: 1rem; }
    .ddd-urgent-row { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.375rem 0; }
    .ddd-urgent-content { flex: 1; }
    .ddd-urgent-title { font-size: 0.875rem; font-weight: 500; margin: 0 0 0.25rem; }
    .ddd-urgent-meta { display: flex; gap: 0.25rem; flex-wrap: wrap; align-items: center; }
    .ddd-meta-chip { font-size: 0.6875rem; background: var(--cds-layer-accent); padding: 0.125rem 0.5rem; border-radius: 9999px; color: var(--cds-text-secondary); }
    .ddd-meta-chip--due { background: var(--cds-support-warning-inverse); color: var(--cds-support-warning-text); }

    /* Agent tile */
    .ddd-agent-tile { padding: 1rem; }
    .ddd-agent-label { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0.5rem 0 0.25rem; }
    .ddd-agent-stats { display: flex; gap: 1rem; font-size: 0.75rem; color: var(--cds-text-secondary); margin-bottom: 0.75rem; }

    /* Activity */
    .ddd-activity-tile { padding: 1rem; margin-top: 1rem; }
    .ddd-act-dot-col { width: 24px; }
    .ddd-act-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--cds-interactive); }
    .ddd-dot--create   { background: var(--cds-support-success); }
    .ddd-dot--approve  { background: var(--cds-support-success); }
    .ddd-dot--escalate { background: var(--cds-support-error); }
    .ddd-dot--ai       { background: var(--cds-ai-border); }
    .ddd-act-time { font-size: 0.75rem; color: var(--cds-text-disabled); min-width: 80px; text-align: right; }
    .ddd-empty { font-size: 0.875rem; color: var(--cds-text-secondary); padding: 0.5rem 0; }

    @media (max-width: 1200px) {
      .ddd-body { grid-template-columns: 1fr; }
      .ddd-right { display: none; }
    }
    @media (max-width: 768px) {
      .ddd-kpi-strip { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class DecisionDashboardTemplateComponent {
  @Input() eyebrow = '';
  @Input() headline = 'Your module posture needs attention';
  @Input() aiHeadline = 'AI found priority actions';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() statusTags: Array<{ label: string; severity?: string }> = [];
  @Input() kpis: DecisionKpi[] = [];
  @Input() urgentItems: UrgentItem[] = [];
  @Input() blockedItems: UrgentItem[] = [];
  @Input() recentActivity: ActivityEvent[] = [];
  @Input() agentStatus: {
    running: boolean; lastRun: string;
    discoveries: number; proposals: number; confidence: number;
  } | null = null;
  @Input() primaryAction: ModuleAction | null = null;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() itemAction = new EventEmitter<UrgentItem>();
  @Output() resolveBlock = new EventEmitter<UrgentItem>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  tagType(s?: string): string {
    return ({
      critical: 'red', high: 'orange', medium: 'yellow',
      low: 'teal', warning: 'orange', success: 'green'
    } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
}
