/**
 * Template 13 — AI Risk Advisor
 * Canonical Name: "AI Risk Advisor"
 * Selector: dos-ai-advisor
 * Story: "Here's what AI sees — patterns, predictions, recommendations, and confidence."
 *
 * 5 Pillars: AI detected change / Business impact of AI finding / Predicted exposure / AI recommended action / Model evidence
 *
 * IBM Carbon active: tiles · tag · ai-label · notification · skeleton · structured-list ·
 *   contained-list · progress-bar · button · breadcrumb · tabs · modal
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ContainedListModule, StructuredListModule,
  ProgressBarModule, LinkModule, ModalModule, ContentSwitcherModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';

export interface AiRecommendation {
  id: string;
  title: string;
  reasoning: string;
  confidence: number;   // 0–100
  impact: 'critical' | 'high' | 'medium' | 'low';
  type: 'risk' | 'control' | 'treatment' | 'assessment' | 'alert';
  status: 'new' | 'reviewed' | 'accepted' | 'dismissed';
  actionLabel?: string;
  evidence?: string;
}

export interface AiPattern {
  id: string;
  label: string;
  description: string;
  affectedCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  firstDetected: string;
}

@Component({
  selector: 'dos-ai-advisor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContainedListModule, StructuredListModule,
    ProgressBarModule, LinkModule, ModalModule, ContentSwitcherModule,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead: AI model identity -->
    <cds-tile class="daa-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="daa-masthead-row">
        <div>
          <cds-ai-label kind="inline" size="sm" class="daa-ai-hero-label">
            {{ modelName }} — {{ modelVersion }}
          </cds-ai-label>
          <h1 class="daa-title">{{ title }}</h1>
          @if (subtitle) { <p class="daa-subtitle">{{ subtitle }}</p> }
          <div class="daa-meta-row">
            <cds-tag type="blue">{{ newCount }} New</cds-tag>
            <cds-tag type="orange">{{ pendingCount }} Pending Review</cds-tag>
            <span class="daa-last-run">Last run: {{ lastRunAt }}</span>
          </div>
        </div>
        @if (viewMode() !== 'limited') {
          <button cdsButton="primary" size="sm" [disabled]="running()" (click)="onRunAdvisor()">
            {{ running() ? 'Running...' : 'Run AI Advisor' }}
          </button>
        }
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar — the AI's story -->
    <dos-insight-bar [pillars]="pillars" archetype="ai-advisor"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- AI confidence overview strip -->
    <div class="daa-confidence-strip">
      @for (metric of confidenceMetrics; track metric.label) {
        <cds-tile class="daa-conf-tile">
          <p class="daa-conf-label">{{ metric.label }}</p>
          <p class="daa-conf-value">{{ metric.value }}</p>
          @if (metric.subtitle) { <p class="daa-conf-sub">{{ metric.subtitle }}</p> }
          @if (metric.confidence !== undefined) {
            <cds-progress-bar [value]="metric.confidence" [max]="100" size="sm" [label]="''"></cds-progress-bar>
          }
        </cds-tile>
      }
    </div>

    @if (loading) {
      <cds-tile style="margin-top:1rem">
        @for (n of [1,2,3]; track n) {
          <div cdsSkeletonText [lines]="3" style="margin-bottom:1.5rem"></div>
        }
      </cds-tile>
    }

    @if (!loading) {
      <div class="daa-body-grid">
        <!-- Main: recommendations -->
        <div class="daa-main-col">
          <cds-tile class="daa-recs-tile">
            <cds-tabs type="line" [followFocus]="true">
              <cds-tab id="ai-new" heading="New ({{ newCount }})">
                <cds-contained-list label="" kind="disclosed" class="daa-rec-list">
                  @for (rec of newRecs; track rec.id) {
                    <cds-contained-list-item class="daa-rec-item">
                      <ng-container [ngTemplateOutlet]="recTemplate" [ngTemplateOutletContext]="{ rec }"></ng-container>
                    </cds-contained-list-item>
                  } @empty {
                    <div class="daa-empty"><cds-ai-label kind="inline" size="sm">No new recommendations</cds-ai-label></div>
                  }
                </cds-contained-list>
              </cds-tab>
              <cds-tab id="ai-pending" heading="Pending Review ({{ pendingCount }})">
                <cds-contained-list label="" kind="on-page">
                  @for (rec of pendingRecs; track rec.id) {
                    <cds-contained-list-item>
                      <ng-container [ngTemplateOutlet]="recTemplate" [ngTemplateOutletContext]="{ rec }"></ng-container>
                    </cds-contained-list-item>
                  }
                </cds-contained-list>
              </cds-tab>
              <cds-tab id="ai-history" heading="History">
                <ng-content select="[dosAiHistory]"></ng-content>
              </cds-tab>
            </cds-tabs>
          </cds-tile>
        </div>

        <!-- Right: patterns + model info -->
        <div class="daa-right-col">
          @if (patterns.length) {
            <cds-tile class="daa-patterns-tile">
              <cds-ai-label kind="inline" size="sm">AI-Detected Patterns</cds-ai-label>
              <cds-structured-list>
                @for (pattern of patterns.slice(0,4); track pattern.id) {
                  <cds-list-row>
                    <cds-list-column>
                      <cds-tag [type]="tagType(pattern.severity)">{{ pattern.severity }}</cds-tag>
                    </cds-list-column>
                    <cds-list-column>
                      <p class="daa-pattern-label">{{ pattern.label }}</p>
                      <p class="daa-pattern-count">{{ pattern.affectedCount }} affected</p>
                    </cds-list-column>
                  </cds-list-row>
                }
              </cds-structured-list>
            </cds-tile>
          }

          <!-- Model info -->
          <cds-tile class="daa-model-tile">
            <cds-ai-label kind="inline" size="sm">{{ modelName }}</cds-ai-label>
            <p class="daa-model-version">{{ modelVersion }}</p>
            <p class="daa-model-basis">{{ modelBasis }}</p>
            @if (modelConfidence) {
              <cds-progress-bar [value]="modelConfidence" [max]="100" size="sm"
                [label]="'Model confidence: ' + modelConfidence + '%'">
              </cds-progress-bar>
            }
          </cds-tile>
        </div>
      </div>
    }

    <!-- Recommendation template -->
    <ng-template #recTemplate let-rec="rec">
      <div class="daa-rec">
        <div class="daa-rec-header">
          <cds-tag [type]="tagType(rec.impact)">{{ rec.impact }}</cds-tag>
          <cds-tag type="gray">{{ rec.type }}</cds-tag>
          <cds-ai-label kind="inline" size="sm">{{ rec.confidence }}% confidence</cds-ai-label>
        </div>
        <p class="daa-rec-title">{{ rec.title }}</p>
        <p class="daa-rec-reasoning">{{ rec.reasoning }}</p>
        @if (rec.evidence) {
          <p class="daa-rec-evidence">Source: {{ rec.evidence }}</p>
        }
        @if (viewMode() !== 'limited' && rec.status === 'new') {
          <div class="daa-rec-actions">
            <button cdsButton="primary" size="sm" (click)="recAction.emit({ rec, action: 'accept' })">
              {{ rec.actionLabel ?? 'Accept' }}
            </button>
            <button cdsButton="ghost" size="sm" (click)="recAction.emit({ rec, action: 'dismiss' })">
              Dismiss
            </button>
          </div>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .daa-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .daa-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .daa-ai-hero-label { margin-bottom: 0.5rem; }
    .daa-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .daa-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0; }
    .daa-meta-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .daa-last-run { font-size: 0.75rem; color: var(--cds-text-disabled); }

    .daa-confidence-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1px; margin-top: 0.5rem; }
    .daa-conf-tile { padding: 1rem; }
    .daa-conf-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .daa-conf-value { font-size: 1.75rem; font-weight: 300; margin: 0; }
    .daa-conf-sub { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0.125rem 0 0.5rem; }

    .daa-body-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1rem; margin-top: 1rem; }
    .daa-main-col { display: flex; flex-direction: column; }
    .daa-recs-tile { padding: 0; }
    .daa-rec-list { }
    .daa-rec-item { }
    .daa-empty { padding: 2rem; text-align: center; }

    .daa-rec { padding: 0.75rem 0; }
    .daa-rec-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .daa-rec-title { font-size: 0.9375rem; font-weight: 500; margin: 0 0 0.25rem; }
    .daa-rec-reasoning { font-size: 0.8125rem; color: var(--cds-text-secondary); margin: 0 0 0.25rem; line-height: 1.5; }
    .daa-rec-evidence { font-size: 0.75rem; color: var(--cds-text-disabled); margin: 0 0 0.5rem; }
    .daa-rec-actions { display: flex; gap: 0.5rem; }

    .daa-right-col { display: flex; flex-direction: column; gap: 1rem; }
    .daa-patterns-tile { padding: 1rem; }
    .daa-pattern-label { font-size: 0.875rem; font-weight: 500; margin: 0; }
    .daa-pattern-count { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0; }
    .daa-model-tile { padding: 1rem; }
    .daa-model-version { font-size: 0.8125rem; font-weight: 500; margin: 0.5rem 0 0.25rem; }
    .daa-model-basis { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0 0 0.75rem; }

    @media (max-width: 1024px) { .daa-body-grid { grid-template-columns: 1fr; } .daa-right-col { display: none; } }
    @media (max-width: 768px) { .daa-confidence-strip { grid-template-columns: 1fr 1fr; } }
  `]
})
export class AiAdvisorTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'AI Risk Advisor';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() recommendations: AiRecommendation[] = [];
  @Input() patterns: AiPattern[] = [];
  @Input() confidenceMetrics: Array<{ label: string; value: string | number; subtitle?: string; confidence?: number }> = [];
  @Input() modelName = 'DOS AI Engine';
  @Input() modelVersion = 'v2.1';
  @Input() modelBasis = 'Based on 47 risk records, 3 assessments';
  @Input() modelConfidence = 0;
  @Input() lastRunAt = '';
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() runAdvisor = new EventEmitter<void>();
  @Output() recAction = new EventEmitter<{ rec: AiRecommendation; action: 'accept' | 'dismiss' }>();

  running = computed(() => false);
  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  get newRecs() { return this.recommendations.filter(r => r.status === 'new'); }
  get pendingRecs() { return this.recommendations.filter(r => r.status === 'reviewed'); }
  get newCount() { return this.newRecs.length; }
  get pendingCount() { return this.pendingRecs.length; }

  tagType(s?: string): string {
    return ({ critical: 'red', high: 'orange', medium: 'yellow', low: 'teal' } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
  onRunAdvisor() { this.runAdvisor.emit(); }
}
