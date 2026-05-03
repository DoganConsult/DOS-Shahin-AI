/**
 * Templates 5-9 — Reports, Settings, Assessments/Workflows,
 *   Reports Gallery, Onboarding/Empty State
 *
 * All use only IBM Carbon active components from dos.ui_carbon_components.
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  ButtonModule, ComboButtonModule, ContentSwitcherModule, DropdownModule,
  DatePickerModule, DatePickerInputModule, ToggleModule, InputModule,
  SliderModule, NumberModule, StructuredListModule, AccordionModule,
  ProgressBarModule, ProgressIndicatorModule, InlineLoadingModule,
  FileUploaderModule, BreadcrumbModule, LinkModule, ContainedListModule,
  CheckboxModule, SelectModule, RadioModule, CodeSnippetModule, GridModule
} from 'carbon-components-angular';
import {
  ModuleReport, ModuleSettingsSection, ModuleSetupStep, ModuleTab,
  ModuleNotification, ModuleRole, resolveViewMode, ModuleInsightPillars
} from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';

// ════════════════════════════════════════════════════════════════
// Template 5 — Reports Gallery
// ════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-evidence-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    DosInsightBarComponent,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    ButtonModule, ComboButtonModule, ContentSwitcherModule, DropdownModule,
    DatePickerModule, DatePickerInputModule, InlineLoadingModule,
    BreadcrumbModule, LinkModule, GridModule,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }
    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }
    </cds-tile>

    <div class="dmt-toolbar">
      <cds-content-switcher (selected)="viewSwitch.emit($event)">
        <button cdsContentSwitcherOption name="all">All</button>
        <button cdsContentSwitcherOption name="mine">My Reports</button>
        <button cdsContentSwitcherOption name="scheduled">Scheduled</button>
        @if (showAiReports) {
          <button cdsContentSwitcherOption name="ai">AI-Generated</button>
        }
      </cds-content-switcher>
      @if (viewMode() !== 'limited') {
        <cds-date-picker id="report-date-range" type="range">
          <cds-date-picker-input
            id="report-date-start" kind="from" label="From">
          </cds-date-picker-input>
          <cds-date-picker-input
            id="report-date-end" kind="to" label="To">
          </cds-date-picker-input>
        </cds-date-picker>
        <cds-combo-button [buttons]="exportActions" size="sm">Export</cds-combo-button>
      }
    </div>

    @if (loading) {
      <div class="dmt-report-grid">
        @for (n of [1,2,3,4,5,6]; track n) {
          <cds-tile class="dmt-report-card-skeleton"><div cdsSkeletonText [lines]="4"></div></cds-tile>
        }
      </div>
    }

    @if (!loading) {
      <div class="dmt-report-grid">
        @for (report of reports; track report.id) {
          <cds-clickable-tile class="dmt-report-card" (click)="reportClick.emit(report)">
            <div class="dmt-report-card-header">
              @if (report.aiGenerated) {
                <cds-ai-label kind="inline" size="sm">AI Generated</cds-ai-label>
              }
              <cds-tag [type]="statusTagType(report.status)">{{ report.status }}</cds-tag>
            </div>
            <h3 class="dmt-report-title">{{ report.title }}</h3>
            @if (report.description) { <p class="dmt-report-desc">{{ report.description }}</p> }
            <!-- Mini chart slot -->
            <ng-content [select]="'[dosReportChart=' + report.id + ']'"></ng-content>
            <div class="dmt-report-footer">
              @if (report.status === 'generating') {
                <cds-inline-loading description="Generating..."></cds-inline-loading>
              }
              @if (report.lastUpdated) {
                <span class="dmt-report-date">{{ report.lastUpdated }}</span>
              }
              @if (report.downloadUrl && report.status === 'ready') {
                <button cdsButton="ghost" size="sm" (click)="$event.stopPropagation(); downloadClick.emit(report)">
                  Download
                </button>
              }
            </div>
          </cds-clickable-tile>
        } @empty {
          <cds-tile class="dmt-empty-tile">
            <cds-ai-label kind="inline" size="sm">No reports found</cds-ai-label>
            <p>No reports match your current filter.</p>
          </cds-tile>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); }
    .dmt-toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); flex-wrap: wrap; }
    .dmt-report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; padding: 1rem; }
    .dmt-report-card { display: flex; flex-direction: column; min-height: 200px; }
    .dmt-report-card-skeleton { height: 200px; }
    .dmt-report-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .dmt-report-title { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; }
    .dmt-report-desc { font-size: 0.875rem; color: var(--cds-text-secondary); flex: 1; }
    .dmt-report-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 1rem; }
    .dmt-report-date { font-size: 0.75rem; color: var(--cds-text-secondary); }
    .dmt-empty-tile { text-align: center; padding: 3rem; grid-column: 1 / -1; }
  `]
})
export class ModuleReportsTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Reports';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() reports: ModuleReport[] = [];
  @Input() showAiReports = true;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() exportActions: Array<{ content: string; click: () => void }> = [
    { content: 'Export PDF', click: () => {} },
    { content: 'Export Excel', click: () => {} },
    { content: 'Export CSV', click: () => {} },
  ];

  @Output() reportClick = new EventEmitter<ModuleReport>();
  @Output() downloadClick = new EventEmitter<ModuleReport>();
  @Output() viewSwitch = new EventEmitter<unknown>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  statusTagType(status: string): string {
    return ({ ready: 'green', generating: 'blue', scheduled: 'teal', failed: 'red' } as Record<string, string>)[status] ?? 'gray';
  }
}


// ════════════════════════════════════════════════════════════════
// Template 6 — Module Settings
// ════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-module-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    DosInsightBarComponent,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    ButtonModule, ToggleModule, InputModule, SliderModule, NumberModule,
    StructuredListModule, AccordionModule, BreadcrumbModule, InlineLoadingModule,
    CodeSnippetModule, CheckboxModule, SelectModule, RadioModule, DropdownModule,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }
    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }
      @if (viewMode() === 'read-only' || viewMode() === 'limited') {
        <cds-tag type="gray">Read-only — write access required</cds-tag>
      }
    </cds-tile>

    <cds-tile class="dmt-settings-tile">
      <cds-tabs type="contained" [followFocus]="true">
        @for (section of sections; track section.id) {
          <cds-tab [id]="section.id" [heading]="section.label">
            <!-- Custom content per section via ng-content -->
            <ng-content [select]="'[dosSettingsSection=' + section.id + ']'"></ng-content>
          </cds-tab>
        }
      </cds-tabs>
    </cds-tile>

    @if (viewMode() === 'full') {
      <div class="dmt-save-bar">
        <button cdsButton="primary" [disabled]="saving" (click)="save.emit()">
          @if (saving) {
            <cds-inline-loading description="Saving..."></cds-inline-loading>
          } @else {
            Save Changes
          }
        </button>
        <button cdsButton="secondary" (click)="discard.emit()">Discard</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-settings-tile { padding: 0; margin-top: 1rem; }
    .dmt-save-bar { display: flex; gap: 0.5rem; padding: 1rem 1.5rem; background: var(--cds-layer); border-top: 1px solid var(--cds-border-subtle); margin-top: 1rem; }
  `]
})
export class ModuleSettingsTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Settings';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() saving = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() sections: ModuleSettingsSection[] = [];
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() save = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));
}


// ════════════════════════════════════════════════════════════════
// Template 7 — Assessments / Workflows (staged pipeline)
// ════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-workflow-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    DosInsightBarComponent,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    ButtonModule, ComboButtonModule, ProgressBarModule, ProgressIndicatorModule,
    ContainedListModule, StructuredListModule, BreadcrumbModule, LinkModule,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }
    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }

      <!-- Pipeline progress indicator -->
      <cds-progress-indicator [steps]="progressSteps" [current]="currentStage" spacing="equal" class="dmt-pipeline">
      </cds-progress-indicator>
    </cds-tile>

    <cds-tile class="dmt-assessments-tile">
      <cds-tabs type="line" [followFocus]="true">
        @for (tab of tabs; track tab.id) {
          <cds-tab [id]="tab.id" [heading]="tab.label">
            <ng-content [select]="'[dosAssessmentTab=' + tab.id + ']'"></ng-content>
          </cds-tab>
        }
      </cds-tabs>
    </cds-tile>

    <!-- Charts slot -->
    <div class="dmt-charts-row">
      <cds-tile class="dmt-chart-tile">
        <ng-content select="[dosAssessmentChartA]"></ng-content>
      </cds-tile>
      <cds-tile class="dmt-chart-tile">
        <ng-content select="[dosAssessmentChartB]"></ng-content>
      </cds-tile>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-pipeline { margin-top: 1rem; }
    .dmt-assessments-tile { padding: 0; margin-top: 1rem; }
    .dmt-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    .dmt-chart-tile { padding: 1rem; min-height: 240px; }
    @media (max-width: 768px) { .dmt-charts-row { grid-template-columns: 1fr; } }
  `]
})
export class ModuleAssessmentsTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Assessments';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() tabs: ModuleTab[] = [];
  @Input() progressSteps: Array<{ label: string; secondaryLabel?: string }> = [];
  @Input() currentStage = 0;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));
}


// ════════════════════════════════════════════════════════════════
// Template 8 — Onboarding / Empty State
// ════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-activation-journey',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    DosInsightBarComponent,
    TilesModule, ButtonModule, ProgressBarModule, BreadcrumbModule,
    NotificationModule, TagModule,
  ],
  template: `
    <cds-tile class="dmt-onboarding-tile">
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }

      <!-- Setup progress -->
      @if (steps.length) {
        <cds-progress-bar
          [value]="completedSteps"
          [max]="steps.length"
          size="md"
          [label]="completedSteps + '/' + steps.length + ' steps completed'"
          class="dmt-setup-bar">
        </cds-progress-bar>

        <div class="dmt-steps-list">
          @for (step of steps; track step.id; let i = $index) {
            <div class="dmt-step" [class.dmt-step--done]="step.completed">
              <div class="dmt-step-indicator">
                @if (step.completed) {
                  <span class="dmt-step-check">✓</span>
                } @else {
                  <span class="dmt-step-num">{{ i + 1 }}</span>
                }
              </div>
              <div class="dmt-step-content">
                <p class="dmt-step-label">{{ step.label }}</p>
                @if (step.description) { <p class="dmt-step-desc">{{ step.description }}</p> }
              </div>
              @if (!step.completed && step.route) {
                <button cdsButton="primary" size="sm" [routerLink]="step.route">
                  {{ step.actionLabel ?? 'Start' }}
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- Custom slot -->
      <ng-content></ng-content>
    </cds-tile>
  `,
  styles: [`
    :host { display: block; }
    .dmt-onboarding-tile { padding: 2rem; max-width: 700px; margin: 2rem auto; text-align: center; }
    .dmt-ai-headline { margin-bottom: 1rem; }
    .dmt-title { font-size: 2rem; font-weight: 300; margin: 0.5rem 0; }
    .dmt-subtitle { font-size: 1rem; color: var(--cds-text-secondary); margin: 0.5rem 0 2rem; }
    .dmt-setup-bar { margin-bottom: 2rem; }
    .dmt-steps-list { text-align: left; display: flex; flex-direction: column; gap: 0; }
    .dmt-step { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--cds-border-subtle); }
    .dmt-step--done { opacity: 0.6; }
    .dmt-step-indicator { width: 2rem; height: 2rem; border-radius: 50%; background: var(--cds-interactive); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
    .dmt-step--done .dmt-step-indicator { background: var(--cds-support-success); }
    .dmt-step-content { flex: 1; }
    .dmt-step-label { font-weight: 500; margin: 0 0 0.25rem; }
    .dmt-step-desc { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0; }
  `]
})
export class ModuleOnboardingTemplateComponent {
  @Input() title = 'Get Started';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() notification: ModuleNotification | null = null;
  @Input() steps: ModuleSetupStep[] = [];

  get completedSteps() { return this.steps.filter(s => s.completed).length; }
}
