/**
 * Template 4 — Module Work Queue / Tasks
 * Story role: "Here's what needs YOU — AI-ranked, not filing-order."
 * IBM Carbon: tiles · notification · contained-list · tag · progress-bar ·
 *   button · combo-button · content-switcher · dropdown · skeleton · ai-label
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, NotificationModule, ContainedListModule, TagModule,
  ProgressBarModule, ButtonModule, ComboButtonModule, ContentSwitcherModule,
  DropdownModule, SkeletonModule, BreadcrumbModule, LinkModule, IconModule
} from 'carbon-components-angular';
import {
  ModuleAction, ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';


export interface WorkTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  progress?: number;       // 0–100
  severity?: 'critical' | 'high' | 'medium' | 'low';
  aiPriority?: number;     // AI score 0–100
  aiInsight?: string;
  status: 'overdue' | 'due-today' | 'this-week' | 'upcoming' | 'completed';
  actions?: Array<{ label: string; fn: () => void }>;
}

@Component({
  selector: 'dos-action-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, NotificationModule, ContainedListModule, TagModule,
    ProgressBarModule, ButtonModule, ComboButtonModule, ContentSwitcherModule,
    DropdownModule, SkeletonModule, BreadcrumbModule, LinkModule, IconModule,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead -->
    <cds-tile class="dmt-masthead">
      <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm" class="dmt-ai-headline">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dmt-title">{{ title }}</h1>
      @if (subtitle) { <p class="dmt-subtitle">{{ subtitle }}</p> }

      <!-- Overdue alert banner -->
      @if (overdueTasks.length) {
        <div class="dmt-urgent-banner">
          <cds-tag type="red">{{ overdueTasks.length }} OVERDUE</cds-tag>
          <cds-tag type="orange">{{ dueTodayTasks.length }} DUE TODAY</cds-tag>
        </div>
      }
    </cds-tile>


      <!-- ── 5-Pillar Insight Bar ─────────────────────────────────────────── -->
      <dos-insight-bar
        [pillars]="pillars"
        archetype="action-queue"
        (actionClick)="pillars?.nextAction?.action?.()">
      </dos-insight-bar>

    <!-- Toolbar -->
    <div class="dmt-toolbar">
      <cds-content-switcher (selected)="onViewSwitch($event)">
        @for (v of viewOptions; track v.id) {
          <button cdsContentSwitcherOption [name]="v.id">{{ v.label }}</button>
        }
      </cds-content-switcher>
      <cds-dropdown [placeholder]="'Sort by'" [items]="sortOptions" (selected)="onSort($event)" class="dmt-sort"></cds-dropdown>
    </div>

    @if (loading) {
      <cds-tile class="dmt-queue-tile">
        @for (n of [1,2,3]; track n) {
          <div cdsSkeletonText [lines]="2" style="margin-bottom:1.5rem"></div>
        }
      </cds-tile>
    }

    @if (!loading) {
      <!-- OVERDUE group -->
      @if (visibleOverdue().length) {
        <cds-contained-list label="🔴 OVERDUE" kind="disclosed" class="dmt-task-group dmt-group--overdue">
          @for (task of visibleOverdue(); track task.id) {
            <cds-contained-list-item class="dmt-task-item">
              <ng-container [ngTemplateOutlet]="taskRow" [ngTemplateOutletContext]="{ task }"></ng-container>
            </cds-contained-list-item>
          }
        </cds-contained-list>
      }

      <!-- DUE TODAY group -->
      @if (visibleDueToday().length) {
        <cds-contained-list label="🟡 DUE TODAY" kind="disclosed" class="dmt-task-group dmt-group--today">
          @for (task of visibleDueToday(); track task.id) {
            <cds-contained-list-item>
              <ng-container [ngTemplateOutlet]="taskRow" [ngTemplateOutletContext]="{ task }"></ng-container>
            </cds-contained-list-item>
          }
        </cds-contained-list>
      }

      <!-- THIS WEEK group -->
      @if (thisWeekTasks.length) {
        <cds-contained-list label="THIS WEEK" kind="on-page" class="dmt-task-group">
          @for (task of thisWeekTasks; track task.id) {
            <cds-contained-list-item>
              <ng-container [ngTemplateOutlet]="taskRow" [ngTemplateOutletContext]="{ task }"></ng-container>
            </cds-contained-list-item>
          }
        </cds-contained-list>
      }

      <!-- UPCOMING group -->
      @if (upcomingTasks.length) {
        <cds-contained-list label="UPCOMING" kind="on-page" class="dmt-task-group dmt-group--upcoming">
          @for (task of upcomingTasks; track task.id) {
            <cds-contained-list-item>
              <ng-container [ngTemplateOutlet]="taskRow" [ngTemplateOutletContext]="{ task }"></ng-container>
            </cds-contained-list-item>
          }
        </cds-contained-list>
      }

      <!-- Empty state -->
      @if (!tasks.length) {
        <cds-tile class="dmt-empty-tile">
          <cds-ai-label kind="inline" size="sm">AI found no pending tasks</cds-ai-label>
          <h3>All clear!</h3>
          <p>You have no tasks pending at this time.</p>
        </cds-tile>
      }
    }

    <!-- Task row template -->
    <ng-template #taskRow let-task="task">
      <div class="dmt-task-row">
        <div class="dmt-task-main">
          <div class="dmt-task-header">
            <cds-tag [type]="tagType(task.severity)">{{ task.severity?.toUpperCase() }}</cds-tag>
            @if (task.aiPriority) {
              <cds-ai-label kind="inline" size="sm">AI: {{ task.aiPriority }}</cds-ai-label>
            }
            <span class="dmt-task-title">{{ task.title }}</span>
          </div>
          @if (task.description) { <p class="dmt-task-desc">{{ task.description }}</p> }
          @if (task.progress !== undefined) {
            <cds-progress-bar [value]="task.progress" [max]="100" size="sm"
              [label]="task.progress + '% complete'">
            </cds-progress-bar>
          }
          @if (task.dueDate) {
            <span class="dmt-task-due">Due: {{ task.dueDate }}</span>
          }
        </div>
        <div class="dmt-task-actions">
          @if (task.actions?.length) {
            @for (action of task.actions!.slice(0,1); track action.label) {
              <button cdsButton="primary" size="sm" (click)="action.fn()">{{ action.label }}</button>
            }
            @if (task.actions!.length > 1) {
              <cds-combo-button
                [buttons]="task.actions!.slice(1).map(a => ({ content: a.label, click: a.fn }))"
                size="sm">
                More
              </cds-combo-button>
            }
          }
          <button cdsButton="ghost" size="sm" (click)="taskClick.emit(task)">View</button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .dmt-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-urgent-banner { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .dmt-toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); }
    .dmt-sort { min-width: 160px; }
    .dmt-task-group { margin-top: 1rem; }
    .dmt-group--overdue { --cds-layer: var(--cds-notification-error-background, #fff1f1); }
    .dmt-group--today { --cds-layer: var(--cds-notification-warning-background, #fdf6dd); }
    .dmt-group--upcoming { opacity: 0.85; }
    .dmt-task-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; padding: 0.75rem 0; }
    .dmt-task-main { flex: 1; }
    .dmt-task-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
    .dmt-task-title { font-weight: 500; }
    .dmt-task-desc { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0; }
    .dmt-task-due { font-size: 0.75rem; color: var(--cds-text-secondary); }
    .dmt-task-actions { display: flex; gap: 0.25rem; align-items: flex-start; flex-shrink: 0; }
    .dmt-empty-tile { text-align: center; padding: 3rem; }
    @media (max-width: 768px) {
      .dmt-task-row { flex-direction: column; }
    }
  `]
})
export class ModuleWorkQueueTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Work Queue';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() tasks: WorkTask[] = [];
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() ownerId?: string;
  @Input() viewOptions: Array<{ id: string; label: string }> = [
    { id: 'mine', label: 'Mine' },
    { id: 'team', label: 'Team' },
    { id: 'all', label: 'All' },
  ];
  @Input() sortOptions: Array<{ content: string; value: string }> = [
    { content: 'AI Priority', value: 'ai' },
    { content: 'Due Date', value: 'due' },
    { content: 'Severity', value: 'severity' },
  ];

  @Output() taskClick = new EventEmitter<WorkTask>();
  @Output() viewSwitch = new EventEmitter<unknown>();
  @Output() sort = new EventEmitter<string>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  get overdueTasks() { return this.tasks.filter(t => t.status === 'overdue'); }
  get dueTodayTasks() { return this.tasks.filter(t => t.status === 'due-today'); }
  get thisWeekTasks() { return this.tasks.filter(t => t.status === 'this-week'); }
  get upcomingTasks() { return this.tasks.filter(t => t.status === 'upcoming'); }

  visibleOverdue = computed(() => {
    if (this.viewMode() === 'limited') return this.overdueTasks.filter(t => t.assigneeId === this.ownerId);
    return this.overdueTasks;
  });
  visibleDueToday = computed(() => {
    if (this.viewMode() === 'limited') return this.dueTodayTasks.filter(t => t.assigneeId === this.ownerId);
    return this.dueTodayTasks;
  });

  tagType(s?: string): string {
    return ({ critical: 'red', high: 'orange', medium: 'yellow', low: 'teal' } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
  onViewSwitch(v: unknown) { this.viewSwitch.emit(v); }
  onSort(v: unknown) { this.sort.emit((v as { value: string }).value); }
}
