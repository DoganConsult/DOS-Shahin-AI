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
  ModuleNotification, ModuleRole, resolveViewMode, ModuleInsightPillars, ModuleAction
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

    <dos-insight-bar [pillars]="pillars" archetype="evidence-reports"
      (actionClick)="triggerAction(pillars?.nextAction ?? null)"></dos-insight-bar>

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
        @for (action of exportActions; track action.actionKey || action.commandKey || action.route || action.label) {
          <button cdsButton="tertiary" size="sm" (click)="triggerAction(action)">
            {{ action.label }}
          </button>
        }
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
  @Input() pillars: ModuleInsightPillars | null = null;

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
  @Input() exportActions: ModuleAction[] = [];

  @Output() reportClick = new EventEmitter<ModuleReport>();
  @Output() downloadClick = new EventEmitter<ModuleReport>();
  @Output() viewSwitch = new EventEmitter<unknown>();
  @Output() actionTriggered = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  statusTagType(status: string): string {
    return ({ ready: 'green', generating: 'blue', scheduled: 'teal', failed: 'red' } as Record<string, string>)[status] ?? 'gray';
  }

  triggerAction(action: ModuleAction | null, payload?: Record<string, unknown>): void {
    if (!action) return;
    if (action.actionKey) {
      this.actionTriggered.emit({ key: action.actionKey, payload });
      return;
    }
    if (action.commandKey) {
      this.actionTriggered.emit({ key: action.commandKey, payload });
      return;
    }
    if (action.route) {
      this.actionTriggered.emit({ key: 'navigate', payload: { path: action.route, ...(payload ?? {}) } });
    }
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
      @if (statusTags.length) {
        <div class="dmt-settings-tags">
          @for (tag of statusTags; track tag.label) {
            <cds-tag [type]="tagType(tag.severity)">{{ tagLabel(tag) }}</cds-tag>
          }
        </div>
      }
      @if (primaryAction?.route && primaryAction?.label && viewMode() === 'full') {
        <div class="dmt-settings-masthead-actions">
          <button cdsButton="primary" size="sm" [routerLink]="[primaryAction.route]">
            {{ actionLabel(primaryAction) }}
          </button>
        </div>
      }
      @if (viewMode() === 'read-only' || viewMode() === 'limited') {
        <cds-tag type="gray">{{ uiText(readOnlyLabel, readOnlyLabelAr) }}</cds-tag>
      }
    </cds-tile>

    <dos-insight-bar [pillars]="pillars" archetype="module-settings"
      (actionClick)="triggerAction(nextActionAsModuleAction())"></dos-insight-bar>

    <cds-tile class="dmt-settings-tile">
      @if (loading) {
        <div class="dmt-settings-loading">
          <div cdsSkeletonText [lines]="1" heading></div>
          <div cdsSkeletonText [lines]="4"></div>
        </div>
      } @else if (!sections?.length) {
        <div class="dmt-settings-empty">
          <h3>{{ uiText(emptyStateTitle, emptyStateTitleAr) }}</h3>
          <p>{{ uiText(emptyStateDescription, emptyStateDescriptionAr) }}</p>
        </div>
      } @else {
        <cds-tabs type="contained" [followFocus]="true">
          @for (section of sections; track section.id) {
            <cds-tab [id]="section.id" [heading]="sectionLabel(section)">
              <div class="dmt-settings-section">
                @if (sectionDescription(section)) {
                  <p class="dmt-settings-section__desc">{{ sectionDescription(section) }}</p>
                }
                @if (section.items?.length) {
                  <cds-structured-list class="dmt-settings-list">
                    <cds-list-header>
                      <cds-list-column>{{ uiText(settingLabelHeader, settingLabelHeaderAr) }}</cds-list-column>
                      <cds-list-column>{{ uiText(settingValueHeader, settingValueHeaderAr) }}</cds-list-column>
                      <cds-list-column></cds-list-column>
                    </cds-list-header>
                    @for (item of section.items; track item.id) {
                      <cds-list-row>
                        <cds-list-column>
                          <div class="dmt-settings-item__label">{{ settingsItemLabel(item) }}</div>
                          @if (settingsItemHint(item)) {
                            <div class="dmt-settings-item__hint">{{ settingsItemHint(item) }}</div>
                          }
                        </cds-list-column>
                        <cds-list-column>{{ settingsItemValue(item) }}</cds-list-column>
                        <cds-list-column>
                          @if (item.status) {
                            <cds-tag [type]="tagType(item.status)">{{ settingsItemStatus(item.status) }}</cds-tag>
                          }
                        </cds-list-column>
                      </cds-list-row>
                    }
                  </cds-structured-list>
                }
              </div>
              <ng-content [select]="'[dosSettingsSection=' + section.id + ']'"></ng-content>
            </cds-tab>
          }
        </cds-tabs>
      }
    </cds-tile>

    @if (viewMode() === 'full') {
      <div class="dmt-save-bar">
        <button cdsButton="primary" [disabled]="saving" (click)="onSaveClick()">
          @if (saving) {
            <cds-inline-loading [description]="uiText(savingLabel, savingLabelAr)"></cds-inline-loading>
          } @else {
            {{ uiText(saveLabel, saveLabelAr) }}
          }
        </button>
        <button cdsButton="secondary" (click)="onDiscardClick()">{{ uiText(discardLabel, discardLabelAr) }}</button>
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
    .dmt-settings-tags { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .dmt-settings-masthead-actions { margin-top: 1rem; }
    .dmt-settings-tile { padding: 0; margin-top: 1rem; }
    .dmt-settings-section { padding: 1rem 1.5rem; }
    .dmt-settings-section__desc { margin: 0 0 0.75rem; color: var(--cds-text-secondary); }
    .dmt-settings-list { margin-top: 0.5rem; }
    .dmt-settings-item__label { font-weight: 600; }
    .dmt-settings-item__hint { margin-top: 0.25rem; color: var(--cds-text-helper); font-size: var(--cds-label-01-font-size); }
    .dmt-settings-loading { padding: 1rem 1.5rem; }
    .dmt-settings-empty { padding: 1rem 1.5rem; color: var(--cds-text-secondary); }
    .dmt-save-bar { display: flex; gap: 0.5rem; padding: 1rem 1.5rem; background: var(--cds-layer); border-top: 1px solid var(--cds-border-subtle); margin-top: 1rem; }
  `]
})
export class ModuleSettingsTemplateComponent {
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() eyebrow = '';

  @Input() title = 'Settings';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() saving = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() sections: ModuleSettingsSection[] = [];
  @Input() statusTags: Array<{ label: string; labelAr?: string; severity?: string }> = [];
  @Input() primaryAction: ModuleAction | null = null;
  @Input() readOnlyLabel = 'Read-only - write access required';
  @Input() readOnlyLabelAr = 'للقراءة فقط - يتطلب صلاحية تعديل';
  @Input() saveLabel = 'Save changes';
  @Input() saveLabelAr = 'حفظ التغييرات';
  @Input() savingLabel = 'Saving...';
  @Input() savingLabelAr = 'جاري الحفظ...';
  @Input() discardLabel = 'Discard';
  @Input() discardLabelAr = 'تجاهل';
  @Input() settingLabelHeader = 'Setting';
  @Input() settingLabelHeaderAr = 'الإعداد';
  @Input() settingValueHeader = 'Current value';
  @Input() settingValueHeaderAr = 'القيمة الحالية';
  @Input() emptyStateTitle = 'No settings available';
  @Input() emptyStateTitleAr = 'لا توجد إعدادات متاحة';
  @Input() emptyStateDescription = 'No settings contract has been published for this route.';
  @Input() emptyStateDescriptionAr = 'لم يتم نشر عقد إعدادات لهذه الصفحة.';
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() save = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();
  @Output() discard = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();
  @Output() actionTriggered = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  private isRtl(): boolean {
    return typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  }

  uiText(en: string, ar?: string): string {
    return this.isRtl() ? (ar ?? en) : en;
  }

  sectionLabel(section: ModuleSettingsSection): string {
    return this.isRtl() ? (section.labelAr ?? section.label) : section.label;
  }

  sectionDescription(section: ModuleSettingsSection): string {
    if (this.isRtl()) return section.descriptionAr ?? section.description ?? '';
    return section.description ?? section.descriptionAr ?? '';
  }

  settingsItemLabel(item: NonNullable<ModuleSettingsSection['items']>[number]): string {
    return this.isRtl() ? (item.labelAr ?? item.label) : item.label;
  }

  settingsItemValue(item: NonNullable<ModuleSettingsSection['items']>[number]): string {
    return this.isRtl() ? (item.valueAr ?? item.value) : item.value;
  }

  settingsItemHint(item: NonNullable<ModuleSettingsSection['items']>[number]): string {
    if (this.isRtl()) return item.hintAr ?? item.hint ?? '';
    return item.hint ?? item.hintAr ?? '';
  }

  settingsItemStatus(status?: string): string {
    if (!status) return '';
    const labels: Record<string, { en: string; ar: string }> = {
      success: { en: 'Configured', ar: 'مُفعّل' },
      warning: { en: 'Review needed', ar: 'يحتاج مراجعة' },
      critical: { en: 'Action required', ar: 'يتطلب إجراء' },
      info: { en: 'Info', ar: 'معلومة' },
      neutral: { en: 'Neutral', ar: 'محايد' },
    };
    const hit = labels[status] ?? { en: status, ar: status };
    return this.isRtl() ? hit.ar : hit.en;
  }

  tagType(severity?: string): string {
    const map: Record<string, string> = {
      critical: 'red',
      warning: 'warm-gray',
      success: 'green',
      high: 'orange',
      medium: 'yellow',
      low: 'teal',
      info: 'blue',
      neutral: 'gray',
    };
    return map[severity ?? 'info'] ?? 'gray';
  }

  tagLabel(tag: { label: string; labelAr?: string }): string {
    return this.isRtl() ? (tag.labelAr ?? tag.label) : tag.label;
  }

  actionLabel(action: ModuleAction): string {
    return this.isRtl() ? (action.labelAr ?? action.label) : action.label;
  }

  triggerAction(action: ModuleAction | null, payload?: Record<string, unknown>): void {
    if (!action) return;
    if (action.actionKey) {
      this.actionTriggered.emit({ key: action.actionKey, payload });
      return;
    }
    if (action.commandKey) {
      this.actionTriggered.emit({ key: action.commandKey, payload });
      return;
    }
    if (action.route) {
      this.actionTriggered.emit({ key: 'navigate', payload: { path: action.route, ...(payload ?? {}) } });
    }
  }

  nextActionAsModuleAction(): ModuleAction | null {
    const next = this.pillars?.nextAction;
    if (!next || typeof next !== 'object') return null;
    return {
      label: String(next.label ?? ''),
      labelAr: typeof (next as { labelAr?: unknown }).labelAr === 'string'
        ? String((next as { labelAr?: unknown }).labelAr)
        : undefined,
      route: typeof (next as { route?: unknown }).route === 'string'
        ? String((next as { route?: unknown }).route)
        : undefined,
      actionKey: typeof (next as { actionKey?: unknown }).actionKey === 'string'
        ? String((next as { actionKey?: unknown }).actionKey)
        : undefined,
      commandKey: typeof (next as { commandKey?: unknown }).commandKey === 'string'
        ? String((next as { commandKey?: unknown }).commandKey)
        : undefined,
      severity: typeof (next as { severity?: unknown }).severity === 'string'
        ? String((next as { severity?: unknown }).severity) as ModuleAction['severity']
        : undefined,
    };
  }

  onSaveClick(): void {
    this.save.emit({ key: 'settings.save' });
  }

  onDiscardClick(): void {
    this.discard.emit({ key: 'settings.discard' });
  }
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
      @if (primaryAction?.route && primaryAction?.label) {
        <div class="dmt-masthead-actions">
          <button cdsButton="primary" size="sm" [routerLink]="[primaryAction!.route!]">
            {{ primaryAction!.label }}
          </button>
        </div>
      }
    </cds-tile>

    <!-- 5-Pillar Insight Bar -->
    <dos-insight-bar [pillars]="pillars" archetype="workflow-control"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <cds-tile class="dmt-assessments-tile">
      @if (tabs.length) {
        <cds-tabs type="line" [followFocus]="true">
          @for (tab of tabs; track tab.id) {
            <cds-tab [id]="tab.id" [heading]="tab.label">
              <ng-content [select]="'[dosAssessmentTab=' + tab.id + ']'"></ng-content>
            </cds-tab>
          }
        </cds-tabs>
      } @else {
        <div class="dmt-empty-state">
          @if (emptyStateTitle) { <h3>{{ emptyStateTitle }}</h3> }
          @if (emptyStateDescription) { <p>{{ emptyStateDescription }}</p> }
          @if (primaryAction?.route && primaryAction?.label) {
            <button cdsButton="primary" size="sm" [routerLink]="[primaryAction!.route!]">
              {{ primaryAction!.label }}
            </button>
          }
        </div>
      }
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
    .dmt-masthead-actions { margin-top: 1rem; }
    .dmt-assessments-tile { padding: 0; margin-top: 1rem; }
    .dmt-empty-state { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .dmt-charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    .dmt-chart-tile { padding: 1rem; min-height: 240px; }
    @media (max-width: 768px) { .dmt-charts-row { grid-template-columns: 1fr; } }
  `]
})
export class ModuleAssessmentsTemplateComponent {
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() eyebrow = '';
  @Input() title = 'Assessments';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() tabs: ModuleTab[] = [];
  @Input() progressSteps: Array<{ label: string; secondaryLabel?: string }> = [];
  @Input() currentStage = 0;
  @Input() primaryAction: ModuleAction | null = null;
  @Input() emptyStateTitle = '';
  @Input() emptyStateDescription = '';
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
        <!-- 5-Pillar Insight Bar -->
        <dos-insight-bar [pillars]="pillars" archetype="activation-journey"
          (actionClick)="pillars?.nextAction?.action?.()">
        </dos-insight-bar>

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
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() title = 'Get Started';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() notification: ModuleNotification | null = null;
  @Input() steps: ModuleSetupStep[] = [];

  get completedSteps() { return this.steps.filter(s => s.completed).length; }
}
