/**
 * Template T3 — Calendar / Timeline
 * Selector: dos-calendar-timeline
 * component_key: module.calendar.page
 *
 * Story: "Here is everything happening across time — deadlines, assessments, regulatory dates."
 * Answers: What is due? What is overdue? What is coming up? Who needs to act?
 */
import {
  Component, Input, Output, EventEmitter, signal, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ContentSwitcherModule,
  StructuredListModule, ContainedListModule, LinkModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';

export type CalendarView = 'month' | 'timeline' | 'list';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;          // ISO date YYYY-MM-DD
  endDate?: string;
  type: 'deadline' | 'assessment' | 'review' | 'audit' | 'regulatory' | 'agent-run' | 'meeting';
  owner?: string;
  status: 'upcoming' | 'overdue' | 'today' | 'complete' | 'cancelled';
  entityType?: string;
  entityId?: string;
  entityRoute?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  isAiSuggested?: boolean;
}

@Component({
  selector: 'dos-calendar-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContentSwitcherModule,
    StructuredListModule, ContainedListModule, LinkModule,
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
    <cds-tile class="dct-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      <div class="dct-masthead-row">
        <div>
          @if (overdueCount > 0) {
            <cds-ai-label kind="inline" size="sm">
              AI: {{ overdueCount }} items overdue — action required
            </cds-ai-label>
          }
          <h1 class="dct-title">{{ title }}</h1>
        </div>
        @if (viewMode() !== 'limited') {
          <button cdsButton="primary" size="sm" (click)="addEvent.emit()">
            + Schedule
          </button>
        }
      </div>
    </cds-tile>

    <!-- 5-Pillar Insight Bar -->
    <dos-insight-bar [pillars]="pillars" archetype="calendar-timeline"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- Toolbar: view switcher + month nav -->
    <div class="dct-toolbar">
      <cds-content-switcher (selected)="onViewSwitch($event)">
        <button cdsContentSwitcherOption name="month">Month</button>
        <button cdsContentSwitcherOption name="timeline">Timeline</button>
        <button cdsContentSwitcherOption name="list">List</button>
      </cds-content-switcher>

      <div class="dct-month-nav">
        <button cdsButton="ghost" size="sm" (click)="prevPeriod.emit()">‹</button>
        <span class="dct-period-label">{{ currentPeriodLabel }}</span>
        <button cdsButton="ghost" size="sm" (click)="nextPeriod.emit()">›</button>
        <button cdsButton="ghost" size="sm" (click)="today.emit()">Today</button>
      </div>

      <!-- Quick filter chips -->
      <div class="dct-type-filters">
        @for (type of eventTypes; track type.id) {
          <cds-tag [type]="eventTagType(type.id)"
            (click)="filterType.emit(type.id)"
            class="dct-filter-chip"
            [class.dct-filter-chip--active]="activeTypeFilter === type.id">
            {{ type.label }}
          </cds-tag>
        }
      </div>
    </div>

    <!-- Summary strip: upcoming / overdue / today -->
    <div class="dct-summary-strip">
      <cds-tile class="dct-summary-card dct-summary--overdue">
        <p class="dct-summary-label">Overdue</p>
        <p class="dct-summary-value">{{ overdueCount }}</p>
      </cds-tile>
      <cds-tile class="dct-summary-card dct-summary--today">
        <p class="dct-summary-label">Today</p>
        <p class="dct-summary-value">{{ todayCount }}</p>
      </cds-tile>
      <cds-tile class="dct-summary-card dct-summary--week">
        <p class="dct-summary-label">This Week</p>
        <p class="dct-summary-value">{{ weekCount }}</p>
      </cds-tile>
      <cds-tile class="dct-summary-card dct-summary--upcoming">
        <p class="dct-summary-label">Upcoming (30d)</p>
        <p class="dct-summary-value">{{ upcomingCount }}</p>
      </cds-tile>
    </div>

    @if (loading) {
      <cds-tile style="min-height:400px; margin-top:1rem">
        <div cdsSkeletonText [lines]="8"></div>
      </cds-tile>
    }

    @if (!loading) {
      <!-- ── MONTH VIEW ────────────────────────────────────────────────── -->
      @if (activeView() === 'month') {
        <cds-tile class="dct-calendar-tile">
          <!-- Day-of-week headers -->
          <div class="dct-week-headers">
            @for (d of weekDays; track d) {
              <span class="dct-weekday">{{ d }}</span>
            }
          </div>
          <!-- Calendar grid — host provides [dosCalendarGrid] -->
          <ng-content select="[dosCalendarGrid]"></ng-content>

          <!-- Fallback: simple event list by date if no grid provided -->
          @if (showFallbackList) {
            <cds-contained-list label="Events this period" kind="on-page">
              @for (event of sortedEvents; track event.id) {
                <cds-contained-list-item>
                  <div class="dct-event-row">
                    <span class="dct-event-dot" [class]="'dct-dot--' + event.type"></span>
                    <span class="dct-event-date">{{ event.date }}</span>
                    <div class="dct-event-body">
                      <p class="dct-event-title">{{ event.title }}</p>
                      @if (event.owner) {
                        <span class="dct-event-owner">{{ event.owner }}</span>
                      }
                    </div>
                    <cds-tag [type]="statusTagType(event.status)">{{ event.status }}</cds-tag>
                    @if (event.isAiSuggested) {
                      <cds-ai-label kind="inline" size="sm">AI</cds-ai-label>
                    }
                  </div>
                </cds-contained-list-item>
              }
            </cds-contained-list>
          }
        </cds-tile>
      }

      <!-- ── TIMELINE VIEW ─────────────────────────────────────────────── -->
      @if (activeView() === 'timeline') {
        <cds-tile class="dct-timeline-tile">
          <ng-content select="[dosTimeline]"></ng-content>
          <!-- Fallback: horizontal bands per type -->
          @if (!hasTimelineSlot) {
            <div class="dct-timeline-bands">
              @for (band of timelineBands; track band.type) {
                <div class="dct-band">
                  <span class="dct-band-label">{{ band.label }}</span>
                  <div class="dct-band-track">
                    @for (event of band.events; track event.id) {
                      <div class="dct-band-bar"
                        [class]="'dct-bar--' + event.status"
                        [title]="event.title"
                        (click)="eventClick.emit(event)">
                        {{ event.title }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </cds-tile>
      }

      <!-- ── LIST VIEW ─────────────────────────────────────────────────── -->
      @if (activeView() === 'list') {
        <cds-tile class="dct-list-tile">
          <cds-structured-list>
            @for (event of sortedEvents; track event.id) {
              <cds-list-row (click)="eventClick.emit(event)" class="dct-list-row">
                <cds-list-column class="dct-lc-dot">
                  <span class="dct-event-dot" [class]="'dct-dot--' + event.type"></span>
                </cds-list-column>
                <cds-list-column class="dct-lc-date">{{ event.date }}</cds-list-column>
                <cds-list-column class="dct-lc-main">
                  {{ event.title }}
                  @if (event.isAiSuggested) {
                    <cds-ai-label kind="inline" size="sm">AI</cds-ai-label>
                  }
                </cds-list-column>
                <cds-list-column>
                  <cds-tag type="gray">{{ event.type }}</cds-tag>
                </cds-list-column>
                <cds-list-column>
                  <cds-tag [type]="statusTagType(event.status)">{{ event.status }}</cds-tag>
                </cds-list-column>
                <cds-list-column>{{ event.owner ?? '—' }}</cds-list-column>
              </cds-list-row>
            } @empty {
              <cds-list-row>
                <cds-list-column>No events in this period.</cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .dct-masthead { padding: 1.5rem 2rem; }
    .dct-masthead-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 0.5rem; }
    .dct-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }

    .dct-toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); flex-wrap: wrap; }
    .dct-month-nav { display: flex; align-items: center; gap: 0.25rem; }
    .dct-period-label { font-size: 0.9375rem; font-weight: 500; min-width: 140px; text-align: center; }
    .dct-type-filters { display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .dct-filter-chip { cursor: pointer; }
    .dct-filter-chip--active { outline: 2px solid var(--cds-interactive); }

    .dct-summary-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 0.5rem; }
    .dct-summary-card { padding: 0.75rem 1rem; }
    .dct-summary-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .dct-summary-value { font-size: 2rem; font-weight: 300; margin: 0; }
    .dct-summary--overdue .dct-summary-value { color: var(--cds-support-error); }
    .dct-summary--today   .dct-summary-value { color: var(--cds-support-warning); }

    .dct-calendar-tile { padding: 1rem; margin-top: 1rem; }
    .dct-week-headers { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; margin-bottom: 0.5rem; }
    .dct-weekday { font-size: 0.75rem; text-align: center; color: var(--cds-text-secondary); padding: 0.25rem; }

    .dct-event-row { display: flex; align-items: center; gap: 0.75rem; }
    .dct-event-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dct-dot--deadline    { background: var(--cds-support-error); }
    .dct-dot--assessment  { background: var(--cds-support-info); }
    .dct-dot--review      { background: var(--cds-support-warning); }
    .dct-dot--audit       { background: var(--cds-interactive); }
    .dct-dot--regulatory  { background: #6929c4; }
    .dct-dot--agent-run   { background: var(--cds-ai-border, #6929c4); }
    .dct-event-date { font-size: 0.75rem; color: var(--cds-text-secondary); min-width: 80px; font-family: monospace; }
    .dct-event-body { flex: 1; }
    .dct-event-title { font-size: 0.875rem; font-weight: 500; margin: 0; }
    .dct-event-owner { font-size: 0.75rem; color: var(--cds-text-secondary); }

    .dct-timeline-tile { padding: 1rem; margin-top: 1rem; min-height: 400px; }
    .dct-timeline-bands { display: flex; flex-direction: column; gap: 1rem; }
    .dct-band { display: flex; align-items: center; gap: 1rem; }
    .dct-band-label { font-size: 0.75rem; width: 100px; text-align: right; color: var(--cds-text-secondary); flex-shrink: 0; }
    .dct-band-track { flex: 1; display: flex; gap: 0.25rem; flex-wrap: wrap; }
    .dct-band-bar { padding: 0.25rem 0.75rem; border-radius: 2px; font-size: 0.75rem; cursor: pointer; background: var(--cds-interactive); color: #fff; }
    .dct-bar--overdue   { background: var(--cds-support-error); }
    .dct-bar--today     { background: var(--cds-support-warning); }
    .dct-bar--complete  { background: var(--cds-support-success); opacity: 0.7; }

    .dct-list-tile { padding: 0; margin-top: 1rem; }
    .dct-list-row { cursor: pointer; }
    .dct-lc-dot { width: 24px; }
    .dct-lc-date { min-width: 100px; font-family: monospace; font-size: 0.8125rem; }
    .dct-lc-main { flex: 1; }

    @media (max-width: 768px) { .dct-summary-strip { grid-template-columns: 1fr 1fr; } .dct-toolbar { flex-direction: column; align-items: flex-start; } }
  `]
})
export class CalendarTimelineTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Calendar';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() events: CalendarEvent[] = [];
  @Input() currentPeriodLabel = '';
  @Input() activeTypeFilter = '';
  @Input() showFallbackList = true;
  @Input() hasTimelineSlot = false;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() eventTypes: Array<{ id: string; label: string }> = [
    { id: 'deadline', label: 'Deadlines' },
    { id: 'assessment', label: 'Assessments' },
    { id: 'review', label: 'Reviews' },
    { id: 'regulatory', label: 'Regulatory' },
    { id: 'agent-run', label: 'Agent Runs' },
  ];
  @Input() weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  @Output() addEvent = new EventEmitter<void>();
  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() prevPeriod = new EventEmitter<void>();
  @Output() nextPeriod = new EventEmitter<void>();
  @Output() today = new EventEmitter<void>();
  @Output() filterType = new EventEmitter<string>();
  @Output() viewChange = new EventEmitter<CalendarView>();

  activeView = signal<CalendarView>('month');
  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  get sortedEvents() {
    return [...this.events].sort((a, b) => a.date.localeCompare(b.date));
  }
  get overdueCount() { return this.events.filter(e => e.status === 'overdue').length; }
  get todayCount() { return this.events.filter(e => e.status === 'today').length; }
  get weekCount() { return this.events.filter(e => e.status === 'upcoming').length; }
  get upcomingCount() { return this.events.filter(e => e.status === 'upcoming').length; }

  get timelineBands() {
    const types = [...new Set(this.events.map(e => e.type))];
    return types.map(type => ({
      type,
      label: type,
      events: this.events.filter(e => e.type === type),
    }));
  }

  onViewSwitch(v: unknown) {
    this.activeView.set(String(v) as CalendarView);
    this.viewChange.emit(String(v) as CalendarView);
  }

  statusTagType(s: string): string {
    return ({ overdue: 'red', today: 'orange', complete: 'green', upcoming: 'blue', cancelled: 'gray' } as Record<string, string>)[s] ?? 'gray';
  }
  eventTagType(t: string): string {
    return ({ deadline: 'red', regulatory: 'purple', assessment: 'blue', review: 'teal', 'agent-run': 'gray' } as Record<string, string>)[t] ?? 'gray';
  }
}
