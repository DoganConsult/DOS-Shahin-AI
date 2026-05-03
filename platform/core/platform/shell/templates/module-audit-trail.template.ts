/**
 * Template T2 — Audit Trail
 * Selector: dos-audit-trail
 * component_key: module.audit-trail.page
 *
 * Story: "Every action, every actor, every timestamp — the immutable record."
 * Answers: Who did what? When? On which entity? Is anything suspicious?
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
  StructuredListModule, LinkModule, SearchModule,
  DatePickerModule, DatePickerInputModule, DropdownModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole?: string;
  verb: string;          // "created" | "updated" | "deleted" | "approved" | "viewed" | "exported"
  entityType: string;
  entityId: string;
  entityLabel: string;
  entityRoute?: string;
  ipAddress?: string;
  source?: 'user' | 'agent' | 'system' | 'api';
  severity?: 'critical' | 'warning' | 'info';
  detail?: string;       // Expandable diff/payload
  evidenceLink?: string;
  integrityVerified?: boolean;
}

export interface AuditFilter {
  searchQuery?: string;
  eventType?: string;
  source?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Component({
  selector: 'dos-audit-trail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContainedListModule,
    StructuredListModule, LinkModule, SearchModule,
    DatePickerModule, DatePickerInputModule, DropdownModule,
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
    <cds-tile class="dat-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="dat-masthead-row">
        <div>
          <cds-ai-label kind="inline" size="sm">AI Integrity Check</cds-ai-label>
          <h1 class="dat-title">{{ title }}</h1>
          @if (subtitle) { <p class="dat-subtitle">{{ subtitle }}</p> }
        </div>
        <div class="dat-masthead-actions">
          <button cdsButton="ghost" size="sm" (click)="export.emit()">Export</button>
        </div>
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar -->
    <dos-insight-bar [pillars]="pillars" archetype="audit-trail"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- Stats strip -->
    <div class="dat-stats-strip">
      @for (stat of statCards; track stat.label) {
        <cds-tile class="dat-stat">
          <p class="dat-stat-label">{{ stat.label }}</p>
          <p class="dat-stat-value" [class]="'dat-stat--' + (stat.status ?? 'info')">
            {{ stat.value }}
          </p>
        </cds-tile>
      }
    </div>

    <!-- Filter bar -->
    <div class="dat-filter-bar">
      <cds-search id="audit-trail-search" placeholder="Search actor, entity, action..."
        (valueChange)="onSearch($event)">
      </cds-search>
      <cds-dropdown id="audit-event-type" placeholder="Event type"
        (selected)="onFilterChange('eventType', $event)">
        @for (opt of eventTypeOptions; track opt.content) {
          <cds-dropdown-list>
            <cds-dropdown-option [content]="opt.content"></cds-dropdown-option>
          </cds-dropdown-list>
        }
      </cds-dropdown>
      <cds-dropdown id="audit-source" placeholder="Source"
        (selected)="onFilterChange('source', $event)">
        @for (opt of sourceOptions; track opt.content) {
          <cds-dropdown-list>
            <cds-dropdown-option [content]="opt.content"></cds-dropdown-option>
          </cds-dropdown-list>
        }
      </cds-dropdown>
      <cds-date-picker id="audit-date-range" type="range">
        <cds-date-picker-input id="audit-from" kind="from" label="From"></cds-date-picker-input>
        <cds-date-picker-input id="audit-to" kind="to" label="To"></cds-date-picker-input>
      </cds-date-picker>
      <button cdsButton="ghost" size="sm" (click)="clearFilters.emit()">Clear</button>
    </div>

    <!-- Active filter chips -->
    @if (activeFilters.length) {
      <div class="dat-active-filters">
        @for (f of activeFilters; track f) {
          <cds-tag type="blue" [attr.closeable]="true"
            (close)="removeFilter.emit(f)">{{ f }}</cds-tag>
        }
      </div>
    }

    <!-- Main: log stream + sidebar -->
    <div class="dat-body">
      <!-- Log stream -->
      <div class="dat-log-stream">
        @if (loading) {
          @for (n of [1,2,3,4,5,6,7,8]; track n) {
            <div class="dat-log-skeleton" cdsSkeletonText [lines]="1"
              style="margin-bottom:0.5rem"></div>
          }
        } @else {
          <cds-contained-list label="" kind="on-page">
            @for (event of events; track event.id) {
              <cds-contained-list-item [attr.data-event-id]="event.id">
                <div class="dat-event-row">
                  <!-- Source dot -->
                  <span class="dat-dot" [class]="'dat-dot--' + (event.source ?? 'user')"></span>

                  <!-- Timestamp + integrity -->
                  <div class="dat-event-time-col">
                    <span class="dat-time">{{ event.timestamp }}</span>
                    @if (event.integrityVerified) {
                      <cds-tag type="green" size="sm">✓</cds-tag>
                    }
                  </div>

                  <!-- Actor -->
                  <div class="dat-event-actor-col">
                    <span class="dat-actor">{{ event.actor }}</span>
                    @if (event.actorRole) {
                      <span class="dat-actor-role">{{ event.actorRole }}</span>
                    }
                    @if (event.source === 'agent') {
                      <cds-ai-label kind="inline" size="sm">Agent</cds-ai-label>
                    }
                  </div>

                  <!-- Action + entity -->
                  <div class="dat-event-main-col">
                    <span class="dat-verb">{{ event.verb }}</span>
                    <cds-tag type="gray">{{ event.entityType }}</cds-tag>
                    @if (event.entityRoute) {
                      <a cdsLink [routerLink]="event.entityRoute">{{ event.entityLabel }}</a>
                    } @else {
                      <span class="dat-entity">{{ event.entityLabel }}</span>
                    }
                  </div>

                  <!-- Severity + expand -->
                  <div class="dat-event-tail">
                    @if (event.severity && event.severity !== 'info') {
                      <cds-tag [type]="sevTagType(event.severity)">{{ event.severity }}</cds-tag>
                    }
                    @if (event.detail) {
                      <button cdsButton="ghost" size="sm"
                        (click)="expandEvent.emit(event)">Details</button>
                    }
                  </div>
                </div>

                <!-- Expanded detail slot -->
                @if (expandedEventId === event.id && event.detail) {
                  <div class="dat-event-detail">
                    <pre class="dat-detail-pre">{{ event.detail }}</pre>
                    @if (event.evidenceLink) {
                      <a cdsLink [href]="event.evidenceLink">View Evidence</a>
                    }
                  </div>
                }
              </cds-contained-list-item>
            } @empty {
              <cds-contained-list-item>
                <p class="dat-empty">No audit events match the current filter.</p>
              </cds-contained-list-item>
            }
          </cds-contained-list>

          <!-- Load more -->
          @if (hasMore) {
            <div class="dat-load-more">
              <button cdsButton="ghost" (click)="loadMore.emit()">Load more events</button>
            </div>
          }
        }
      </div>

      <!-- Sidebar: breakdown charts -->
      <div class="dat-sidebar">
        <!-- By actor -->
        <cds-tile class="dat-sidebar-tile">
          <p class="dat-sidebar-title">Top Actors</p>
          <ng-content select="[dosAuditActorChart]"></ng-content>
        </cds-tile>

        <!-- By event type -->
        <cds-tile class="dat-sidebar-tile">
          <p class="dat-sidebar-title">Event Types</p>
          <ng-content select="[dosAuditTypeChart]"></ng-content>
        </cds-tile>

        <!-- AI anomaly detection -->
        @if (anomalies.length) {
          <cds-tile class="dat-anomaly-tile">
            <cds-ai-label kind="inline" size="sm">AI Anomaly Detection</cds-ai-label>
            <cds-structured-list>
              @for (a of anomalies.slice(0,4); track a.id) {
                <cds-list-row>
                  <cds-list-column>
                    <cds-tag type="red">{{ a.severity }}</cds-tag>
                  </cds-list-column>
                  <cds-list-column>{{ a.description }}</cds-list-column>
                </cds-list-row>
              }
            </cds-structured-list>
          </cds-tile>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .dat-masthead { padding: 1.5rem 2rem; }
    .dat-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .dat-masthead-actions { display: flex; gap: 0.5rem; }
    .dat-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dat-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0; }

    .dat-stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 1px; margin-top: 0.5rem; }
    .dat-stat { padding: 0.75rem 1rem; }
    .dat-stat-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .dat-stat-value { font-size: 1.75rem; font-weight: 300; margin: 0; }
    .dat-stat--critical { color: var(--cds-support-error); }
    .dat-stat--warning  { color: var(--cds-support-warning); }

    .dat-filter-bar { display: flex; align-items: flex-end; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); flex-wrap: wrap; }
    .dat-active-filters { display: flex; gap: 0.25rem; padding: 0.5rem 1rem; flex-wrap: wrap; background: var(--cds-layer); }

    .dat-body { display: grid; grid-template-columns: 1fr 280px; gap: 1rem; margin-top: 1rem; }
    .dat-log-stream { }
    .dat-event-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; flex-wrap: wrap; }
    .dat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--cds-interactive); }
    .dat-dot--agent  { background: var(--cds-ai-border, #6929c4); }
    .dat-dot--system { background: var(--cds-text-disabled); }
    .dat-dot--api    { background: var(--cds-support-info); }

    .dat-event-time-col { display: flex; align-items: center; gap: 0.25rem; min-width: 140px; }
    .dat-time { font-size: 0.75rem; color: var(--cds-text-secondary); font-family: monospace; }
    .dat-event-actor-col { min-width: 140px; }
    .dat-actor { font-size: 0.8125rem; font-weight: 500; display: block; }
    .dat-actor-role { font-size: 0.6875rem; color: var(--cds-text-secondary); }
    .dat-event-main-col { flex: 1; display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
    .dat-verb { font-size: 0.8125rem; color: var(--cds-text-secondary); }
    .dat-entity { font-size: 0.8125rem; }
    .dat-event-tail { display: flex; align-items: center; gap: 0.25rem; margin-inline-start: auto; }

    .dat-event-detail { padding: 0.75rem 1rem; background: var(--cds-layer-01); border-top: 1px solid var(--cds-border-subtle); }
    .dat-detail-pre { font-size: 0.75rem; font-family: monospace; white-space: pre-wrap; margin: 0 0 0.5rem; }

    .dat-load-more { display: flex; justify-content: center; padding: 1rem; }
    .dat-empty { font-size: 0.875rem; color: var(--cds-text-secondary); padding: 1rem 0; }

    .dat-sidebar { display: flex; flex-direction: column; gap: 1rem; }
    .dat-sidebar-tile { padding: 1rem; min-height: 160px; }
    .dat-sidebar-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; }
    .dat-anomaly-tile { padding: 1rem; }

    @media (max-width: 1024px) { .dat-body { grid-template-columns: 1fr; } .dat-sidebar { display: none; } }
    @media (max-width: 768px) { .dat-event-row { gap: 0.375rem; } .dat-event-actor-col, .dat-event-time-col { min-width: unset; } }
  `]
})
export class AuditTrailTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Audit Trail';
  @Input() subtitle = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() events: AuditLogEvent[] = [];
  @Input() anomalies: Array<{ id: string; description: string; severity?: string }> = [];
  @Input() statCards: Array<{ label: string; value: string | number; status?: string }> = [];
  @Input() activeFilters: string[] = [];
  @Input() hasMore = false;
  @Input() expandedEventId: string | null = null;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() eventTypeOptions: Array<{ content: string }> = [
    { content: 'All types' }, { content: 'create' }, { content: 'update' },
    { content: 'delete' }, { content: 'approve' }, { content: 'export' },
  ];
  @Input() sourceOptions: Array<{ content: string }> = [
    { content: 'All sources' }, { content: 'user' }, { content: 'agent' },
    { content: 'system' }, { content: 'api' },
  ];

  @Output() export = new EventEmitter<void>();
  @Output() expandEvent = new EventEmitter<AuditLogEvent>();
  @Output() loadMore = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<AuditFilter>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() removeFilter = new EventEmitter<string>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  onSearch(v: string) { this.filterChange.emit({ searchQuery: v }); }
  onFilterChange(key: string, v: unknown) {
    this.filterChange.emit({ [key]: String(v) } as AuditFilter);
  }

  sevTagType(s?: string): string {
    return ({ critical: 'red', warning: 'orange' } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
}
