/**
 * Module Page Chrome — 12 reusable Carbon-only standalone components.
 *
 * Every Phase-1 module page composes from this set. All use only
 * DB-registered Carbon primitives. No PrimeNG, no Material, no emoji.
 *
 * Components:
 *  1. ModulePageHeader      — breadcrumb + module tag + title
 *  2. ModuleHealthStrip     — 3–5 inline health indicators
 *  3. ModuleKpiGrid         — 4 KPI tiles in Carbon Grid
 *  4. ModuleQuickActions    — disabled action buttons with Phase-3 tooltips
 *  5. ModuleTabs            — tab bar using CSS (avoids Carbon cds-tabs crash)
 *  6. ModuleWorkQueue       — task/action items list
 *  7. ModuleAlertsPanel     — inline notifications for module alerts
 *  8. ModuleDataPreview     — read-only structured list preview
 *  9. ModuleRecentActivity  — last N audit events as structured list
 * 10. ModuleAuditTrailPanel — full audit table with filters
 * 11. ModuleCopilotPanel    — AI copilot placeholder tile
 * 12. ModuleEmptyState      — Carbon tile + notification for empty data
 */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  BreadcrumbModule, TilesModule, TagModule, GridModule,
  NotificationModule, SkeletonModule, IconModule, ButtonModule,
  TooltipModule, ProgressBarModule,
  ModalModule, AccordionModule,
} from 'carbon-components-angular';
import { DosCarbonSearchComponent } from '@dos/ui-system';
import { BootstrapStore } from '@app/core/services/platform/bootstrap.store';

// ─── 1. ModulePageHeader ────────────────────────────────────────────
@Component({
  selector: 'app-module-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, BreadcrumbModule, TagModule, IconModule],
  template: `
    <div class="mph">
      <cds-breadcrumb>
        <cds-breadcrumb-item *ngIf="workspaceShellHref as wsh" [href]="wsh">{{ workspaceCrumbLabel }}</cds-breadcrumb-item>
        @for (crumb of breadcrumbs; track crumb.label) {
          <cds-breadcrumb-item [href]="crumb.route || null">{{ crumb.label }}</cds-breadcrumb-item>
        }
      </cds-breadcrumb>
      <div class="mph-title-row">
        @if (icon) { <svg [attr.cdsIcon]="icon" size="24" class="mph-icon"></svg> }
        <h1 class="mph-title">{{ title }}</h1>
        @if (statusTag) {
          <cds-tag [type]="statusTagType" size="sm">{{ statusTag }}</cds-tag>
        }
      </div>
      @if (subtitle) { <p class="mph-subtitle">{{ subtitle }}</p> }
    </div>
  `,
  styles: [`
    .mph { margin-block-end: var(--cds-spacing-05); }
    .mph-title-row { display: flex; align-items: center; gap: var(--cds-spacing-03); margin-top: var(--cds-spacing-03); }
    .mph-icon { fill: var(--cds-interactive); flex-shrink: 0; }
    .mph-title { font-size: var(--cds-heading-04-font-size, 1.75rem); font-weight: 600; margin: 0; }
    .mph-subtitle { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); margin-top: var(--cds-spacing-02); }
  `],
})
export class ModulePageHeaderComponent {
  private readonly bootstrap = inject(BootstrapStore);
  // DB-driven landing route only (dos.tenant_landing_config via UI-OS).
  // null = operator has not seeded; *ngIf hides the workspace breadcrumb
  // (NO FRONTEND INVENTION per AGENTS.md).
  readonly workspaceShellHref = this.bootstrap.landingPage() ?? null;
  // TODO(uios-chrome): bind label from shell.chrome.breadcrumbs.workspace
  // once chrome breadcrumb signal is exposed on BootstrapStore.
  readonly workspaceCrumbLabel = '';
  @Input() breadcrumbs: { label: string; route?: string }[] = [];
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() statusTag = '';
  @Input() statusTagType: 'green' | 'blue' | 'red' | 'cool-gray' | 'warm-gray' | 'purple' = 'green';
}

// ─── 2. ModuleHealthStrip ───────────────────────────────────────────
@Component({
  selector: 'app-module-health-strip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule, IconModule],
  template: `
    <div class="mhs">
      @for (item of items; track item.label) {
        <div class="mhs-item">
          <svg [attr.cdsIcon]="item.icon || 'circle--filled'" size="16" [style.fill]="item.color || 'var(--cds-support-success)'"></svg>
          <span class="mhs-label">{{ item.label }}</span>
          <cds-tag [type]="item.severity || 'green'" size="sm">{{ item.value }}</cds-tag>
        </div>
      }
    </div>
  `,
  styles: [`
    .mhs { display: flex; gap: var(--cds-spacing-05); flex-wrap: wrap; margin-block-end: var(--cds-spacing-05); padding: var(--cds-spacing-03) 0; border-bottom: 1px solid var(--cds-border-subtle-00); }
    .mhs-item { display: flex; align-items: center; gap: var(--cds-spacing-02); }
    .mhs-label { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); }
  `],
})
export class ModuleHealthStripComponent {
  @Input() items: { label: string; value: string | number; icon?: string; color?: string; severity?: string }[] = [];
}

// ─── 3. ModuleKpiGrid ───────────────────────────────────────────────
@Component({
  selector: 'app-module-kpi-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, TagModule, GridModule, IconModule, SkeletonModule],
  template: `
    @if (loading) {
      <div cdsGrid>
        @for (i of [1,2,3,4]; track i) {
          <div cdsCol [columnNumbers]="{lg: 4, md: 4, sm: 4}"><cds-skeleton-placeholder></cds-skeleton-placeholder></div>
        }
      </div>
    } @else {
      <div cdsGrid class="mkpi">
        @for (kpi of cards; track kpi.id) {
          <div cdsCol [columnNumbers]="{lg: 4, md: 4, sm: 4}">
            <cds-tile class="mkpi-card">
              <svg [attr.cdsIcon]="kpi.icon" size="20" class="mkpi-icon"></svg>
              <div class="mkpi-body">
                <span class="mkpi-value">{{ kpi.value }}</span>
                <span class="mkpi-label">{{ kpi.label }}</span>
              </div>
              @if (kpi.delta) { <cds-tag type="blue" size="sm">{{ kpi.delta }}</cds-tag> }
            </cds-tile>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .mkpi { margin-block-end: var(--cds-spacing-06); }
    .mkpi-card { display: flex; align-items: center; gap: var(--cds-spacing-04); }
    .mkpi-icon { fill: var(--cds-interactive); flex-shrink: 0; }
    .mkpi-body { display: flex; flex-direction: column; }
    .mkpi-value { font-size: var(--cds-heading-03-font-size, 1.25rem); font-weight: 600; }
    .mkpi-label { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); }
  `],
})
export class ModuleKpiGridComponent {
  @Input() cards: { id: string; label: string; value: string | number; icon: string; delta?: string }[] = [];
  @Input() loading = false;
}

// ─── 4. ModuleQuickActions ──────────────────────────────────────────
@Component({
  selector: 'app-module-quick-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, TooltipModule, IconModule],
  template: `
    <div class="mqa">
      @for (action of actions; track action.id) {
        <cds-tooltip [description]="action.disabled ? (action.disabledReason || 'Available in Phase 3') : (action.tooltip || '')">
          <button [attr.cdsButton]="action.kind || 'tertiary'" size="sm"
            [disabled]="action.disabled ?? true"
            (click)="actionClick.emit(action.id)">
            @if (action.icon) { <svg [attr.cdsIcon]="action.icon" size="16"></svg> }
            {{ action.label }}
          </button>
        </cds-tooltip>
      }
    </div>
  `,
  styles: [`.mqa { display: flex; gap: var(--cds-spacing-03); flex-wrap: wrap; margin-block-end: var(--cds-spacing-05); }`],
})
export class ModuleQuickActionsComponent {
  @Input() actions: { id: string; label: string; icon?: string; kind?: string; disabled?: boolean; disabledReason?: string; tooltip?: string }[] = [];
  @Output() actionClick = new EventEmitter<string>();
}

// ─── 5. ModuleTabs ──────────────────────────────────────────────────
@Component({
  selector: 'app-module-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="mt" role="tablist">
      @for (tab of tabs; track tab.id) {
        <button class="mt-tab" [class.mt-tab--active]="activeTab === tab.id"
          role="tab" [attr.aria-selected]="activeTab === tab.id"
          (click)="tabChange.emit(tab.id)">
          {{ tab.label }}
          @if (tab.count !== undefined) { <span class="mt-count">{{ tab.count }}</span> }
        </button>
      }
    </div>
  `,
  styles: [`
    .mt { display: flex; border-bottom: 2px solid var(--cds-border-subtle-00); margin-block-end: var(--cds-spacing-05); }
    .mt-tab { padding: var(--cds-spacing-03) var(--cds-spacing-05); border: none; background: none; cursor: pointer; font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; }
    .mt-tab--active { color: var(--cds-text-primary); border-bottom-color: var(--cds-interactive); font-weight: 600; }
    .mt-count { margin-inline-start: var(--cds-spacing-02); font-size: 0.75rem; background: var(--cds-layer-01); padding: 1px 6px; border-radius: 10px; }
  `],
})
export class ModuleTabsComponent {
  @Input() tabs: { id: string; label: string; count?: number }[] = [];
  @Input() activeTab = '';
  @Output() tabChange = new EventEmitter<string>();
}

// ─── 6. ModuleWorkQueue ─────────────────────────────────────────────
@Component({
  selector: 'app-module-work-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, TagModule, IconModule],
  template: `
    <div class="mwq">
      @for (item of items; track item.id) {
        <cds-clickable-tile class="mwq-item" (click)="itemClick.emit(item.id)">
          <svg [attr.cdsIcon]="item.icon || 'task'" size="16" class="mwq-icon"></svg>
          <div class="mwq-body">
            <span class="mwq-title">{{ item.title }}</span>
            <span class="mwq-sub">{{ item.subtitle }}</span>
          </div>
          <cds-tag [type]="item.priority === 'critical' ? 'red' : item.priority === 'high' ? 'warm-gray' : 'cool-gray'" size="sm">{{ item.priority }}</cds-tag>
        </cds-clickable-tile>
      }
      @if (items.length === 0) {
        <cds-tile class="mwq-empty">{{ emptyLabel || 'No pending items' }}</cds-tile>
      }
    </div>
  `,
  styles: [`
    .mwq { display: flex; flex-direction: column; gap: var(--cds-spacing-02); margin-block-end: var(--cds-spacing-05); }
    .mwq-item { display: flex; align-items: center; gap: var(--cds-spacing-03); }
    .mwq-icon { fill: var(--cds-text-secondary); flex-shrink: 0; }
    .mwq-body { flex: 1; min-width: 0; }
    .mwq-title { font-size: var(--cds-body-compact-01-font-size); font-weight: 600; display: block; }
    .mwq-sub { font-size: 0.75rem; color: var(--cds-text-secondary); }
    .mwq-empty { text-align: center; color: var(--cds-text-secondary); }
  `],
})
export class ModuleWorkQueueComponent {
  @Input() items: { id: string; title: string; subtitle: string; priority: string; icon?: string }[] = [];
  @Input() emptyLabel = '';
  @Output() itemClick = new EventEmitter<string>();
}

// ─── 7. ModuleAlertsPanel ───────────────────────────────────────────
@Component({
  selector: 'app-module-alerts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NotificationModule],
  template: `
    @for (alert of alerts; track alert.id) {
      <cds-notification
        [notificationObj]="{ type: alert.kind || 'warning', title: alert.title, message: alert.message }"
        [showClose]="true">
      </cds-notification>
    }
  `,
  styles: [`:host { display: block; margin-block-end: var(--cds-spacing-05); }`],
})
export class ModuleAlertsPanelComponent {
  @Input() alerts: { id: string; kind?: string; title: string; message: string }[] = [];
}

// ─── 8. ModuleDataPreview ───────────────────────────────────────────
@Component({
  selector: 'app-module-data-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonModule],
  template: `
    @if (loading) {
      <cds-skeleton-text [lines]="4"></cds-skeleton-text>
    } @else {
      <section class="cds--structured-list mdp">
        <div class="cds--structured-list-thead">
          <div class="cds--structured-list-row cds--structured-list-row--header-row">
            @for (col of columns; track col) {
              <div class="cds--structured-list-th">{{ col }}</div>
            }
          </div>
        </div>
        <div class="cds--structured-list-tbody">
          @for (row of rows; track $index) {
            <div class="cds--structured-list-row">
              @for (cell of row; track $index) {
                <div class="cds--structured-list-td">{{ cell }}</div>
              }
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [`.mdp { margin-block-end: var(--cds-spacing-05); }`],
})
export class ModuleDataPreviewComponent {
  @Input() columns: string[] = [];
  @Input() rows: (string | number)[][] = [];
  @Input() loading = false;
}

// ─── 9. ModuleRecentActivity ────────────────────────────────────────
@Component({
  selector: 'app-module-recent-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SkeletonModule, IconModule],
  template: `
    @if (loading) {
      <cds-skeleton-text [lines]="3"></cds-skeleton-text>
    } @else {
      <section class="cds--structured-list mra">
        <div class="cds--structured-list-thead">
          <div class="cds--structured-list-row cds--structured-list-row--header-row">
            <div class="cds--structured-list-th">Time</div>
            <div class="cds--structured-list-th">Actor</div>
            <div class="cds--structured-list-th">Action</div>
            <div class="cds--structured-list-th">Entity</div>
          </div>
        </div>
        <div class="cds--structured-list-tbody">
          @for (evt of events; track evt.id) {
            <div class="cds--structured-list-row">
              <div class="cds--structured-list-td">{{ evt.time }}</div>
              <div class="cds--structured-list-td">{{ evt.actor }}</div>
              <div class="cds--structured-list-td">{{ evt.action }}</div>
              <div class="cds--structured-list-td">{{ evt.entity }}</div>
            </div>
          }
          @if (events.length === 0) {
            <div class="cds--structured-list-row">
              <div class="cds--structured-list-td" style="grid-column:1/-1">{{ emptyLabel || 'No recent activity' }}</div>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: [`.mra { margin-block-end: var(--cds-spacing-05); }`],
})
export class ModuleRecentActivityComponent {
  @Input() events: { id: string; time: string; actor: string; action: string; entity: string }[] = [];
  @Input() loading = false;
  @Input() emptyLabel = '';
}

// ─── 10. ModuleAuditTrailPanel ──────────────────────────────────────
@Component({
  selector: 'app-module-audit-trail-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TagModule, SkeletonModule, ModalModule, DosCarbonSearchComponent],
  template: `
    <div class="matp">
      <div class="matp-toolbar">
        <dos-carbon-search
          ariaLabelKey="shell.module-page-chrome.search.ariaLabel"
          size="sm"
          (valueChange)="searchChange.emit($event)">
        </dos-carbon-search>
      </div>
      @if (loading) {
        <cds-skeleton-text [lines]="5"></cds-skeleton-text>
      } @else {
        <table class="cds--data-table">
          <thead><tr>
            <th class="cds--table-header-label">Time</th>
            <th class="cds--table-header-label">Actor</th>
            <th class="cds--table-header-label">Action</th>
            <th class="cds--table-header-label">Entity</th>
            <th class="cds--table-header-label">Outcome</th>
          </tr></thead>
          <tbody>
            @for (row of rows; track row.id) {
              <tr class="matp-clickable" (click)="rowClick.emit(row)">
                <td>{{ row.time }}</td>
                <td>{{ row.actor }}</td>
                <td>{{ row.action }}</td>
                <td>{{ row.entity }}</td>
                <td><cds-tag [type]="row.outcome === 'success' ? 'green' : 'red'" size="sm">{{ row.outcome }}</cds-tag></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .matp { margin-block-end: var(--cds-spacing-05); }
    .matp-toolbar { margin-block-end: var(--cds-spacing-04); }
    .cds--data-table { width: 100%; }
    .matp-clickable { cursor: pointer; }
    .matp-clickable:hover { background: var(--cds-layer-hover-01); }
  `],
})
export class ModuleAuditTrailPanelComponent {
  @Input() rows: { id: string; time: string; actor: string; action: string; entity: string; outcome: string }[] = [];
  @Input() loading = false;
  @Output() searchChange = new EventEmitter<string>();
  @Output() rowClick = new EventEmitter<any>();
}

// ─── 11. ModuleCopilotPanel ─────────────────────────────────────────
@Component({
  selector: 'app-module-copilot-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, IconModule, TagModule],
  template: `
    <cds-tile class="mcp">
      <div class="mcp-header">
        <svg cdsIcon="machine-learning-model" size="20" class="mcp-icon"></svg>
        <span class="mcp-title">{{ title || 'AI Copilot' }}</span>
        <cds-tag type="purple" size="sm">{{ statusLabel || 'Beta' }}</cds-tag>
      </div>
      <p class="mcp-desc">{{ description || 'AI-powered insights and recommendations for this module.' }}</p>
      @if (suggestions.length > 0) {
        <div class="mcp-suggestions">
          @for (s of suggestions; track s) {
            <div class="mcp-suggestion">
              <svg cdsIcon="idea" size="16"></svg>
              <span>{{ s }}</span>
            </div>
          }
        </div>
      }
    </cds-tile>
  `,
  styles: [`
    .mcp { margin-block-end: var(--cds-spacing-05); }
    .mcp-header { display: flex; align-items: center; gap: var(--cds-spacing-03); margin-block-end: var(--cds-spacing-03); }
    .mcp-icon { fill: var(--cds-support-info); }
    .mcp-title { font-size: var(--cds-heading-02-font-size); font-weight: 600; }
    .mcp-desc { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); margin-block-end: var(--cds-spacing-04); }
    .mcp-suggestions { display: flex; flex-direction: column; gap: var(--cds-spacing-02); }
    .mcp-suggestion { display: flex; align-items: flex-start; gap: var(--cds-spacing-02); font-size: var(--cds-body-compact-01-font-size); }
    .mcp-suggestion svg { fill: var(--cds-support-info); flex-shrink: 0; margin-top: 2px; }
  `],
})
export class ModuleCopilotPanelComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() statusLabel = '';
  @Input() suggestions: string[] = [];
}

// ─── 12. ModuleEmptyState ───────────────────────────────────────────
@Component({
  selector: 'app-module-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TilesModule, NotificationModule, ButtonModule, TooltipModule, IconModule],
  template: `
    <cds-tile class="mes">
      @if (icon) { <svg [attr.cdsIcon]="icon" size="32" class="mes-icon"></svg> }
      <cds-notification
        [notificationObj]="{ type: kind || 'info', title: title || 'No data', message: message || '' }"
        [showClose]="false">
      </cds-notification>
      @if (actionLabel) {
        <cds-tooltip [description]="actionDisabledReason || 'Available in Phase 3'">
          <button cdsButton="primary" size="sm" [disabled]="actionDisabled ?? true" (click)="action.emit()">
            {{ actionLabel }}
          </button>
        </cds-tooltip>
      }
    </cds-tile>
  `,
  styles: [`
    .mes { display: flex; flex-direction: column; align-items: center; gap: var(--cds-spacing-04); padding: var(--cds-spacing-07); text-align: center; }
    .mes-icon { fill: var(--cds-text-secondary); }
  `],
})
export class ModuleEmptyStateComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() icon = '';
  @Input() kind: 'info' | 'warning' | 'error' | 'success' = 'info';
  @Input() actionLabel = '';
  @Input() actionDisabled = true;
  @Input() actionDisabledReason = '';
  @Output() action = new EventEmitter<void>();
}
