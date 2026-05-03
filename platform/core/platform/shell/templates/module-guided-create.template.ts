/**
 * Template 12 — Guided Create / Edit
 * Canonical Name: "Guided Create / Edit"
 * Selector: dos-guided-create
 * Story: "Here's how to create this record — AI guides you through each step."
 *
 * 5 Pillars: Why you're creating this / What's at stake / Pre-filled by AI / Next step / Evidence used
 *
 * IBM Carbon active: tiles · progress-indicator · notification · skeleton ·
 *   breadcrumb · button · input · toggle · dropdown · checkbox · radio · inline-loading
 *   text-area · file-uploader · ai-label
 */
import {
  Component, Input, Output, EventEmitter, computed, signal,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, ProgressIndicatorModule, NotificationModule, ButtonModule,
  BreadcrumbModule, InputModule, DropdownModule, CheckboxModule,
  RadioModule, FileUploaderModule, InlineLoadingModule,
  ToggleModule, TagModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';

export interface FormStep {
  id: string;
  label: string;
  secondaryLabel?: string;
  description?: string;
  state?: 'complete' | 'current' | 'incomplete' | 'invalid';
  aiPrefilled?: boolean;  // AI pre-filled this step
}

@Component({
  selector: 'dos-guided-create',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, ProgressIndicatorModule, NotificationModule,
    BreadcrumbModule, ButtonModule, InputModule, DropdownModule, CheckboxModule,
    RadioModule, FileUploaderModule, InlineLoadingModule,
    ToggleModule, TagModule,
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
    <cds-tile class="dgc-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item [routerLink]="cancelRoute">{{ eyebrow }}</cds-breadcrumb-item>
        <cds-breadcrumb-item>{{ isEdit ? 'Edit' : 'Create' }} {{ entityName }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="dgc-masthead-row">
        <div>
          @if (aiHeadline) {
            <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label>
          }
          <h1 class="dgc-title">{{ isEdit ? 'Edit' : 'Create' }} {{ entityName }}</h1>
          @if (subtitle) { <p class="dgc-subtitle">{{ subtitle }}</p> }
          @if (aiPrefilled) {
            <cds-tag type="blue">AI pre-filled {{ aiPrefilledCount }} fields</cds-tag>
          }
        </div>
        <div class="dgc-masthead-actions">
          <button cdsButton="ghost" size="sm" [routerLink]="cancelRoute">Cancel</button>
        </div>
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar (why are you creating this / what's at stake) -->
    <dos-insight-bar [pillars]="pillars" archetype="guided-create"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <div class="dgc-body-grid">
      <!-- Left: step wizard -->
      <cds-tile class="dgc-steps-tile">
        <cds-progress-indicator
          [steps]="progressSteps"
          [current]="currentStep"
          [vertical]="true"
          spacing="equal">
        </cds-progress-indicator>
      </cds-tile>

      <!-- Main: step content -->
      <cds-tile class="dgc-form-tile">
        <!-- Step header -->
        <div class="dgc-step-header">
          @if (currentStepData?.aiPrefilled) {
            <cds-ai-label kind="inline" size="sm">AI pre-filled this step</cds-ai-label>
          }
          <h2 class="dgc-step-title">{{ currentStepData?.label }}</h2>
          @if (currentStepData?.description) {
            <p class="dgc-step-desc">{{ currentStepData!.description }}</p>
          }
        </div>

        <!-- Dynamic step content (host provides content per step) -->
        @for (step of steps; track step.id; let i = $index) {
          @if (i === currentStep) {
            <ng-content [select]="'[dosFormStep=' + step.id + ']'"></ng-content>
          }
        }

        <!-- Navigation footer -->
        <div class="dgc-form-footer">
          <button cdsButton="ghost" size="sm"
            [disabled]="currentStep === 0"
            (click)="prevStep()">Back</button>
          <div class="dgc-footer-right">
            @if (currentStep < steps.length - 1) {
              <button cdsButton="primary" size="sm" (click)="nextStep()">Next</button>
            } @else {
              <button cdsButton="primary" size="sm"
                [disabled]="saving()"
                (click)="onSubmit()">
                @if (saving()) {
                  <cds-inline-loading description="Saving..."></cds-inline-loading>
                } @else {
                  {{ isEdit ? 'Save Changes' : 'Create ' + entityName }}
                }
              </button>
            }
          </div>
        </div>
      </cds-tile>

      <!-- Right sidebar: AI assistant -->
      <div class="dgc-sidebar">
        @if (showAiAssist) {
          <cds-tile class="dgc-ai-assist-tile">
            <cds-ai-label kind="inline" size="sm">AI Assistant</cds-ai-label>
            <p class="dgc-ai-assist-title">{{ aiAssistTitle }}</p>
            <p class="dgc-ai-assist-text">{{ aiAssistText }}</p>
            @if (aiSuggestions.length) {
              <div class="dgc-suggestions">
                @for (suggestion of aiSuggestions; track suggestion) {
                  <button cdsButton="tertiary" size="sm" class="dgc-suggestion-btn"
                    (click)="suggestionClick.emit(suggestion)">
                    {{ suggestion }}
                  </button>
                }
              </div>
            }
          </cds-tile>
        }
        <ng-content select="[dosFormSidebar]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dgc-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dgc-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .dgc-masthead-actions { display: flex; gap: 0.5rem; }
    .dgc-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dgc-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.5rem; }

    .dgc-body-grid { display: grid; grid-template-columns: 200px 1fr 260px; gap: 1rem; margin-top: 0.5rem; align-items: start; }
    .dgc-steps-tile { padding: 1.5rem 1rem; }
    .dgc-form-tile { padding: 1.5rem; }
    .dgc-step-header { margin-bottom: 1.5rem; }
    .dgc-step-title { font-size: 1.25rem; font-weight: 400; margin: 0.5rem 0 0.25rem; }
    .dgc-step-desc { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0; }

    .dgc-form-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 2rem; margin-top: 2rem; border-top: 1px solid var(--cds-border-subtle); }
    .dgc-footer-right { display: flex; gap: 0.5rem; }

    .dgc-sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .dgc-ai-assist-tile { padding: 1rem; }
    .dgc-ai-assist-title { font-size: 0.875rem; font-weight: 600; margin: 0.5rem 0 0.25rem; }
    .dgc-ai-assist-text { font-size: 0.8125rem; color: var(--cds-text-secondary); line-height: 1.5; margin: 0; }
    .dgc-suggestions { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem; }
    .dgc-suggestion-btn { width: 100%; text-align: left; justify-content: flex-start; }

    @media (max-width: 1200px) { .dgc-body-grid { grid-template-columns: 200px 1fr; } .dgc-sidebar { display: none; } }
    @media (max-width: 768px) { .dgc-body-grid { grid-template-columns: 1fr; } .dgc-steps-tile { display: none; } }
  `]
})
export class GuidedCreateTemplateComponent {
  @Input() eyebrow = '';
  @Input() entityName = 'Record';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() isEdit = false;
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() steps: FormStep[] = [];
  @Input() currentStep = 0;
  @Input() aiPrefilled = false;
  @Input() aiPrefilledCount = 0;
  @Input() showAiAssist = true;
  @Input() aiAssistTitle = 'AI is helping you';
  @Input() aiAssistText = 'Based on your previous entries, AI has suggested values for this step.';
  @Input() aiSuggestions: string[] = [];
  @Input() cancelRoute = '../';
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() submit = new EventEmitter<void>();
  @Output() stepChange = new EventEmitter<number>();
  @Output() suggestionClick = new EventEmitter<string>();

  saving = signal(false);

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  get progressSteps() {
    return this.steps.map((s, i) => ({
      label: s.label,
      secondaryLabel: s.secondaryLabel ?? '',
      state: i < this.currentStep ? 'complete' : i === this.currentStep ? 'current' : 'incomplete' as const,
    }));
  }

  get currentStepData(): FormStep | undefined {
    return this.steps[this.currentStep];
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.stepChange.emit(++this.currentStep);
    }
  }
  prevStep() {
    if (this.currentStep > 0) {
      this.stepChange.emit(--this.currentStep);
    }
  }
  onSubmit() {
    this.saving.set(true);
    this.submit.emit();
    setTimeout(() => this.saving.set(false), 2000);
  }
}
