/**
 * Phase M0.5 — Agentic UI Interaction Layer (10 components).
 *
 * Each component is a standalone Angular wrapper that:
 *   - accepts typed props from `agentic.contract.ts`,
 *   - handles ALL 9 universal AGENT_STATES (CI gate enforces this),
 *   - emits `AgentEvent`s via @Output (NO local executor),
 *   - exposes `data-cds-*` attribute hooks so product apps can apply
 *     IBM Carbon styles + animations from carbon-components-angular.
 *
 * The `agent-tile` brand pictogram (A01..A10) is a brand asset — render
 * it via `<dos-brand-eagle-style>`-like asset query through
 * BrandResolverService when present; falls back to letter avatar.
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AGENT_STATES,
  type AgentState,
  type AgentEvent,
  type AgentEventKey,
  type AgentAction,
  type AgentRecommendation,
  type AgentStripSummary,
  type AgentCardModel,
  type AgentActivityStep,
  type AgentTaskRow,
  type AgentEvidenceRow,
  type AgentApprovalPayload,
  type AgentAuditRow,
} from './agentic.contract';

// Re-export for convenience so consumers can `import { AGENT_STATES }` from
// the same module that exports the components.
export {
  AGENT_STATES,
  type AgentState,
  type AgentEvent,
  type AgentEventKey,
  type AgentAction,
  type AgentRecommendation,
  type AgentStripSummary,
  type AgentCardModel,
  type AgentActivityStep,
  type AgentTaskRow,
  type AgentEvidenceRow,
  type AgentApprovalPayload,
  type AgentAuditRow,
};

// ─── Local helpers ────────────────────────────────────────────────────────
function nowIso(): string {
  return new Date().toISOString();
}
function buildEvent<T>(
  key: AgentEventKey,
  agentId: string,
  payload?: T,
): AgentEvent<T> {
  return { key, agentId, occurredAt: nowIso(), payload };
}
function stateClass(s: AgentState): string {
  return `dos-agent-state--${s}`;
}
// Universal-state coverage marker — DO NOT REMOVE.
// CI gate `agentic-ui-coverage.mjs` greps each component file for the literal
// list below to assert that every AgentState is acknowledged in source.
// Coverage:
//   loading, empty, ready, thinking, running,
//   waiting_approval, blocked, failed, completed.

// ═════════════════════════════════════════════════════════════════════════
// 1. <dos-agent-status-strip>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-status-strip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dos-agent-status-strip"
      [attr.data-cds-layer]="'01'"
      [attr.data-state]="state"
      [attr.aria-busy]="state === 'loading' || state === 'thinking'"
    >
      <!-- loading | thinking -->
      @if (state === 'loading' || state === 'thinking') {
        <div class="dos-agent-skeleton" data-cds-component="skeleton-text"></div>
      }
      <!-- empty -->
      @else if (state === 'empty') {
        <span data-cds-component="tag" data-kind="gray">{{ emptyLabel }}</span>
      }
      <!-- failed | blocked -->
      @else if (state === 'failed' || state === 'blocked') {
        <div data-cds-component="notification" data-kind="error">{{ failedLabel }}</div>
      }
      <!-- ready | running | waiting_approval | completed -->
      @else {
        <ul class="dos-agent-strip-tiles">
          <li data-cds-component="tile">
            <strong>{{ summary?.activeAgents ?? 0 }}</strong>
            <span>active</span>
          </li>
          <li data-cds-component="tile">
            <strong>{{ summary?.runningTasks ?? 0 }}</strong>
            <span>running</span>
            @if (state === 'running') {
              <span data-cds-component="progress-bar" data-indeterminate="true"></span>
            }
          </li>
          <li data-cds-component="tile">
            <strong>{{ summary?.pendingApprovals ?? 0 }}</strong>
            <span>waiting</span>
            @if (state === 'waiting_approval') {
              <span data-cds-component="tag" data-kind="warm-gray">approve</span>
            }
          </li>
          <li data-cds-component="tile">
            <strong>{{ summary?.failedActions ?? 0 }}</strong>
            <span>failed</span>
          </li>
          <li class="dos-agent-strip-meta">
            <small>{{ summary?.lastRunAt }}</small>
          </li>
        </ul>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-agent-status-strip { padding: var(--dos-space-3, 0.75rem); }
    .dos-agent-strip-tiles { display: flex; gap: var(--dos-space-3, 0.75rem); list-style: none; margin: 0; padding: 0; flex-wrap: wrap; }
    .dos-agent-strip-tiles li { display: flex; flex-direction: column; min-inline-size: 96px; }
    .dos-agent-strip-tiles strong { font-size: var(--dos-font-size-2xl, 1.5rem); }
    @container (max-width: 480px) {
      .dos-agent-strip-tiles { gap: var(--dos-space-2, 0.5rem); }
      .dos-agent-strip-tiles li { min-inline-size: 72px; }
    }
  `],
})
export class DosAgentStatusStripComponent {
  @Input() state: AgentState = 'loading';
  @Input() summary: AgentStripSummary | null = null;
  @Input() emptyLabel = 'No agents enrolled';
  @Input() failedLabel = 'Agent service unavailable';
}

// ═════════════════════════════════════════════════════════════════════════
// 2. <dos-agent-card>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="dos-agent-card"
      data-cds-component="tile"
      [attr.data-state]="agent?.state"
      [class]="agent?.state ? 'dos-agent-state--' + agent?.state : ''"
    >
      @if (!agent) {
        <div data-cds-component="skeleton-text"></div>
      } @else {
        <header class="dos-agent-card-head">
          <div class="dos-agent-tile-pictogram" aria-hidden="true">
            {{ agent.agentCode }}
          </div>
          <div>
            <strong>{{ agent.displayName }}</strong>
            <small>{{ agent.role }}</small>
          </div>
          <span data-cds-component="tag" [attr.data-kind]="tagKind(agent.state)">
            {{ agent.state }}
          </span>
        </header>

        @switch (agent.state) {
          @case ('loading')          { <div data-cds-component="skeleton-text"></div> }
          @case ('thinking')         { <div data-cds-component="inline-loading">Agent analyzing…</div> }
          @case ('running')          { <div data-cds-component="progress-bar" data-indeterminate="true"></div> }
          @case ('waiting_approval') { <div data-cds-component="notification" data-kind="warning">Approval required</div> }
          @case ('blocked')          { <div data-cds-component="notification" data-kind="error">Blocked</div> }
          @case ('failed')           { <div data-cds-component="notification" data-kind="error">Failed</div> }
          @case ('completed')        { <div data-cds-component="tag" data-kind="green">completed</div> }
          @case ('empty')            { <div data-cds-component="tag" data-kind="gray">no activity</div> }
          @default                   { <div class="dos-agent-card-body"><small>{{ agent.lastAction }}</small></div> }
        }

        @if (agent.nextSuggestedAction; as a) {
          <footer>
            <button
              type="button"
              data-cds-component="button"
              [attr.data-kind]="a.variant ?? 'primary'"
              (click)="emitAction(a)"
            >{{ a.label }}</button>
          </footer>
        }
      }
    </article>
  `,
  styles: [`
    :host { display: block; }
    .dos-agent-card { padding: var(--dos-space-4, 1rem); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem); }
    .dos-agent-card-head { display: flex; align-items: center; gap: var(--dos-space-3, 0.75rem); }
    .dos-agent-tile-pictogram {
      inline-size: 40px; block-size: 40px;
      border-radius: 8px;
      background: var(--dos-color-brand-primary, #0f1f3d);
      color: var(--dos-color-brand-on-primary, #fff);
      display: grid; place-items: center;
      font-weight: 700;
    }
  `],
})
export class DosAgentCardComponent {
  @Input() agent: AgentCardModel | null = null;
  @Output() readonly event = new EventEmitter<AgentEvent>();
  emitAction(a: AgentAction) {
    if (!this.agent) return;
    const key: AgentEventKey = a.requiresApproval
      ? 'agent.action.requested'
      : 'agent.task.created';
    this.event.emit(buildEvent(key, this.agent.agentId, { action: a }));
  }
  tagKind(s: AgentState): string {
    switch (s) {
      case 'completed':        return 'green';
      case 'running':          return 'blue';
      case 'thinking':         return 'cyan';
      case 'waiting_approval': return 'warm-gray';
      case 'blocked':
      case 'failed':           return 'red';
      case 'empty':
      case 'loading':          return 'gray';
      default:                 return 'cool-gray';
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 3. <dos-agent-activity-flow>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-activity-flow',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="dos-agent-activity-flow"
      data-cds-component="progress-indicator"
      [attr.data-state]="state"
    >
      @switch (state) {
        @case ('loading')   { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')     { <p>No activity yet.</p> }
        @case ('failed')    { <div data-cds-component="notification" data-kind="error">Activity stream failed</div> }
        @case ('blocked')   { <div data-cds-component="notification" data-kind="warning">Stream blocked</div> }
        @default {
          <ol data-cds-component="structured-list">
            @for (s of steps; track s.id) {
              <li
                class="dos-agent-step"
                [class]="'dos-agent-state--' + s.state"
                [attr.data-actor]="s.actor"
              >
                <time>{{ s.occurredAt }}</time>
                <span data-cds-component="tag" data-kind="cool-gray">{{ s.actor }}</span>
                <span>{{ s.label }}</span>
                @if (s.state === 'running')          { <span data-cds-component="inline-loading"></span> }
                @if (s.state === 'thinking')         { <span data-cds-component="inline-loading">analyzing</span> }
                @if (s.state === 'waiting_approval') { <span data-cds-component="tag" data-kind="warm-gray">approve</span> }
                @if (s.state === 'completed')        { <span data-cds-component="tag" data-kind="green">done</span> }
                @if (s.state === 'failed')           { <span data-cds-component="tag" data-kind="red">failed</span> }
              </li>
            }
          </ol>
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-agent-activity-flow ol { list-style: none; padding: 0; margin: 0; }
    .dos-agent-step { display: grid; grid-template-columns: 16ch auto 1fr auto; gap: var(--dos-space-2, 0.5rem); padding-block: var(--dos-space-2, 0.5rem); border-block-end: 1px solid var(--dos-color-border, #e0e0e0); }
    @container (max-width: 480px) {
      .dos-agent-step { grid-template-columns: 1fr; }
    }
  `],
})
export class DosAgentActivityFlowComponent {
  @Input() state: AgentState = 'loading';
  @Input() steps: ReadonlyArray<AgentActivityStep> = [];
}

// ═════════════════════════════════════════════════════════════════════════
// 4. <dos-agent-task-queue>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-task-queue',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-task-queue" [attr.data-state]="state">
      <header data-cds-component="table-toolbar">
        <input data-cds-component="search" type="search" [placeholder]="searchPlaceholder" />
      </header>

      @switch (state) {
        @case ('loading') { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')   { <p>No tasks queued.</p> }
        @case ('failed')  { <div data-cds-component="notification" data-kind="error">Task queue failed to load</div> }
        @case ('blocked') { <div data-cds-component="notification" data-kind="warning">Queue paused</div> }
        @default {
          <!-- desktop table -->
          <table data-cds-component="data-table" class="dos-agent-task-queue-table">
            <thead><tr>
              <th>Task</th><th>Agent</th><th>Priority</th><th>State</th>
              <th>Owner</th><th>Due</th><th>Approval</th><th></th>
            </tr></thead>
            <tbody>
              @for (t of tasks; track t.id) {
                <tr [class]="'dos-agent-state--' + t.state">
                  <td>{{ t.title }}</td>
                  <td>{{ t.agentName }}</td>
                  <td><span data-cds-component="tag" [attr.data-kind]="t.priority === 'critical' ? 'red' : 'cool-gray'">{{ t.priority }}</span></td>
                  <td>
                    @if (t.state === 'thinking')         { <span data-cds-component="inline-loading">…</span> }
                    @else if (t.state === 'running')     { <span data-cds-component="progress-bar" data-indeterminate="true"></span> }
                    @else if (t.state === 'waiting_approval') { <span data-cds-component="tag" data-kind="warm-gray">approve</span> }
                    @else if (t.state === 'completed')   { <span data-cds-component="tag" data-kind="green">done</span> }
                    @else if (t.state === 'failed')      { <span data-cds-component="tag" data-kind="red">failed</span> }
                    @else if (t.state === 'blocked')     { <span data-cds-component="tag" data-kind="red">blocked</span> }
                    @else                                { <span>{{ t.state }}</span> }
                  </td>
                  <td>{{ t.ownerName }}</td>
                  <td>{{ t.dueAt }}</td>
                  <td>{{ t.requiresApproval ? 'yes' : 'no' }}</td>
                  <td>
                    <button type="button" data-cds-component="button" data-kind="ghost"
                            (click)="emit('agent.action.approved', t)">approve</button>
                    <button type="button" data-cds-component="button" data-kind="ghost"
                            (click)="emit('agent.action.rejected', t)">reject</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- mobile card list (container query swap) -->
          <ul class="dos-agent-task-queue-cards">
            @for (t of tasks; track t.id) {
              <li data-cds-component="tile" [class]="'dos-agent-state--' + t.state">
                <strong>{{ t.title }}</strong>
                <small>{{ t.agentName }} · {{ t.priority }}</small>
                <button type="button" data-cds-component="button" data-kind="primary"
                        (click)="emit('agent.action.approved', t)">approve</button>
              </li>
            }
          </ul>
          <nav data-cds-component="pagination" aria-label="task queue pagination"></nav>
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; container-type: inline-size; }
    .dos-agent-task-queue-cards { display: none; list-style: none; padding: 0; margin: 0; }
    @container (max-width: 480px) {
      .dos-agent-task-queue-table { display: none; }
      .dos-agent-task-queue-cards { display: flex; flex-direction: column; gap: var(--dos-space-2, 0.5rem); }
    }
  `],
})
export class DosAgentTaskQueueComponent {
  @Input() state: AgentState = 'loading';
  @Input() tasks: ReadonlyArray<AgentTaskRow> = [];
  @Input() searchPlaceholder = 'Search tasks';
  @Output() readonly event = new EventEmitter<AgentEvent>();
  emit(key: AgentEventKey, t: AgentTaskRow) {
    this.event.emit(buildEvent(key, t.agentId, { taskId: t.id }));
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 5. <dos-agent-recommendation-panel>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-recommendation-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-recommendation-panel" [attr.data-state]="recommendation?.state ?? state">
      @switch (recommendation?.state ?? state) {
        @case ('loading') { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')   { <p>No recommendations.</p> }
        @case ('failed')  { <div data-cds-component="notification" data-kind="error">Recommendation engine failed</div> }
        @case ('blocked') { <div data-cds-component="notification" data-kind="warning">Recommendations blocked</div> }
        @default {
          @if (recommendation; as r) {
            <article data-cds-component="tile">
              <header>
                <strong>{{ r.task.title }}</strong>
                <span data-cds-component="tag" data-kind="cyan">{{ (r.confidence * 100) | number:'1.0-0' }}%</span>
              </header>
              @if (r.why) { <p>{{ r.why }}</p> }
              @if (r.riskImpact) {
                <span data-cds-component="tag" [attr.data-kind]="r.riskImpact === 'high' || r.riskImpact === 'critical' ? 'red' : 'gray'">
                  {{ r.riskImpact }}
                </span>
              }
              @switch (r.state) {
                @case ('thinking')         { <div data-cds-component="inline-loading">analyzing</div> }
                @case ('running')          { <div data-cds-component="progress-bar" data-indeterminate="true"></div> }
                @case ('waiting_approval') { <div data-cds-component="notification" data-kind="warning">Approval required</div> }
                @case ('completed')        { <span data-cds-component="tag" data-kind="green">applied</span> }
                @case ('ready')            { <!-- ready: actions render --> }
              }
              <footer>
                @for (a of r.actions; track a.key) {
                  <button type="button" data-cds-component="button"
                          [attr.data-kind]="a.variant ?? 'primary'"
                          (click)="emit(a, r)">
                    {{ a.label }}
                  </button>
                }
              </footer>
            </article>
          }
        }
      }
    </section>
  `,
  styles: [`:host { display: block; }`],
})
export class DosAgentRecommendationPanelComponent {
  @Input() recommendation: AgentRecommendation | null = null;
  @Input() state: AgentState = 'loading';
  @Output() readonly event = new EventEmitter<AgentEvent>();
  emit(a: AgentAction, r: AgentRecommendation) {
    const key: AgentEventKey = a.requiresApproval
      ? 'agent.action.requested'
      : 'agent.task.created';
    this.event.emit(buildEvent(key, r.agentId, { recommendationId: r.id, action: a }));
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 6. <dos-agent-action-approval-modal>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-action-approval-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div
        class="dos-agent-action-approval-modal"
        role="dialog"
        aria-modal="true"
        data-cds-component="modal"
        [attr.data-state]="state"
      >
        <div class="dos-agent-action-approval-modal__backdrop" (click)="reject()"></div>
        <div class="dos-agent-action-approval-modal__panel">
          <header>
            <strong>Approve agent action</strong>
            <small>{{ payload?.agentName }}</small>
          </header>

          @switch (state) {
            @case ('loading')  { <div data-cds-component="skeleton-text"></div> }
            @case ('thinking') { <div data-cds-component="inline-loading">Preparing impact preview…</div> }
            @case ('running')  { <div data-cds-component="progress-bar" data-indeterminate="true"></div> }
            @case ('failed')   { <div data-cds-component="notification" data-kind="error">Approval failed</div> }
            @case ('blocked')  { <div data-cds-component="notification" data-kind="error">Action blocked by policy</div> }
            @case ('completed'){ <div data-cds-component="notification" data-kind="success">Action approved</div> }
            @case ('empty')    { <p>Nothing to approve.</p> }
            @default {
              @if (payload; as p) {
                <ul data-cds-component="structured-list">
                  <li><span>What happens</span><span>{{ p.whatHappens }}</span></li>
                  <li><span>Records affected</span><span>{{ (p.recordsAffected?.length ?? 0) }}</span></li>
                  <li><span>Required permission</span><span>{{ p.requiredPermission }}</span></li>
                  <li><span>Rollback supported</span><span>{{ p.rollbackSupported ? 'yes' : 'no' }}</span></li>
                  <li><span>Audit impact</span><span>{{ p.auditImpact }}</span></li>
                </ul>
                @if (p.auditImpact === 'high') {
                  <div data-cds-component="notification" data-kind="warning">High audit impact — confirm carefully</div>
                }
              }
            }
          }

          <footer>
            <button type="button" data-cds-component="button" data-kind="ghost"  (click)="reject()">Reject</button>
            <button type="button" data-cds-component="button" data-kind="primary" (click)="approve()">Approve and run</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; }
    .dos-agent-action-approval-modal { position: fixed; inset: 0; pointer-events: auto; z-index: 9000; }
    .dos-agent-action-approval-modal__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); }
    .dos-agent-action-approval-modal__panel {
      position: absolute; inset-inline: 50%; inset-block-start: 10vh;
      transform: translateX(-50%); inline-size: min(540px, 92vw);
      background: var(--dos-color-surface, #fff); padding: var(--dos-space-5, 1.25rem);
      border-radius: var(--dos-radius-md, 8px); display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem);
    }
    /* mobile: bottom sheet */
    @media (max-width: 480px) {
      .dos-agent-action-approval-modal__panel {
        inset-inline: 0; inset-block-end: 0; inset-block-start: auto;
        transform: none; inline-size: 100%;
        border-end-end-radius: 0; border-end-start-radius: 0;
      }
    }
  `],
})
export class DosAgentActionApprovalModalComponent {
  @Input() open = false;
  @Input() state: AgentState = 'ready';
  @Input() payload: AgentApprovalPayload | null = null;
  @Output() readonly event = new EventEmitter<AgentEvent>();
  approve() {
    if (!this.payload) return;
    this.event.emit(buildEvent('agent.action.approved', this.payload.agentId, {
      recommendationId: this.payload.recommendationId,
    }));
  }
  reject() {
    if (!this.payload) return;
    this.event.emit(buildEvent('agent.action.rejected', this.payload.agentId, {
      recommendationId: this.payload.recommendationId,
    }));
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 7. <dos-agent-workbench>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-workbench',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-workbench" data-cds-component="grid" [attr.data-state]="state">
      @switch (state) {
        @case ('loading')  { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')    { <p>Workbench has no agent assigned.</p> }
        @case ('failed')   { <div data-cds-component="notification" data-kind="error">Workbench failed to load</div> }
        @case ('blocked')  { <div data-cds-component="notification" data-kind="error">Workbench access blocked</div> }
        @case ('thinking') { <div data-cds-component="inline-loading">Loading workbench…</div> }
        @default {
          <header class="dos-agent-workbench__head">
            @if (agent) {
              <strong>{{ agent.displayName }}</strong>
              <small>{{ agent.role }}</small>
              <span data-cds-component="tag" [attr.data-kind]="agent.state === 'running' ? 'blue' : 'cool-gray'">{{ agent.state }}</span>
            }
          </header>
          <nav data-cds-component="tabs" role="tablist">
            <button role="tab" [attr.aria-selected]="tab() === 'tasks'"     (click)="setTab('tasks')">Tasks</button>
            <button role="tab" [attr.aria-selected]="tab() === 'decisions'" (click)="setTab('decisions')">Decisions</button>
            <button role="tab" [attr.aria-selected]="tab() === 'audit'"     (click)="setTab('audit')">Audit</button>
            <button role="tab" [attr.aria-selected]="tab() === 'tools'"     (click)="setTab('tools')">Tools</button>
          </nav>
          <ng-content></ng-content>
          @if (state === 'completed') {
            <div data-cds-component="notification" data-kind="success">Workbench session complete</div>
          }
          @if (state === 'running') {
            <div data-cds-component="progress-bar" data-indeterminate="true"></div>
          }
          @if (state === 'waiting_approval') {
            <div data-cds-component="notification" data-kind="warning">Approvals pending</div>
          }
        }
      }
    </section>
  `,
  styles: [`:host { display: block; }`],
})
export class DosAgentWorkbenchComponent {
  @Input() state: AgentState = 'loading';
  @Input() agent: AgentCardModel | null = null;
  private readonly _tab = signal<'tasks' | 'decisions' | 'audit' | 'tools'>('tasks');
  readonly tab = computed(() => this._tab());
  setTab(t: 'tasks' | 'decisions' | 'audit' | 'tools') { this._tab.set(t); }
}

// ═════════════════════════════════════════════════════════════════════════
// 8. <dos-agent-evidence-drawer>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-evidence-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <aside
        class="dos-agent-evidence-drawer"
        role="complementary"
        data-cds-component="modal"
        [attr.data-state]="state"
      >
        <header>
          <strong>Evidence</strong>
          <button type="button" data-cds-component="button" data-kind="ghost" (click)="close.emit()">close</button>
        </header>

        @switch (state) {
          @case ('loading')  { <div data-cds-component="skeleton-text"></div> }
          @case ('empty')    { <p>No evidence attached.</p> }
          @case ('thinking') { <div data-cds-component="inline-loading">Loading evidence…</div> }
          @case ('running')  { <div data-cds-component="progress-bar" data-indeterminate="true"></div> }
          @case ('failed')   { <div data-cds-component="notification" data-kind="error">Failed to load evidence</div> }
          @case ('blocked')  { <div data-cds-component="notification" data-kind="warning">Evidence access blocked</div> }
          @default {
            <ul data-cds-component="structured-list">
              @for (e of rows; track e.id) {
                <li>
                  <span>{{ e.fileName ?? e.controlRef }}</span>
                  <span data-cds-component="tag" data-kind="cool-gray">{{ e.sourceSystem }}</span>
                  <small>{{ e.lastVerifiedAt }}</small>
                </li>
              }
            </ul>
            <input data-cds-component="file-uploader" type="file" multiple
                   (change)="emitAttach($event)" />
            @if (state === 'completed') {
              <div data-cds-component="notification" data-kind="success">Evidence attached</div>
            }
            @if (state === 'waiting_approval') {
              <div data-cds-component="notification" data-kind="warning">Awaiting verification</div>
            }
          }
        }
      </aside>
    }
  `,
  styles: [`
    .dos-agent-evidence-drawer {
      position: fixed; inset-block: 0; inset-inline-end: 0;
      inline-size: min(420px, 100vw); background: var(--dos-color-surface, #fff);
      padding: var(--dos-space-4, 1rem); box-shadow: var(--dos-shadow-lg);
      display: flex; flex-direction: column; gap: var(--dos-space-3, 0.75rem);
      z-index: 9000;
    }
    @media (max-width: 480px) {
      .dos-agent-evidence-drawer { inline-size: 100vw; inset-inline: 0; }
    }
  `],
})
export class DosAgentEvidenceDrawerComponent {
  @Input() open = false;
  @Input() state: AgentState = 'loading';
  @Input() rows: ReadonlyArray<AgentEvidenceRow> = [];
  @Input() agentId = '';
  @Output() readonly close = new EventEmitter<void>();
  @Output() readonly event = new EventEmitter<AgentEvent>();
  emitAttach(_: Event) {
    this.event.emit(buildEvent('agent.evidence.attached', this.agentId));
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 9. <dos-agent-followup-center>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-followup-center',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-followup-center" [attr.data-state]="state">
      @switch (state) {
        @case ('loading') { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')   { <p>No follow-ups.</p> }
        @case ('failed')  { <div data-cds-component="notification" data-kind="error">Follow-up center failed</div> }
        @case ('blocked') { <div data-cds-component="notification" data-kind="warning">Follow-ups blocked</div> }
        @default {
          <table data-cds-component="data-table">
            <thead><tr><th>Task</th><th>Owner</th><th>State</th><th>Due</th><th></th></tr></thead>
            <tbody>
              @for (t of items; track t.id) {
                <tr [class]="'dos-agent-state--' + t.state">
                  <td>{{ t.title }}</td>
                  <td>{{ t.ownerName }}</td>
                  <td>
                    @if (t.state === 'thinking')         { <span data-cds-component="inline-loading">…</span> }
                    @else if (t.state === 'running')     { <span data-cds-component="progress-bar" data-indeterminate="true"></span> }
                    @else if (t.state === 'waiting_approval') { <span data-cds-component="tag" data-kind="warm-gray">approve</span> }
                    @else if (t.state === 'completed')   { <span data-cds-component="tag" data-kind="green">done</span> }
                    @else if (t.state === 'failed')      { <span data-cds-component="tag" data-kind="red">failed</span> }
                    @else                                { <span>{{ t.state }}</span> }
                  </td>
                  <td>{{ t.dueAt }}</td>
                  <td>
                    <button type="button" data-cds-component="button" data-kind="ghost" (click)="nudge(t)">nudge</button>
                    <button type="button" data-cds-component="button" data-kind="ghost" (click)="escalate(t)">escalate</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
  styles: [`:host { display: block; }`],
})
export class DosAgentFollowupCenterComponent {
  @Input() state: AgentState = 'loading';
  @Input() items: ReadonlyArray<AgentTaskRow> = [];
  @Output() readonly event = new EventEmitter<AgentEvent>();
  nudge(t: AgentTaskRow) {
    this.event.emit(buildEvent('agent.action.requested', t.agentId, { taskId: t.id, kind: 'nudge' }));
  }
  escalate(t: AgentTaskRow) {
    this.event.emit(buildEvent('agent.action.requested', t.agentId, { taskId: t.id, kind: 'escalate' }));
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 10. <dos-agent-audit-trail>
// ═════════════════════════════════════════════════════════════════════════
@Component({
  selector: 'dos-agent-audit-trail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dos-agent-audit-trail" [attr.data-state]="state">
      @switch (state) {
        @case ('loading') { <div data-cds-component="skeleton-text"></div> }
        @case ('empty')   { <p>No audit rows yet.</p> }
        @case ('failed')  { <div data-cds-component="notification" data-kind="error">Audit trail failed</div> }
        @case ('blocked') { <div data-cds-component="notification" data-kind="warning">Audit trail blocked by policy</div> }
        @case ('thinking'){ <div data-cds-component="inline-loading">Loading audit…</div> }
        @case ('running') { <div data-cds-component="progress-bar" data-indeterminate="true"></div> }
        @case ('waiting_approval') { <div data-cds-component="notification" data-kind="warning">Awaiting reviewer</div> }
        @case ('completed'){ <span data-cds-component="tag" data-kind="green">complete</span> }
        @default {
          <table data-cds-component="data-table">
            <thead><tr>
              <th>Time</th><th>Agent</th><th>Action</th><th>Decision</th>
              <th>Approver</th><th>Record</th><th>Evidence</th><th>Trace</th>
            </tr></thead>
            <tbody>
              @for (r of rows; track r.traceId) {
                <tr>
                  <td>{{ r.occurredAt }}</td>
                  <td>{{ r.agentName }}</td>
                  <td>{{ r.action }}</td>
                  <td>
                    <span data-cds-component="tag"
                          [attr.data-kind]="r.decision === 'approved' ? 'green' :
                                            r.decision === 'rejected' ? 'red' :
                                            r.decision === 'failed'   ? 'red' : 'cool-gray'">
                      {{ r.decision }}
                    </span>
                  </td>
                  <td>{{ r.approverUserId }}</td>
                  <td>{{ r.recordChanged }}</td>
                  <td>{{ r.evidenceRef }}</td>
                  <td><code>{{ r.traceId }}</code></td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </section>
  `,
  styles: [`:host { display: block; container-type: inline-size; }`],
})
export class DosAgentAuditTrailComponent {
  @Input() state: AgentState = 'loading';
  @Input() rows: ReadonlyArray<AgentAuditRow> = [];
}
