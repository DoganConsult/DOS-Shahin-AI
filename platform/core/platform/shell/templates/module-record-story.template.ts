/**
 * Template 11 — 360° Record Story
 * Canonical Name: "360° Record Story"
 * Selector: dos-record-story
 * Story: "Here's everything about this record — its life, evidence, connections, and what's next."
 *
 * 5 Pillars: What changed on this record / Why it matters now / Current exposure / Next step / Evidence trail
 *
 * IBM Carbon active: tiles · tabs · tag · ai-label · structured-list · notification ·
 *   timeline (contained-list) · button · combo-button · progress-bar · modal · breadcrumb
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ComboButtonModule, ProgressBarModule,
  StructuredListModule, ContainedListModule, LinkModule, ModalModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleAction, ModuleRole, resolveViewMode
} from './module-template.types';

export interface RecordField {
  label: string;
  value: string | number;
  type?: 'text' | 'tag' | 'link' | 'date' | 'ai-score' | 'progress';
  severity?: string;
  link?: string;
}

export interface RecordTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  event: string;
  detail?: string;
  type: 'create' | 'update' | 'comment' | 'approve' | 'ai-action' | 'escalate' | 'close';
}

export interface RecordTab {
  id: string;
  label: string;
  badge?: string | number;
}

@Component({
  selector: 'dos-record-story',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ComboButtonModule, ProgressBarModule,
    StructuredListModule, ContainedListModule, LinkModule, ModalModule,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead: record identity -->
    <cds-tile class="drs-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item [routerLink]="listRoute">{{ eyebrow }}</cds-breadcrumb-item>
        <cds-breadcrumb-item>{{ recordId }}</cds-breadcrumb-item>
      </cds-breadcrumb>

      <div class="drs-masthead-row">
        <div class="drs-masthead-left">
          @if (aiHeadline) {
            <cds-ai-label kind="inline" size="sm" class="drs-ai-label">{{ aiHeadline }}</cds-ai-label>
          }
          <h1 class="drs-title">{{ title }}</h1>
          <div class="drs-tags-row">
            @for (tag of statusTags; track tag.label) {
              <cds-tag [type]="tagType(tag.severity)">{{ tag.label }}</cds-tag>
            }
            <cds-tag type="gray">ID: {{ recordId }}</cds-tag>
            @if (treatment) {
              <cds-progress-bar [value]="treatment" [max]="100" size="sm" [label]="''"></cds-progress-bar>
            }
          </div>
        </div>
        <div class="drs-masthead-actions">
          @if (viewMode() === 'full' && primaryAction) {
            <button cdsButton="primary" size="sm" (click)="primaryAction!.action?.()">
              {{ primaryAction!.label }}
            </button>
          }
          @if (viewMode() === 'full' && secondaryActions.length) {
            <cds-combo-button [buttons]="secondaryActions" size="sm">More</cds-combo-button>
          }
          @if (viewMode() === 'read-only') {
            <cds-tag type="gray">Read-only</cds-tag>
          }
        </div>
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar — the record's story in 5 questions -->
    <dos-insight-bar [pillars]="pillars" archetype="record-story"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- Body: fields + timeline + tabs -->
    <div class="drs-body-grid">

      <!-- Left: field sections + tabs -->
      <div class="drs-main-col">
        @if (loading) {
          <cds-tile><div cdsSkeletonText [lines]="6"></div></cds-tile>
        } @else {
          <!-- Key fields -->
          <cds-tile class="drs-fields-tile">
            <cds-structured-list class="drs-fields-list">
              @for (field of keyFields; track field.label) {
                <cds-list-row>
                  <cds-list-column class="drs-field-label">{{ field.label }}</cds-list-column>
                  <cds-list-column>
                    @switch (field.type) {
                      @case ('tag') { <cds-tag [type]="tagType(field.severity)">{{ field.value }}</cds-tag> }
                      @case ('ai-score') { <cds-ai-label kind="inline" size="sm">{{ field.value }}</cds-ai-label> }
                      @case ('link') { <a cdsLink [routerLink]="field.link">{{ field.value }}</a> }
                      @case ('progress') {
                        <cds-progress-bar [value]="+field.value" [max]="100" size="sm" [label]="field.value + '%'"></cds-progress-bar>
                      }
                      @default { {{ field.value }} }
                    }
                  </cds-list-column>
                </cds-list-row>
              }
            </cds-structured-list>
          </cds-tile>

          <!-- Tabs: Detail / Connections / Evidence / Comments -->
          <cds-tile class="drs-tabs-tile">
            <cds-tabs type="line" [followFocus]="true">
              @for (tab of recordTabs; track tab.id) {
                <cds-tab [id]="tab.id" [heading]="tab.label">
                  <ng-content [select]="'[dosRecordTab=' + tab.id + ']'"></ng-content>
                </cds-tab>
              }
            </cds-tabs>
          </cds-tile>
        }
      </div>

      <!-- Right: AI story sidebar + timeline -->
      <div class="drs-right-col">
        <!-- AI Story card -->
        @if (aiStoryText) {
          <cds-tile class="drs-ai-story-tile">
            <cds-ai-label kind="inline" size="sm">AI Record Analysis</cds-ai-label>
            <p class="drs-ai-story">{{ aiStoryText }}</p>
          </cds-tile>
        }

        <!-- Related items -->
        <ng-content select="[dosRecordRelated]"></ng-content>

        <!-- Activity timeline -->
        @if (timeline.length) {
          <cds-tile class="drs-timeline-tile">
            <p class="drs-section-label">Activity Timeline</p>
            <cds-contained-list label="" kind="on-page">
              @for (event of timeline.slice(0, 10); track event.id) {
                <cds-contained-list-item>
                  <div class="drs-event-row">
                    <span class="drs-event-dot" [class]="'drs-dot--' + event.type"></span>
                    <div class="drs-event-content">
                      <p class="drs-event-text">
                        <strong>{{ event.actor }}</strong> {{ event.event }}
                      </p>
                      @if (event.detail) { <p class="drs-event-detail">{{ event.detail }}</p> }
                      <p class="drs-event-time">{{ event.timestamp }}</p>
                    </div>
                  </div>
                </cds-contained-list-item>
              }
            </cds-contained-list>
          </cds-tile>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .drs-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .drs-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .drs-masthead-left { flex: 1; }
    .drs-masthead-actions { display: flex; gap: 0.5rem; align-items: flex-start; padding-top: 0.25rem; }
    .drs-ai-label { margin-bottom: 0.5rem; }
    .drs-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .drs-tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.5rem; }

    .drs-body-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1rem; margin-top: 0.5rem; }
    .drs-main-col { display: flex; flex-direction: column; gap: 1rem; }
    .drs-fields-tile { padding: 0; }
    .drs-fields-list { width: 100%; }
    .drs-field-label { font-weight: 500; width: 160px; min-width: 160px; color: var(--cds-text-secondary); }
    .drs-tabs-tile { padding: 0; }

    .drs-right-col { display: flex; flex-direction: column; gap: 1rem; }
    .drs-ai-story-tile { padding: 1rem; }
    .drs-ai-story { font-size: 0.875rem; color: var(--cds-text-primary); line-height: 1.6; margin: 0.5rem 0 0; }
    .drs-timeline-tile { padding: 1rem; }
    .drs-section-label { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; }

    .drs-event-row { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.25rem 0; }
    .drs-event-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 0.375rem; flex-shrink: 0; background: var(--cds-interactive); }
    .drs-dot--create  { background: var(--cds-support-success); }
    .drs-dot--update  { background: var(--cds-interactive); }
    .drs-dot--escalate { background: var(--cds-support-error); }
    .drs-dot--approve { background: var(--cds-support-success); }
    .drs-dot--ai-action { background: var(--cds-ai-border); }
    .drs-dot--close   { background: var(--cds-text-disabled); }
    .drs-event-content { flex: 1; }
    .drs-event-text { font-size: 0.8125rem; margin: 0; }
    .drs-event-detail { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0.125rem 0; }
    .drs-event-time { font-size: 0.6875rem; color: var(--cds-text-disabled); margin: 0; }

    @media (max-width: 1024px) { .drs-body-grid { grid-template-columns: 1fr; } .drs-right-col { display: none; } }
    @media (max-width: 768px) { .drs-masthead-actions { display: none; } }
  `]
})
export class RecordStoryTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() recordId = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() statusTags: Array<{ label: string; severity?: string }> = [];
  @Input() keyFields: RecordField[] = [];
  @Input() timeline: RecordTimelineEvent[] = [];
  @Input() recordTabs: RecordTab[] = [
    { id: 'tab-detail', label: 'Details' },
    { id: 'tab-connections', label: 'Connections' },
    { id: 'tab-evidence', label: 'Evidence' },
    { id: 'tab-comments', label: 'Comments' },
  ];
  @Input() aiStoryText = '';
  @Input() treatment?: number;
  @Input() listRoute = '../';
  @Input() primaryAction: ModuleAction | null = null;
  @Input() secondaryActions: Array<{ content: string; click: () => void }> = [];
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];

  @Output() edit = new EventEmitter<void>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  tagType(s?: string): string {
    return ({ critical: 'red', high: 'orange', medium: 'yellow', low: 'teal', open: 'blue', closed: 'green' } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
}
