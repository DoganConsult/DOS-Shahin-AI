import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';

import {
  GovernanceContextSummary,
  ModuleOperatingState,
  InferredFact,
  ConfidenceDimension,
  RegulatorExplanation,
  DashboardPersonaProfile,
} from '../../models/onboarding.models';
import { InferredFactsExplainerComponent } from './inferred-facts-explainer.component';
import { ConfidenceHeatmapComponent, HeatmapDimension } from '../../../../../shared/components/status-indicators/confidence-heatmap.component';

/**
 * Governance Context Summary
 *
 * Displays the review stage's 6 inline sections in a focused tabbed layout:
 * - System Profile (complexity, version, active modules)
 * - Active Modules (module states grid)
 * - Shahin's Analysis (inferred facts with confirm action)
 * - Confidence Map (dimension heatmap)
 * - Your Regulatory World (landscape + personas)
 */
@Component({
    selector: 'app-governance-context-summary',
    imports: [CommonModule, TagModule, ProgressBarModule, ButtonModule, InferredFactsExplainerComponent, ConfidenceHeatmapComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="ctx" [class.rtl]="lang === 'ar'" *ngIf="hasAnyData()">
      <!-- Tab bar -->
      <div class="ctx-tabs" role="tablist"
        (keydown.arrowRight)="activeTab.set(Math.min(activeTab() + 1, tabs.length - 1))"
        (keydown.arrowLeft)="activeTab.set(Math.max(activeTab() - 1, 0))">
        <button
          *ngFor="let tab of tabs; let i = index"
          class="ctx-tab"
          [class.active]="activeTab() === i"
          (click)="activeTab.set(i)"
          role="tab"
          [attr.aria-selected]="activeTab() === i"
        >
          <i class="pi" [ngClass]="tab.icon"></i>
          <span>{{ lang === 'ar' ? tab.labelAr : tab.labelEn }}</span>
          <span class="ctx-tab-count" *ngIf="tab.count > 0">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Tab 0: System Profile -->
      <div class="ctx-panel" role="tabpanel" *ngIf="activeTab() === 0 && governanceContext">
        <div class="ctx-grid">
          <div class="ctx-card ctx-card-profile">
            <span class="ctx-label">{{ lang === 'ar' ? 'التعقيد' : 'Complexity' }}</span>
            <span class="ctx-value">{{ governanceContext.complexity }}</span>
          </div>
          <div class="ctx-card ctx-card-profile">
            <span class="ctx-label">{{ lang === 'ar' ? 'الإصدار' : 'Version' }}</span>
            <span class="ctx-value">v{{ governanceContext.contextVersion }}</span>
          </div>
          <div class="ctx-card ctx-card-profile">
            <span class="ctx-label">{{ lang === 'ar' ? 'الوحدات النشطة' : 'Active Modules' }}</span>
            <span class="ctx-value">{{ activeModuleCount }}/{{ moduleStates.length }}</span>
          </div>
        </div>
      </div>

      <!-- Tab 1: Active Modules -->
      <div class="ctx-panel" role="tabpanel" *ngIf="activeTab() === 1 && (moduleStates?.length ?? 0) > 0">
        <div class="ctx-modules">
          <div *ngFor="let m of (moduleStates ?? [])" class="ctx-mod" [attr.data-state]="m.state"
            [class.ctx-mod-off]="m.state === 'off'">
            <span class="ctx-mod-name" [class.ctx-mod-name-off]="m.state === 'off'">{{ m.module_code.replace('_', ' ') }}</span>
            <p-tag
              [value]="m.state"
              [severity]="m.state === 'on' ? 'success' : m.state === 'trial' ? 'warning' : 'danger'"
              [style]="{fontSize:'0.6875rem'}"
            />
            <small class="ctx-mod-source">{{ m.activation_source.replace('_', ' ') }}</small>
            <button class="ctx-mod-toggle" (click)="moduleToggled.emit({ moduleCode: m.module_code, state: m.state === 'off' ? 'on' : 'off' })"
              [attr.aria-label]="(lang === 'ar' ? 'تبديل ' : 'Toggle ') + m.module_code">
              <i class="pi" [ngClass]="m.state === 'off' ? 'pi-eye-slash' : 'pi-eye'"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Shahin's Analysis (Inferred Facts with Explainability) -->
      <div class="ctx-panel" role="tabpanel" *ngIf="activeTab() === 2">
        <app-inferred-facts-explainer
          [facts]="inferredFacts"
          [lang]="lang"
          (factConfirmed)="factConfirmed.emit($event)">
        </app-inferred-facts-explainer>
      </div>

      <!-- Tab 3: Confidence Map -->
      <div class="ctx-panel" role="tabpanel" *ngIf="activeTab() === 3">
        <app-confidence-heatmap
          [dimensions]="confidenceHeatmapDimensions"
          [lang]="lang"
          layout="grid">
        </app-confidence-heatmap>
      </div>

      <!-- Tab 4: Your Regulatory World -->
      <div class="ctx-panel" role="tabpanel" *ngIf="activeTab() === 4">
        <div *ngIf="(regulatorExplanations?.length ?? 0) > 0" class="ctx-regulators">
          <h4>
            <i class="pi pi-info-circle"></i>
            {{ lang === 'ar' ? 'المشهد التنظيمي' : 'Regulatory Landscape' }}
          </h4>
          <div *ngFor="let exp of (regulatorExplanations ?? [])" class="ctx-reg">
            <div class="ctx-reg-head">
              <span class="ctx-reg-code">{{ exp.regulator_code }}</span>
              <span class="ctx-reg-fw" *ngIf="exp.framework_code">{{ exp.framework_code }}</span>
            </div>
            <p class="ctx-reg-text">{{ lang === 'ar' ? exp.explanation_ar : exp.explanation_en }}</p>
          </div>
        </div>
        <div
          *ngIf="(dashboardPersonas?.length ?? 0) > 0"
          class="ctx-personas"
          [style.margin-top]="(regulatorExplanations?.length ?? 0) > 0 ? '1.5rem' : '0'"
        >
          <h4>
            <i class="pi pi-user"></i>
            {{ lang === 'ar'
              ? 'كيف سيختبر فريقك شاهين'
              : 'How Your Team Will Experience Shahin' }}
          </h4>
          <div class="ctx-persona-grid">
            <div *ngFor="let p of (dashboardPersonas ?? [])" class="ctx-persona">
              <h5>{{ lang === 'ar' ? p.label_ar : p.label_en }}</h5>
              <p>{{ lang === 'ar' ? p.description_ar : p.description_en }}</p>
              <div class="ctx-persona-mods" *ngIf="(p.priority_modules?.length ?? 0) > 0">
                <span *ngFor="let mod of p.priority_modules" class="ctx-mod-chip">{{ mod }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .ctx {
      margin-bottom: 1.5rem;
    }

    .ctx-tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid var(--border-subtle, rgba(var(--color-black-rgb), 0.06));
      margin-bottom: 1.25rem;
      overflow-x: auto;
    }

    .ctx-tab {
      background: none;
      border: none;
      padding: 0.6rem 1rem;
      cursor: pointer;
      font-size: var(--font-size-caption);
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 200ms;
    }

    .ctx-tab:hover {
      color: var(--text-heading);
    }

    .ctx-tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .ctx-tab-count {
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.12));
      color: var(--primary);
      font-size: var(--font-size-2xs);
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ctx-panel {
      animation: ctxFadeIn 0.25s ease both;
    }

    /* Tab 0: System Profile */
    .ctx-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }

    .ctx-card {
      text-align: center;
      padding: 0.75rem;
      background: var(--surface-ground, #f8fafc);
      border-radius: var(--radius, 8px);
      border: 1px solid var(--border-subtle);
    }

    .ctx-card-profile {
      background: var(--gradient-sky, linear-gradient(135deg, rgba(var(--primary-rgb), 0.06) 0%, rgba(var(--color-blue-40-rgb), 0.03) 100%));
    }

    .ctx-label {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .ctx-value {
      display: block;
      font-size: var(--font-size-xl);
      font-weight: 700;
      color: var(--primary);
      text-transform: capitalize;
      margin-top: 0.25rem;
    }

    /* Tab 1: Active Modules */
    .ctx-modules {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.5rem;
    }

    .ctx-mod {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.6rem;
      background: var(--surface-ground);
      border-radius: var(--radius);
      border: 1px solid var(--border-subtle);
      text-align: center;
    }

    .ctx-mod-off {
      opacity: 0.7;
    }

    .ctx-mod-name {
      font-size: var(--font-size-caption);
      font-weight: 600;
      text-transform: capitalize;
    }

    .ctx-mod-name-off {
      text-decoration: line-through;
    }

    .ctx-mod-source {
      font-size: var(--font-size-2xs);
      color: var(--text-muted);
      text-transform: capitalize;
    }

    .ctx-mod-toggle {
      background: none; border: 1px solid var(--border-subtle); border-radius: var(--radius-xs);
      padding: 0.15rem 0.35rem; cursor: pointer; font-size: var(--font-size-xs);
      color: var(--text-muted); transition: all 150ms;
    }
    .ctx-mod-toggle:hover { color: var(--primary); border-color: var(--primary); }

    /* Tab 4: Regulatory & Personas */
    .ctx-regulators h4,
    .ctx-personas h4 {
      font-size: var(--font-size-body-sm);
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.75rem;
    }

    .ctx-reg {
      padding: 0.75rem;
      border-radius: var(--radius);
      background: var(--surface-ground);
      border: 1px solid var(--border-subtle);
      margin-bottom: 0.5rem;
    }

    .ctx-reg-head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.375rem;
    }

    .ctx-reg-code {
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--primary);
      padding: 0.125rem 0.5rem;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      border-radius: var(--radius-xs);
    }

    .ctx-reg-fw {
      font-size: var(--font-size-2xs);
      color: var(--text-muted);
    }

    .ctx-reg-text {
      font-size: 0.82rem;
      color: var(--text-heading);
      line-height: 1.5;
      margin: 0;
    }

    .ctx-persona-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .ctx-persona {
      padding: 0.875rem;
      border-radius: var(--radius-md, 10px);
      background: white;
      border: 1px solid var(--border-subtle);
    }

    .ctx-persona h5 {
      margin: 0 0 0.25rem;
      font-size: var(--font-size-base);
      font-weight: 600;
    }

    .ctx-persona p {
      margin: 0 0 0.5rem;
      font-size: var(--font-size-caption);
      color: var(--text-muted);
      line-height: 1.4;
    }

    .ctx-persona-mods {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .ctx-mod-chip {
      padding: 0.125rem 0.4rem;
      border-radius: var(--radius-xs);
      font-size: var(--font-size-2xs);
      font-weight: 500;
      background: rgba(var(--module-accent-teal-rgb), 0.06);
      color: var(--teal-700, #0f766e);
      border: 1px solid rgba(var(--module-accent-teal-rgb), 0.15);
    }

    /* RTL support */
    .rtl {
      direction: rtl;
    }

    /* Panel enter animation */
    @keyframes ctxFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ctx-panel {
        animation: none !important;
      }
    }
  `]
})
export class GovernanceContextSummaryComponent {
  /** Full governance context summary from the review stage */
  @Input() governanceContext: GovernanceContextSummary | null = null;

  /** Module operating states (on/off/trial) */
  @Input() moduleStates: ModuleOperatingState[] = [];

  /** Inferred facts derived from onboarding answers */
  @Input() inferredFacts: InferredFact[] = [];

  /** Confidence scores per dimension */
  @Input() confidenceScores: ConfidenceDimension[] = [];

  /** Regulatory landscape explanations */
  @Input() regulatorExplanations: RegulatorExplanation[] = [];

  /** Dashboard persona profiles */
  @Input() dashboardPersonas: DashboardPersonaProfile[] = [];

  /** Active language for bilingual labels */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Emitted when the user confirms an inferred fact */
  @Output() factConfirmed = new EventEmitter<string>();

  /** Emitted when the user toggles a module on/off */
  @Output() moduleToggled = new EventEmitter<{ moduleCode: string; state: string }>();

  /** Index of the currently active tab (0-4) */
  activeTab = signal(0);

  /** Expose Math for template use */
  Math = Math;

  /** Tab definitions with icon, bilingual labels, and dynamic count badges */
  get tabs() {
    return [
      { icon: 'pi-database', labelEn: 'System Profile', labelAr: 'ملف النظام', count: this.governanceContext ? 1 : 0 },
      { icon: 'pi-th-large', labelEn: 'Active Modules', labelAr: 'الوحدات النشطة', count: this.moduleStates?.length ?? 0 },
      { icon: 'pi-bolt', labelEn: "Shahin's Analysis", labelAr: 'تحليل شاهين', count: this.inferredFacts?.length ?? 0 },
      { icon: 'pi-chart-bar', labelEn: 'Confidence Map', labelAr: 'خريطة الثقة', count: this.confidenceScores?.length ?? 0 },
      { icon: 'pi-globe', labelEn: 'Your Regulatory World', labelAr: 'عالمك التنظيمي', count: (this.regulatorExplanations?.length ?? 0) + (this.dashboardPersonas?.length ?? 0) },
    ];
  }

  /** Number of modules in 'on' or 'trial' state */
  get activeModuleCount(): number {
    return (this.moduleStates ?? []).filter(m => m.state === 'on' || m.state === 'trial').length;
  }

  /** Maps ConfidenceDimension[] to HeatmapDimension[] for the heatmap component */
  get confidenceHeatmapDimensions(): HeatmapDimension[] {
    return (this.confidenceScores ?? []).map(d => ({
      label: d.dimension,
      value: d.confidence_value,
    }));
  }

  /** Returns true if any data is available to display */
  hasAnyData(): boolean {
    return !!(
      this.governanceContext ||
      this.moduleStates?.length ||
      this.inferredFacts?.length ||
      this.confidenceScores?.length ||
      this.regulatorExplanations?.length ||
      this.dashboardPersonas?.length
    );
  }
}
