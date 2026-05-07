/**
 * Phase F — 15 extended page-archetype renderers (roster patch 31).
 *
 * Co-located thin standalone Angular components for the 15 new archetypes
 * that did not previously ship as renderer files. Each renderer:
 *   ① is a `standalone: true` component with `OnPush` change detection,
 *   ② imports ONLY raw IBM Carbon primitives from `carbon-components-angular`
 *      (grid, tiles, table, tabs, structured-list, progress-indicator,
 *      notification, tag, button, skeleton, breadcrumb, ai-label) — no
 *      PrimeNG, no custom UI vendors,
 *   ③ embeds the universal `<dos-insight-bar>` for the 5-pillar story,
 *   ④ uses the universal `Module*` typed inputs, keeping the
 *      `currentRole` / `writeRoles` view-mode contract,
 *   ⑤ supports a loading skeleton state and an error notification.
 *
 * The 3 already-existing renderers (DecisionDashboard, AuditTrail,
 * CalendarTimeline) live in their own files and are re-exported by
 * `templates/index.ts` alongside these.
 *
 * IBM Carbon contract: every primitive used here is registered in
 * `dos.ui_carbon_components` with `vendor='ibm-carbon'` and
 * `runtime_status IN ('active','wrapper-required')`. The
 * `trg_carbon_only_runtime` DB trigger and the carbon-boundary CI guard
 * reject any non-Carbon vendor entering the page surface.
 *
 * Renderer count: 15 (this file) + 3 (decision-dashboard, audit-trail,
 * calendar-timeline) = 18 new archetypes shipped, completing the
 * 31-archetype roster.
 *
 * NOTE: each `@Component` argument is a literal object so Angular AOT can
 * statically analyse it; common content (imports tuple, masthead template,
 * styles) is referenced through file-scope `const` bindings which the
 * compiler accepts as constant references.
 */
import {
  Component, Directive, Input, ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, StructuredListModule, ProgressBarModule,
  GridModule, LinkModule, ProgressIndicatorModule, TableModule,
} from 'carbon-components-angular';
import {
  ModuleKpi, ModuleAction, ModuleTab, ModuleNotification, ModuleRole,
  resolveViewMode, RoleViewMode, ModuleInsightPillars,
} from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';

// ─── Shared imports tuple — referenced by every @Component below ────────────
const DAX_IMPORTS = [
  CommonModule, RouterModule,
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, StructuredListModule, ProgressBarModule,
  ProgressIndicatorModule, TableModule, GridModule, LinkModule,
  DosInsightBarComponent,
];

// ─── Shared masthead fragment (template-literal — statically analysable) ────
const DAX_MASTHEAD = `
  @if (loading) {
    <cds-tile class="dax-skeleton-tile">
      <div cdsSkeletonText [lines]="2" heading></div>
    </cds-tile>
  } @else {
    @if (notification) {
      <cds-notification
        [notificationType]="notification.type"
        [title]="notification.title"
        [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }
    <cds-tile class="dax-masthead">
      @if (eyebrow) {
        <cds-breadcrumb [noTrailingSlash]="true">
          <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
        </cds-breadcrumb>
      }
      @if (aiHeadline) {
        <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label>
      }
      <h1 class="dax-title">{{ title }}</h1>
      @if (subtitle) { <p class="dax-subtitle">{{ subtitle }}</p> }
      <div class="dax-tags-row">
        @for (t of statusTags; track t.label) {
          <cds-tag [type]="tagType(t.severity)">{{ t.label }}</cds-tag>
        }
      </div>
      @if (primaryAction && viewMode() !== 'limited') {
        <button cdsButton="primary" size="sm">{{ primaryAction.label }}</button>
      }
    </cds-tile>
    <dos-insight-bar [pillars]="pillars" [archetype]="archetypeKey"></dos-insight-bar>
  }`;

const DAX_STYLES = `
  :host { display: block; }
  .dax-masthead { padding: 1.5rem 2rem; margin-bottom: 1rem; }
  .dax-title { font-size: 2rem; font-weight: 400; margin: 0.25rem 0; }
  .dax-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0 0 0.75rem; }
  .dax-tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .dax-skeleton-tile { height: 160px; }
  .dax-grid { display: grid; gap: 1rem; }
  .dax-grid--2 { grid-template-columns: 1fr 1fr; }
  .dax-grid--3 { grid-template-columns: repeat(3, 1fr); }
  .dax-grid--kpi { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
  .dax-tile { padding: 1rem; }
  .dax-kpi-label { font-size: 0.75rem; color: var(--cds-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 .25rem; }
  .dax-kpi-value { font-size: 1.75rem; font-weight: 300; margin: 0; }
  .dax-mono { font-family: var(--cds-code-01-font-family); font-size: .75rem; }
  @media (max-width: 1024px) { .dax-grid--3 { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 768px)  { .dax-grid--3, .dax-grid--2 { grid-template-columns: 1fr; } }
`;

// ─── Shared base: typed inputs every extended renderer accepts ──────────────
@Directive({ standalone: true })
abstract class ExtendedTemplateBase {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() kpis: ModuleKpi[] = [];
  @Input() tabs: ModuleTab[] = [];
  @Input() statusTags: Array<{ label: string; severity?: string }> = [];
  @Input() primaryAction: ModuleAction | null = null;
  @Input() emptyStateTitle = '';
  @Input() emptyStateDescription = '';
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  abstract archetypeKey: string;

  viewMode = computed<RoleViewMode>(() => resolveViewMode(this.currentRole, this.writeRoles));

  tagType(severity?: string): string {
    const map: Record<string, string> = {
      critical: 'red', warning: 'warm-gray', success: 'green',
      high: 'orange', medium: 'yellow', low: 'teal', info: 'blue',
    };
    return map[severity ?? 'info'] ?? 'gray';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Command Dashboard
// ═══════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-command-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <div class="dax-grid dax-grid--kpi">
        @for (kpi of kpis; track kpi.label) {
          <cds-clickable-tile class="dax-tile" [routerLink]="kpi.link ?? null">
            <p class="dax-kpi-label">{{ kpi.label }}</p>
            <p class="dax-kpi-value">{{ kpi.value }}</p>
            @if (kpi.aiInsight) {
              <cds-ai-label kind="inline" size="sm">{{ kpi.aiInsight }}</cds-ai-label>
            }
          </cds-clickable-tile>
        }
      </div>
    }`,
  styles: [DAX_STYLES],
})
export class CommandDashboardTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'command-dashboard';
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Export Center
// ═══════════════════════════════════════════════════════════════════════════
export interface ExportArtifact {
  id: string; title: string; format: 'pdf' | 'csv' | 'xlsx' | 'json';
  status: 'ready' | 'generating' | 'failed'; sizeKb?: number; downloadUrl?: string;
}
@Component({
  selector: 'dos-export-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Title</cds-list-column>
            <cds-list-column>Format</cds-list-column>
            <cds-list-column>Status</cds-list-column>
            <cds-list-column>Size</cds-list-column>
          </cds-list-header>
          @for (a of artifacts; track a.id) {
            <cds-list-row>
              <cds-list-column>
                @if (a.downloadUrl && a.status === 'ready') {
                  <a cdsLink [href]="a.downloadUrl">{{ a.title }}</a>
                } @else { {{ a.title }} }
              </cds-list-column>
              <cds-list-column><cds-tag type="gray">{{ a.format }}</cds-tag></cds-list-column>
              <cds-list-column>
                <cds-tag [type]="a.status === 'ready' ? 'green' : a.status === 'failed' ? 'red' : 'blue'">{{ a.status }}</cds-tag>
              </cds-list-column>
              <cds-list-column>{{ a.sizeKb ? a.sizeKb + ' KB' : '—' }}</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class ExportCenterTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'export-center';
  @Input() artifacts: ExportArtifact[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Compliance Calendar
// ═══════════════════════════════════════════════════════════════════════════
export interface ComplianceCalendarEvent {
  id: string; date: string; title: string; framework?: string;
  severity?: 'critical' | 'warning' | 'info'; owner?: string; route?: string;
}
@Component({
  selector: 'dos-compliance-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Date</cds-list-column>
            <cds-list-column>Obligation</cds-list-column>
            <cds-list-column>Framework</cds-list-column>
            <cds-list-column>Owner</cds-list-column>
            <cds-list-column>Severity</cds-list-column>
          </cds-list-header>
          @for (e of events; track e.id) {
            <cds-list-row>
              <cds-list-column>{{ e.date }}</cds-list-column>
              <cds-list-column>
                @if (e.route) { <a cdsLink [routerLink]="e.route">{{ e.title }}</a> } @else { {{ e.title }} }
              </cds-list-column>
              <cds-list-column>{{ e.framework ?? '—' }}</cds-list-column>
              <cds-list-column>{{ e.owner ?? '—' }}</cds-list-column>
              <cds-list-column><cds-tag [type]="tagType(e.severity)">{{ e.severity ?? 'info' }}</cds-tag></cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class ComplianceCalendarTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'compliance-calendar';
  @Input() events: ComplianceCalendarEvent[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Workflow Timeline
// ═══════════════════════════════════════════════════════════════════════════
export interface WorkflowTimelineStep {
  id: string; label: string; state: 'complete' | 'current' | 'incomplete' | 'invalid';
  description?: string; owner?: string; ts?: string;
}
@Component({
  selector: 'dos-workflow-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-progress-indicator
          [steps]="progressSteps"
          [current]="currentIndex"
          orientation="horizontal">
        </cds-progress-indicator>
        <cds-structured-list>
          @for (s of steps; track s.id) {
            <cds-list-row>
              <cds-list-column>
                <cds-tag [type]="s.state === 'complete' ? 'green' : s.state === 'current' ? 'blue' : s.state === 'invalid' ? 'red' : 'gray'">{{ s.state }}</cds-tag>
              </cds-list-column>
              <cds-list-column>{{ s.label }}</cds-list-column>
              <cds-list-column>{{ s.owner ?? '—' }}</cds-list-column>
              <cds-list-column>{{ s.ts ?? '—' }}</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class WorkflowTimelineTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'workflow-timeline';
  @Input() steps: WorkflowTimelineStep[] = [];
  get progressSteps() { return this.steps.map(s => ({ text: s.label, state: [s.state] })); }
  get currentIndex() { return Math.max(0, this.steps.findIndex(s => s.state === 'current')); }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. Remediation Roadmap
// ═══════════════════════════════════════════════════════════════════════════
export interface RoadmapMilestone {
  id: string; title: string; due: string; progress: number;
  owner?: string; status?: 'on-track' | 'at-risk' | 'blocked' | 'done';
}
@Component({
  selector: 'dos-remediation-roadmap',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <div class="dax-grid dax-grid--3">
        @for (m of milestones; track m.id) {
          <cds-tile class="dax-tile">
            <p class="dax-kpi-label">{{ m.due }}</p>
            <h3 style="margin:.25rem 0;">{{ m.title }}</h3>
            <cds-progress-bar
              [value]="m.progress" max="100"
              [status]="m.status === 'blocked' ? 'error' : m.status === 'done' ? 'finished' : 'active'"
              size="sm" [label]="m.progress + '%'">
            </cds-progress-bar>
            <p class="dax-kpi-label" style="margin-top:.5rem;">Owner: {{ m.owner ?? '—' }}</p>
            @if (m.status) {
              <cds-tag [type]="m.status === 'done' ? 'green' : m.status === 'blocked' ? 'red' : m.status === 'at-risk' ? 'yellow' : 'blue'">{{ m.status }}</cds-tag>
            }
          </cds-tile>
        }
      </div>
    }`,
  styles: [DAX_STYLES],
})
export class RemediationRoadmapTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'remediation-roadmap';
  @Input() milestones: RoadmapMilestone[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Org Chart
// ═══════════════════════════════════════════════════════════════════════════
export interface OrgChartNode {
  id: string; name: string; title?: string; parentId?: string | null;
  email?: string; depth?: number; route?: string;
}
@Component({
  selector: 'dos-org-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Name</cds-list-column>
            <cds-list-column>Title</cds-list-column>
            <cds-list-column>Reports To</cds-list-column>
          </cds-list-header>
          @for (n of nodes; track n.id) {
            <cds-list-row>
              <cds-list-column>
                <span [style.paddingInlineStart.rem]="(n.depth ?? 0)">
                  @if (n.route) {
                    <a cdsLink [routerLink]="n.route">{{ n.name }}</a>
                  } @else { {{ n.name }} }
                </span>
              </cds-list-column>
              <cds-list-column>{{ n.title ?? '—' }}</cds-list-column>
              <cds-list-column>{{ parentName(n.parentId) }}</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class OrgChartTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'org-chart';
  @Input() nodes: OrgChartNode[] = [];
  parentName(pid?: string | null): string {
    if (!pid) return '—';
    return this.nodes.find(n => n.id === pid)?.name ?? '—';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. Ownership Map
// ═══════════════════════════════════════════════════════════════════════════
export type OwnershipRole =
  | 'accountable' | 'responsible' | 'approver' | 'reviewer' | 'consulted'
  | 'informed' | 'delegate' | 'backup' | 'escalation';
export interface OwnershipEdge {
  recordId: string; recordLabel: string; recordType: string;
  ownerId: string | null; ownerName: string | null;
  role: OwnershipRole; sodConflict?: boolean; overloaded?: boolean;
  delegationExpiresAt?: string | null;
}
@Component({
  selector: 'dos-ownership-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <table cdsTable size="md">
          <thead>
            <tr><th>Record</th><th>Type</th><th>Owner</th><th>Role</th><th>Health</th></tr>
          </thead>
          <tbody>
            @for (e of edges; track e.recordId + e.role) {
              <tr>
                <td>{{ e.recordLabel }}</td>
                <td>{{ e.recordType }}</td>
                <td>{{ e.ownerName ?? '— missing —' }}</td>
                <td><cds-tag type="blue">{{ e.role }}</cds-tag></td>
                <td>
                  @if (!e.ownerId) { <cds-tag type="red">no-owner</cds-tag> }
                  @if (e.sodConflict) { <cds-tag type="red">SoD</cds-tag> }
                  @if (e.overloaded) { <cds-tag type="yellow">overloaded</cds-tag> }
                  @if (e.delegationExpiresAt) { <cds-tag type="warm-gray">delegation</cds-tag> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class OwnershipMapTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'ownership-map';
  @Input() edges: OwnershipEdge[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Delegation Center
// ═══════════════════════════════════════════════════════════════════════════
export interface DelegationRule {
  id: string; delegator: string; delegate: string; scope: string;
  startsAt: string; expiresAt: string;
  status: 'active' | 'expired' | 'pending' | 'revoked';
  permission?: string;
}
@Component({
  selector: 'dos-delegation-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <table cdsTable size="md">
          <thead><tr><th>Delegator</th><th>Delegate</th><th>Scope</th><th>From</th><th>Until</th><th>Status</th></tr></thead>
          <tbody>
            @for (r of rules; track r.id) {
              <tr>
                <td>{{ r.delegator }}</td>
                <td>{{ r.delegate }}</td>
                <td>{{ r.scope }}</td>
                <td>{{ r.startsAt }}</td>
                <td>{{ r.expiresAt }}</td>
                <td><cds-tag [type]="r.status === 'active' ? 'green' : r.status === 'expired' ? 'red' : r.status === 'pending' ? 'blue' : 'warm-gray'">{{ r.status }}</cds-tag></td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">
                  <div class="dax-empty-state">
                    @if (emptyStateTitle) { <h3>{{ emptyStateTitle }}</h3> }
                    @if (emptyStateDescription) { <p>{{ emptyStateDescription }}</p> }
                    @if (primaryAction?.route && primaryAction?.label) {
                      <button cdsButton="primary" size="sm" [routerLink]="[primaryAction!.route!]">
                        {{ primaryAction!.label }}
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </cds-tile>
    }`,
  styles: [DAX_STYLES + `
    .dax-empty-state { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
  `],
})
export class DelegationCenterTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'delegation-center';
  @Input() rules: DelegationRule[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. Agent Flow
// ═══════════════════════════════════════════════════════════════════════════
export interface AgentFlowStep {
  id: string; ord: number; agent: string; tool?: string;
  status: 'pending' | 'running' | 'ok' | 'failed';
  input?: string; output?: string; ts?: string;
}
@Component({
  selector: 'dos-agent-flow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>#</cds-list-column>
            <cds-list-column>Agent</cds-list-column>
            <cds-list-column>Tool</cds-list-column>
            <cds-list-column>Status</cds-list-column>
            <cds-list-column>Time</cds-list-column>
          </cds-list-header>
          @for (s of steps; track s.id) {
            <cds-list-row>
              <cds-list-column>{{ s.ord }}</cds-list-column>
              <cds-list-column><cds-ai-label kind="inline" size="sm">{{ s.agent }}</cds-ai-label></cds-list-column>
              <cds-list-column>{{ s.tool ?? '—' }}</cds-list-column>
              <cds-list-column><cds-tag [type]="s.status === 'ok' ? 'green' : s.status === 'failed' ? 'red' : s.status === 'running' ? 'blue' : 'gray'">{{ s.status }}</cds-tag></cds-list-column>
              <cds-list-column>{{ s.ts ?? '—' }}</cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class AgentFlowTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'agent-flow';
  @Input() steps: AgentFlowStep[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. Agent Registry
// ═══════════════════════════════════════════════════════════════════════════
export interface AgentRegistryEntry {
  id: string; name: string; vendor?: string; model?: string;
  scope?: string; permissions?: string[];
  status: 'enabled' | 'disabled' | 'sandbox';
}
@Component({
  selector: 'dos-agent-registry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <table cdsTable size="md">
          <thead><tr><th>Name</th><th>Model</th><th>Scope</th><th>Status</th></tr></thead>
          <tbody>
            @for (a of agents; track a.id) {
              <tr>
                <td><cds-ai-label kind="inline" size="sm">{{ a.name }}</cds-ai-label></td>
                <td>{{ a.model ?? '—' }}</td>
                <td>{{ a.scope ?? '—' }}</td>
                <td><cds-tag [type]="a.status === 'enabled' ? 'green' : a.status === 'sandbox' ? 'blue' : 'warm-gray'">{{ a.status }}</cds-tag></td>
              </tr>
            }
          </tbody>
        </table>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class AgentRegistryTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'agent-registry';
  @Input() agents: AgentRegistryEntry[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. User Agent Workbench
// ═══════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-user-agent-workbench',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-tabs type="line" [followFocus]="true">
          @for (t of tabs; track t.id) {
            <cds-tab [id]="t.id" [heading]="t.label"></cds-tab>
          }
        </cds-tabs>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class UserAgentWorkbenchTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'user-agent-workbench';
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. Audit Trail Ledger
// ═══════════════════════════════════════════════════════════════════════════
export interface AuditLedgerRow {
  id: string; ts: string; actor: string; action: string; entity?: string;
  outcome: 'allow' | 'deny' | 'error'; hashChain?: string; ip?: string;
}
@Component({
  selector: 'dos-audit-trail-ledger',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <table cdsTable size="sm">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Outcome</th><th>Hash</th></tr></thead>
          <tbody>
            @for (r of rows; track r.id) {
              <tr>
                <td>{{ r.ts }}</td>
                <td>{{ r.actor }}</td>
                <td>{{ r.action }}</td>
                <td>{{ r.entity ?? '—' }}</td>
                <td><cds-tag [type]="r.outcome === 'allow' ? 'green' : r.outcome === 'deny' ? 'yellow' : 'red'">{{ r.outcome }}</cds-tag></td>
                <td><span class="dax-mono">{{ r.hashChain ?? '—' }}</span></td>
              </tr>
            }
          </tbody>
        </table>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class AuditTrailLedgerTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'audit-trail-ledger';
  @Input() rows: AuditLedgerRow[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 13. Audit Trail Evidence
// ═══════════════════════════════════════════════════════════════════════════
export interface AuditEvidenceArtifact {
  id: string; label: string;
  kind: 'screenshot' | 'document' | 'log' | 'hash' | 'attestation';
  collectedAt: string; collectedBy?: string;
  storageUri?: string; sha256?: string;
}
@Component({
  selector: 'dos-audit-trail-evidence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-tabs type="line" [followFocus]="true">
          @for (t of tabs; track t.id) {
            <cds-tab [id]="t.id" [heading]="t.label"></cds-tab>
          }
        </cds-tabs>
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Artifact</cds-list-column>
            <cds-list-column>Kind</cds-list-column>
            <cds-list-column>Collected</cds-list-column>
            <cds-list-column>SHA-256</cds-list-column>
          </cds-list-header>
          @for (a of artifacts; track a.id) {
            <cds-list-row>
              <cds-list-column>
                @if (a.storageUri) { <a cdsLink [href]="a.storageUri">{{ a.label }}</a> } @else { {{ a.label }} }
              </cds-list-column>
              <cds-list-column><cds-tag type="gray">{{ a.kind }}</cds-tag></cds-list-column>
              <cds-list-column>{{ a.collectedAt }}</cds-list-column>
              <cds-list-column><span class="dax-mono">{{ a.sha256 ?? '—' }}</span></cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class AuditTrailEvidenceTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'audit-trail-evidence';
  @Input() artifacts: AuditEvidenceArtifact[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 14. Follow-up Center
// ═══════════════════════════════════════════════════════════════════════════
export interface FollowUpItem {
  id: string; title: string; sourceModule?: string; due?: string;
  owner?: string; severity?: 'critical' | 'warning' | 'info';
  status: 'open' | 'in-progress' | 'closed' | 'overdue'; route?: string;
}
@Component({
  selector: 'dos-follow-up-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <cds-tile class="dax-tile">
        <cds-structured-list>
          <cds-list-header>
            <cds-list-column>Title</cds-list-column>
            <cds-list-column>Source</cds-list-column>
            <cds-list-column>Owner</cds-list-column>
            <cds-list-column>Due</cds-list-column>
            <cds-list-column>Status</cds-list-column>
          </cds-list-header>
          @for (i of items; track i.id) {
            <cds-list-row>
              <cds-list-column>
                @if (i.route) { <a cdsLink [routerLink]="i.route">{{ i.title }}</a> } @else { {{ i.title }} }
              </cds-list-column>
              <cds-list-column>{{ i.sourceModule ?? '—' }}</cds-list-column>
              <cds-list-column>{{ i.owner ?? '—' }}</cds-list-column>
              <cds-list-column>{{ i.due ?? '—' }}</cds-list-column>
              <cds-list-column><cds-tag [type]="i.status === 'closed' ? 'green' : i.status === 'overdue' ? 'red' : i.status === 'in-progress' ? 'blue' : 'gray'">{{ i.status }}</cds-tag></cds-list-column>
            </cds-list-row>
          }
        </cds-structured-list>
      </cds-tile>
    }`,
  styles: [DAX_STYLES],
})
export class FollowUpCenterTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'follow-up-center';
  @Input() items: FollowUpItem[] = [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 15. Incident Response War Room
// ═══════════════════════════════════════════════════════════════════════════
export interface IncidentRunbookStep {
  id: string; ord: number;
  phase: 'detect' | 'classify' | 'contain' | 'investigate' | 'notify'
       | 'evidence' | 'resolve' | 'postmortem';
  label: string; owner?: string; ts?: string;
  state: 'pending' | 'in-progress' | 'done' | 'blocked';
}
export interface IncidentCommunication {
  id: string;
  channel: 'internal' | 'executive' | 'regulator' | 'customer' | 'legal';
  status: 'draft' | 'awaiting-approval' | 'sent' | 'acknowledged';
  updatedAt?: string;
}
@Component({
  selector: 'dos-incident-response',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: DAX_IMPORTS,
  template: DAX_MASTHEAD + `
    @if (!loading) {
      <div class="dax-grid dax-grid--kpi">
        @for (kpi of kpis; track kpi.label) {
          <cds-tile class="dax-tile">
            <p class="dax-kpi-label">{{ kpi.label }}</p>
            <p class="dax-kpi-value">{{ kpi.value }}</p>
          </cds-tile>
        }
      </div>
      <div class="dax-grid dax-grid--3" style="margin-top:1rem;">
        <cds-tile class="dax-tile">
          <h3 style="margin:0 0 .5rem;">Runbook</h3>
          <cds-structured-list>
            @for (s of runbook; track s.id) {
              <cds-list-row>
                <cds-list-column>{{ s.ord }}</cds-list-column>
                <cds-list-column>{{ s.label }}</cds-list-column>
                <cds-list-column><cds-tag [type]="s.state === 'done' ? 'green' : s.state === 'blocked' ? 'red' : s.state === 'in-progress' ? 'blue' : 'gray'">{{ s.state }}</cds-tag></cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
        <cds-tile class="dax-tile">
          <h3 style="margin:0 0 .5rem;">War-room Tasks</h3>
          <cds-structured-list>
            @for (t of tabs; track t.id) {
              <cds-list-row>
                <cds-list-column><cds-tag type="blue">task</cds-tag></cds-list-column>
                <cds-list-column>{{ t.label }}</cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
        <cds-tile class="dax-tile">
          <h3 style="margin:0 0 .5rem;">Communications</h3>
          <cds-structured-list>
            @for (c of communications; track c.id) {
              <cds-list-row>
                <cds-list-column><cds-tag type="gray">{{ c.channel }}</cds-tag></cds-list-column>
                <cds-list-column>{{ c.status }}</cds-list-column>
                <cds-list-column>{{ c.updatedAt ?? '—' }}</cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
      </div>
    }`,
  styles: [DAX_STYLES],
})
export class IncidentResponseTemplateComponent extends ExtendedTemplateBase {
  archetypeKey = 'incident-response';
  @Input() runbook: IncidentRunbookStep[] = [];
  @Input() communications: IncidentCommunication[] = [];
}
