/**
 * Template 9 — Posture Overview
 * Canonical Name: "Posture Overview"
 * Selector: dos-posture-overview
 * Story: "Here's your full landscape — maturity, distribution, and where you stand vs peers."
 *
 * 5 Pillars: Score trend / Regulatory exposure / Maturity gap / Treatment needed / Assessment basis
 *
 * IBM Carbon active: tiles · tabs · tag · ai-label · progress-bar · structured-list ·
 *   content-switcher · notification · skeleton · button · breadcrumb
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ContentSwitcherModule, ProgressBarModule,
  StructuredListModule, LinkModule, AccordionModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode, ModuleKpi, ModuleAction
} from './module-template.types';

export interface MaturityDomain {
  id: string;
  label: string;
  score: number;          // 0–5
  maxScore: number;       // typically 5
  trend?: 'up' | 'down' | 'stable';
  status?: 'critical' | 'warning' | 'success' | 'info';
  gaps?: string[];
}

export interface PostureKpi {
  label: string;
  value: string | number;
  benchmark?: string;
  delta?: string;
  deltaDirection?: 'up' | 'down';
  status?: 'critical' | 'warning' | 'success' | 'info';
  aiInsight?: string;
}

@Component({
  selector: 'dos-posture-overview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContentSwitcherModule, ProgressBarModule,
    StructuredListModule, LinkModule, AccordionModule,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead -->
    <cds-tile class="dpo-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="dpo-masthead-row">
        <div>
          @if (aiHeadline) { <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label> }
          <h1 class="dpo-title">{{ title }}</h1>
          @if (subtitle) { <p class="dpo-subtitle">{{ subtitle }}</p> }
        </div>
        @if (viewMode() !== 'limited') {
          <button cdsButton="primary" size="sm" (click)="primaryAction.emit()">
            {{ primaryActionLabel }}
          </button>
        }
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar -->
    <dos-insight-bar [pillars]="pillars" archetype="posture-overview"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- Score hero strip -->
    @if (loading) {
      <div class="dpo-kpi-strip">
        @for (n of [1,2,3,4]; track n) {
          <cds-tile><div cdsSkeletonText [lines]="3"></div></cds-tile>
        }
      </div>
    } @else {
      <div class="dpo-kpi-strip">
        @for (kpi of scoreKpis; track kpi.label) {
          <cds-tile class="dpo-kpi-card">
            <p class="dpo-kpi-label">{{ kpi.label }}</p>
            <p class="dpo-kpi-value" [class]="'dpo-kpi--' + (kpi.status ?? 'info')">{{ kpi.value }}</p>
            @if (kpi.benchmark) {
              <p class="dpo-kpi-bench">Benchmark: {{ kpi.benchmark }}</p>
            }
            @if (kpi.delta) {
              <span class="dpo-delta" [class]="'dpo-delta--' + (kpi.deltaDirection ?? 'neutral')">
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

    <!-- Main body: Maturity domains + chart slot -->
    <div class="dpo-body-grid">

      <!-- Maturity domain bars -->
      <cds-tile class="dpo-maturity-tile">
        <div class="dpo-section-header">
          <cds-ai-label kind="inline" size="sm">AI Maturity Assessment</cds-ai-label>
          <h3 class="dpo-section-title">Maturity by Domain</h3>
          <p class="dpo-section-desc">Scores are AI-computed from {{ evidenceBasis }}</p>
        </div>

        @if (loading) {
          @for (n of [1,2,3,4,5]; track n) {
            <div cdsSkeletonText [lines]="1" style="margin-bottom:1rem"></div>
          }
        } @else {
          @for (domain of maturityDomains; track domain.id) {
            <div class="dpo-domain-row">
              <div class="dpo-domain-label-row">
                <span class="dpo-domain-name">{{ domain.label }}</span>
                <div class="dpo-domain-meta">
                  <cds-tag [type]="domainTagType(domain.status)">
                    {{ domain.score }}/{{ domain.maxScore }}
                  </cds-tag>
                  @if (domain.trend) {
                    <cds-tag type="gray">{{ domain.trend === 'up' ? '↑' : domain.trend === 'down' ? '↓' : '→' }}</cds-tag>
                  }
                </div>
              </div>
              <cds-progress-bar
                [value]="(domain.score / domain.maxScore) * 100"
                [max]="100"
                size="sm"
                [label]="''">
              </cds-progress-bar>
              @if (domain.gaps?.length && viewMode() !== 'limited') {
                <div class="dpo-gaps">
                  @for (gap of domain.gaps!.slice(0,2); track gap) {
                    <span class="dpo-gap-chip">{{ gap }}</span>
                  }
                </div>
              }
            </div>
          } @empty {
            <p class="dpo-empty">No maturity data available yet.</p>
          }
        }
      </cds-tile>

      <!-- Right: chart slot + top gaps -->
      <div class="dpo-right-col">
        <!-- Chart slot (radar/spider chart) -->
        <cds-tile class="dpo-chart-tile">
          <p class="dpo-section-title">Distribution</p>
          <ng-content select="[dosPostureChart]"></ng-content>
        </cds-tile>

        <!-- Top gaps list -->
        @if (topGaps.length) {
          <cds-tile class="dpo-gaps-tile">
            <cds-ai-label kind="inline" size="sm">AI-identified top gaps</cds-ai-label>
            <cds-structured-list>
              @for (gap of topGaps.slice(0,5); track gap.label) {
                <cds-list-row>
                  <cds-list-column>
                    <cds-tag [type]="domainTagType(gap.severity)">{{ gap.severity }}</cds-tag>
                  </cds-list-column>
                  <cds-list-column>{{ gap.label }}</cds-list-column>
                </cds-list-row>
              }
            </cds-structured-list>
          </cds-tile>
        }
      </div>
    </div>

    <!-- Tabs: Details / History / Peers -->
    @if (showTabs) {
      <cds-tile class="dpo-tabs-tile">
        <cds-tabs type="line" [followFocus]="true">
          <cds-tab id="posture-details" heading="Details">
            <ng-content select="[dosPostureDetails]"></ng-content>
          </cds-tab>
          <cds-tab id="posture-history" heading="History">
            <ng-content select="[dosPostureHistory]"></ng-content>
          </cds-tab>
          @if (viewMode() !== 'limited') {
            <cds-tab id="posture-peers" heading="Peer Benchmark">
              <ng-content select="[dosPosturePeers]"></ng-content>
            </cds-tab>
          }
        </cds-tabs>
      </cds-tile>
    }
  `,
  styles: [`
    :host { display: block; }
    .dpo-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dpo-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .dpo-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dpo-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0; }

    .dpo-kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1px; margin: 0.5rem 0; }
    .dpo-kpi-card { padding: 1rem; }
    .dpo-kpi-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .dpo-kpi-value { font-size: 2.25rem; font-weight: 300; margin: 0; line-height: 1; }
    .dpo-kpi--critical { color: var(--cds-support-error); }
    .dpo-kpi--warning  { color: var(--cds-support-warning); }
    .dpo-kpi--success  { color: var(--cds-support-success); }
    .dpo-kpi-bench { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0; }
    .dpo-delta { font-size: 0.75rem; }
    .dpo-delta--up   { color: var(--cds-support-success); }
    .dpo-delta--down { color: var(--cds-support-error); }

    .dpo-body-grid { display: grid; grid-template-columns: 1fr 320px; gap: 1rem; margin-top: 1rem; }
    .dpo-maturity-tile { padding: 1.5rem; }
    .dpo-section-header { margin-bottom: 1.5rem; }
    .dpo-section-title { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
    .dpo-section-desc { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0; }
    .dpo-domain-row { margin-bottom: 1.25rem; }
    .dpo-domain-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .dpo-domain-name { font-size: 0.875rem; font-weight: 500; }
    .dpo-domain-meta { display: flex; gap: 0.25rem; }
    .dpo-gaps { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.375rem; }
    .dpo-gap-chip { font-size: 0.6875rem; background: var(--cds-layer-accent); padding: 0.125rem 0.5rem; border-radius: 9999px; color: var(--cds-text-secondary); }
    .dpo-empty { color: var(--cds-text-secondary); font-size: 0.875rem; }

    .dpo-right-col { display: flex; flex-direction: column; gap: 1rem; }
    .dpo-chart-tile { padding: 1rem; min-height: 200px; }
    .dpo-gaps-tile { padding: 1rem; }
    .dpo-tabs-tile { padding: 0; margin-top: 1rem; }

    @media (max-width: 1024px) { .dpo-body-grid { grid-template-columns: 1fr; } .dpo-right-col { display: none; } }
    @media (max-width: 768px) { .dpo-kpi-strip { grid-template-columns: 1fr 1fr; } }
  `]
})
export class PostureOverviewTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Posture Overview';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() scoreKpis: PostureKpi[] = [];
  @Input() maturityDomains: MaturityDomain[] = [];
  @Input() topGaps: Array<{ label: string; severity?: string }> = [];
  @Input() evidenceBasis = 'assessments and AI analysis';
  @Input() showTabs = true;
  @Input() primaryActionLabel = 'Run Assessment';
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() primaryAction = new EventEmitter<void>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  domainTagType(status?: string): string {
    return ({ critical: 'red', warning: 'orange', success: 'green', info: 'blue' } as Record<string, string>)[status ?? 'info'] ?? 'gray';
  }
}
