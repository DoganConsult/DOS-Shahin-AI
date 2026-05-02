import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ONBOARDING_PLATFORM, type OnboardingPlatformPort } from '../../ports/onboarding-platform.port';
import { ReviewDiffComponent } from '../review-diff.component';
import { GovernanceContextSummaryComponent } from '../preview/governance-context-summary.component';
import { WorkspacePreviewGridComponent } from '../preview/workspace-preview-grid.component';
import { PersonaConfirmationComponent } from '../preview/persona-confirmation.component';
import {
  ReviewModel,
  GovernanceContextSummary,
  ModuleOperatingState,
  WorkspacePreviewSection,
  RegulatorExplanation,
  DashboardPersonaProfile,
  GrcRecord,
} from '../../models/onboarding.models';

/** Event emitted when user requests to inline-edit a review field */
export interface InlineEditEvent {
  questionCode: string;
  currentValue: unknown;
}

/**
 * OnboardingReviewStageComponent
 *
 * Dumb presentation component for the review/confirmation stage.
 * Composes ReviewDiff, GovernanceContextSummary, WorkspacePreviewGrid,
 * PersonaConfirmation and provides the legal confirmation + approve action.
 */
@Component({
    selector: 'app-onboarding-review-stage',
    imports: [
        CommonModule, FormsModule, ButtonModule,
        ReviewDiffComponent, GovernanceContextSummaryComponent,
        WorkspacePreviewGridComponent, PersonaConfirmationComponent,
        TooltipModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="onb-stage-content">
      <div class="onb-stage-header">
        <h2><i class="pi pi-eye"></i> {{ lang === 'ar' ? '\u0645\u0639\u0627\u064A\u0646\u0629 \u0628\u064A\u0626\u0629 \u0627\u0644\u0639\u0645\u0644' : 'Your Workspace Reveal' }}</h2>
        <p class="onb-stage-subtitle">{{ lang === 'ar'
          ? '\u0628\u0646\u0649 \u0634\u0627\u0647\u064A\u0646 \u0628\u064A\u0626\u0629 \u0627\u0644\u062D\u0648\u0643\u0645\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0643. \u0631\u0627\u062C\u0639 \u0643\u0644 \u0634\u064A\u0621 \u0642\u0628\u0644 \u0627\u0644\u062A\u0641\u0639\u064A\u0644 \u2014 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0639\u062F\u064A\u0644 \u0641\u064A \u0623\u064A \u0648\u0642\u062A.'
          : 'Shahin has built your governance environment. Review everything before activation \u2014 you can adjust anything later.' }}</p>
      </div>

      <!-- Provisioning error banner (shown when a previous attempt failed) -->
      <div *ngIf="provisionError" class="onb-provision-error-banner">
        <i class="pi pi-exclamation-triangle"></i>
        <span>{{ provisionError }}</span>
        <span *ngIf="provisionCorrelationId" class="onb-provision-correlation">
          <span class="correlation-label">{{ i18n.translate('common.correlationId') || 'Correlation ID' }}:</span>
          <code>{{ provisionCorrelationId }}</code>
        </span>
        <button type="button" class="onb-provision-retry" (click)="retryProvision.emit()"
          [attr.aria-label]="i18n.translate('common.retry') || 'Retry'">
          <i class="pi pi-refresh"></i> {{ i18n.translate('common.retry') || 'Retry' }}
        </button>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="reviewLoading" class="onb-loading">
        <i class="pi pi-spin pi-spinner" style="font-size:1.5rem;color:var(--primary-color)"></i>
      </div>

      <ng-container *ngIf="review as r">
        <app-review-diff
          [review]="r"
          [isAr]="lang === 'ar'"
          (navigateToBlocker)="navigateToBlocker.emit($event)"
          (inlineEdit)="inlineEdit.emit({ questionCode: $event.questionCode, currentValue: $event.currentValue })">
        </app-review-diff>

        <!-- What-if Recompute -->
        <div class="onb-whatif" *ngIf="!recomputing">
          <button pButton
            [label]="lang === 'ar' ? '\u0645\u0627\u0630\u0627 \u0644\u0648 \u063A\u064A\u0651\u0631\u062A \u0627\u0644\u0642\u0637\u0627\u0639\u061F' : 'What if I change my sector?'"
            icon="pi pi-refresh" [text]="true" class="onb-whatif-btn"
            (click)="recompute.emit()"></button>
        </div>
        <div class="onb-whatif-loading" *ngIf="recomputing">
          <i class="pi pi-spin pi-spinner"></i>
          {{ lang === 'ar' ? '\u0634\u0627\u0647\u064A\u0646 \u064A\u0639\u064A\u062F \u0627\u0644\u062D\u0633\u0627\u0628...' : 'Shahin is recomputing...' }}
        </div>

        <!-- Governance Context Summary -->
        <app-governance-context-summary
          [governanceContext]="governanceContext"
          [moduleStates]="moduleStates"
          [inferredFacts]="inferredFacts"
          [confidenceScores]="confidenceScores"
          [regulatorExplanations]="regulatorExplanations"
          [dashboardPersonas]="dashboardPersonas"
          [lang]="lang"
          (factConfirmed)="factConfirmed.emit($event)"
          (moduleToggled)="moduleToggled.emit($event)">
        </app-governance-context-summary>

        <!-- What Shahin Has Prepared -->
        <app-workspace-preview-grid
          *ngIf="(workspacePreviewSections?.length ?? 0) > 0"
          [sections]="workspacePreviewSections ?? []"
          [lang]="lang">
        </app-workspace-preview-grid>

        <app-persona-confirmation
          *ngIf="(dashboardPersonas?.length ?? 0) > 0"
          [recommended]="dashboardPersonas[0]"
          [alternatives]="(dashboardPersonas ?? []).slice(1)"
          [lang]="lang"
          (personaConfirmed)="personaConfirmed.emit($event)">
        </app-persona-confirmation>

        <!-- Legal confirmation checkbox -->
        <div class="onb-legal-confirm">
          <label class="onb-legal-label">
            <input type="checkbox" [(ngModel)]="legalConfirmedInternal" (ngModelChange)="legalConfirmedChange.emit($event)" />
            <span>{{ lang === 'ar'
              ? '\u0623\u0624\u0643\u062F \u0623\u0646 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0635\u062D\u064A\u062D\u0629 \u0648\u0623\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 \u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u0627\u062D\u0629 \u0627\u0644\u0639\u0645\u0644 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u062F\u0627\u062F.'
              : 'I confirm all information provided is accurate and approve workspace creation based on this setup.' }}</span>
          </label>
        </div>

        <!-- Navigation buttons -->
        <div class="onb-stage-nav-buttons">
          <button pButton
            [label]="lang === 'ar' ? '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u062A\u0639\u062F\u064A\u0644' : 'Back to Edit'"
            [icon]="lang === 'ar' ? 'pi pi-chevron-right' : 'pi pi-chevron-left'"
            [iconPos]="lang === 'ar' ? 'right' : 'left'"
            [text]="true" (click)="backToEdit.emit()"></button>
          <span class="flex-grow-1"></span>
          <button pButton
            [label]="lang === 'ar' ? '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u062A\u0641\u0639\u064A\u0644 \u0634\u0627\u0647\u064A\u0646' : 'Approve & Activate Shahin'"
            icon="pi pi-power-off" severity="success"
            [disabled]="!legalConfirmed || !emailVerified"
            [loading]="provisioning"
            [pTooltip]="!emailVerified ? (lang === 'ar' ? 'يرجى التحقق من بريدك الإلكتروني أولاً' : 'Please verify your email first') : ''"
            tooltipPosition="top"
            (click)="approveAndProvision.emit()"></button>
        </div>
      </ng-container>
    </div>
  `,
    styles: [`
    .onb-stage-content { animation: stageTransition 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
    .onb-stage-header { margin-bottom: 1.75rem; }
    .onb-stage-header h2 {
      margin: 0 0 0.4rem; font-size: 1.4rem; display: flex; align-items: center; gap: 0.6rem;
      color: var(--text-heading, var(--text-color)); font-weight: 700; letter-spacing: -0.02em;
    }
    .onb-stage-header h2 i {
      width: 36px; height: 36px; border-radius: var(--radius, 8px);
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.12)); display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-md); color: var(--primary, #0f62fe);
    }
    .onb-stage-subtitle {
      margin: 0; color: var(--text-muted, var(--text-color-secondary)); font-size: var(--font-size-body-sm);
      line-height: 1.5; max-width: 640px;
    }
    .onb-loading { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 0; }
    .onb-provision-error-banner {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem;
      background: rgba(var(--module-accent-red-rgb), 0.06); border: 1px solid rgba(var(--module-accent-red-rgb), 0.2);
      border-radius: var(--radius-md, 8px); margin-bottom: 1rem; color: var(--text-color);
    }
    .onb-provision-error-banner i { color: var(--error, #ef4444); font-size: var(--font-size-body-md); }
    .onb-provision-correlation {
      margin-inline-start: auto; font-size: var(--font-size-sm); color: var(--text-color-secondary);
      display: flex; align-items: center; gap: 0.25rem;
    }
    .onb-provision-correlation code {
      font-family: monospace; font-size: var(--font-size-xs); padding: 0.1rem 0.3rem;
      background: var(--surface-ground); border-radius: var(--radius-xs, 4px);
    }
    .onb-provision-retry {
      display: inline-flex; align-items: center; gap: 0.3rem;
      background: none; border: 1px solid var(--error, #ef4444); border-radius: var(--radius, 6px);
      color: var(--error, #ef4444); font-size: var(--font-size-caption); padding: 0.25rem 0.6rem;
      cursor: pointer; transition: background 150ms;
    }
    .onb-provision-retry:hover { background: rgba(var(--module-accent-red-rgb), 0.08); }
    .onb-whatif { margin: 0.75rem 0; }
    .onb-whatif-btn { font-size: 0.82rem; }
    .onb-whatif-loading {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.82rem; color: var(--primary);
      padding: 0.5rem 0;
    }
    .onb-legal-confirm {
      margin: 1.5rem 0 0.5rem; padding: 1rem; border-radius: var(--radius);
      background: rgba(var(--module-accent-sky-rgb), 0.04); border: 1px solid rgba(var(--module-accent-sky-rgb), 0.15);
    }
    .onb-legal-label {
      display: flex; align-items: flex-start; gap: 0.6rem; cursor: pointer;
      font-size: var(--font-size-tag); color: var(--text-color); line-height: 1.5;
    }
    .onb-legal-label input[type="checkbox"] { margin-top: 3px; accent-color: var(--primary-color); }
    .onb-stage-nav-buttons {
      display: flex; align-items: center; gap: 0.75rem;
      margin-top: 1.75rem; padding-top: 1rem;
      border-top: 1px solid var(--border-subtle, var(--surface-border));
    }
    .onb-stage-nav-buttons button { border-radius: var(--radius-md, 10px); }
    .flex-grow-1 { flex-grow: 1; }
    @keyframes stageTransition {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (prefers-reduced-motion: reduce) {
      .onb-stage-content { animation: none !important; }
    }
  `]
})
export class OnboardingReviewStageComponent implements OnChanges {
  private readonly platform: OnboardingPlatformPort = inject(ONBOARDING_PLATFORM);
  readonly i18n = this.platform.i18n;

  /** Current language */
  @Input() lang: 'en' | 'ar' = 'en';

  /** The review model */
  @Input() review: ReviewModel | null = null;

  /** Whether review data is loading */
  @Input() reviewLoading = false;

  /** Whether provisioning is in progress */
  @Input() provisioning = false;

  /** Error message from a previous provision attempt */
  @Input() provisionError: string | null = null;

  /** Correlation ID for provision error tracking */
  @Input() provisionCorrelationId: string | null = null;

  /** Whether the "what-if" recompute is in progress */
  @Input() recomputing = false;

  /** Governance context summary */
  @Input() governanceContext: GovernanceContextSummary | null = null;

  /** Module operating states */
  @Input() moduleStates: ModuleOperatingState[] = [];

  /** Inferred facts from AI analysis */
  @Input() inferredFacts: GrcRecord[] = [];

  /** Confidence scores across domains */
  @Input() confidenceScores: GrcRecord[] = [];

  /** Regulator explanations */
  @Input() regulatorExplanations: RegulatorExplanation[] = [];

  /** Dashboard persona profiles */
  @Input() dashboardPersonas: DashboardPersonaProfile[] = [];

  /** Workspace preview sections */
  @Input() workspacePreviewSections: WorkspacePreviewSection[] = [];

  /** Whether the legal confirmation checkbox is checked */
  @Input() legalConfirmed = false;

  /** Whether the user's email has been verified */
  @Input() emailVerified = true;

  /** Internal model for two-way binding */
  legalConfirmedInternal = false;

  /** Emitted when legal confirmation changes */
  @Output() legalConfirmedChange = new EventEmitter<boolean>();

  /** Emitted to navigate to a blocker's stage */
  @Output() navigateToBlocker = new EventEmitter<GrcRecord>();

  /** Emitted to open inline edit for a review field */
  @Output() inlineEdit = new EventEmitter<InlineEditEvent>();

  /** Emitted to trigger "what-if" recompute */
  @Output() recompute = new EventEmitter<void>();

  /** Emitted when a fact is confirmed */
  @Output() factConfirmed = new EventEmitter<string>();

  /** Emitted when a persona is confirmed */
  @Output() personaConfirmed = new EventEmitter<string>();

  /** Emitted to navigate back to edit stages */
  @Output() backToEdit = new EventEmitter<void>();

  /** Emitted to approve and start provisioning */
  @Output() approveAndProvision = new EventEmitter<void>();

  /** Emitted to retry provisioning after error */
  @Output() retryProvision = new EventEmitter<void>();

  /** Emitted when user toggles a module state */
  @Output() moduleToggled = new EventEmitter<{ moduleCode: string; state: string }>();

  ngOnChanges(): void {
    this.legalConfirmedInternal = this.legalConfirmed;
  }
}
