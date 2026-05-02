import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UnifiedSquadService } from '@app/services/unified-squad.service';
import { StorageService } from '@app/infrastructure';
import { devError } from '../../core/utils/dev-logger';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workflow-visualizer',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, RouterLink],
  template: `
    <div class="workflow-visualizer">
      <div class="viz-header">
        <div class="viz-nav">
          <a routerLink="/workspace-home" class="btn-nav">← Home</a>
          <a routerLink="/unified-squad" class="btn-nav">← Squad</a>
        </div>
        <h2>Workflow Timeline</h2>
        <div class="viz-filters">
          <select [ngModel]="filterType()" (ngModelChange)="filterType.set($event); loadTimeline()">
            <option value="">All Types</option>
            <option value="approval">Approval</option>
            <option value="task">Task</option>
            <option value="evidence_collection">Evidence Collection</option>
            <option value="handoff">Handoff</option>
          </select>
          <select [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event); loadTimeline()">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select [ngModel]="filterAgentId()" (ngModelChange)="filterAgentId.set($event); loadTimeline()" *ngIf="availableAgents().length > 0">
            <option value="">All Agents</option>
            <option *ngFor="let agent of availableAgents()" [value]="agent.userId">
              {{ agent.displayNameEn || agent.displayNameAr || agent.userId }}
            </option>
          </select>
          <select [ngModel]="filterRole()" (ngModelChange)="filterRole.set($event)" *ngIf="userRole()">
            <option value="">All Roles</option>
            <option value="agent">AI Agents Only</option>
            <option value="human">Humans Only</option>
            <option [value]="userRole()">My Role ({{ userRole() }})</option>
          </select>
        </div>
      </div>

      <div class="timeline-container">
        <div tabindex="0" role="button" (keyup.enter)="toggleExpand(entry)" *ngFor="let entry of filteredEntries(); trackBy: trackEntry"
             class="timeline-node"
             [class.overdue]="entry.status === 'overdue'"
             [class.completed]="entry.status === 'completed' || entry.status === 'approved'"
             [class.agent]="entry.is_agent"
             (click)="toggleExpand(entry)">
          <div class="node-indicator">
            <span class="node-icon" [title]="entry.is_agent ? 'AI Agent' : 'Human'">
              {{ entry.is_agent ? '🤖' : '👤' }}
            </span>
          </div>
          <div class="node-content">
            <div class="node-header">
              <span class="participant-name">{{ entry.participant_name || 'Unassigned' }}</span>
              <span class="participant-role">{{ entry.participant_role }}</span>
              <span class="node-status badge" [attr.data-status]="entry.status">{{ entry.status }}</span>
            </div>
            <div class="node-meta">
              <span class="workflow-type">{{ entry.workflow_type }}</span>
              <span class="time-elapsed" *ngIf="entry.assigned_at">
                {{ getTimeElapsed(entry.assigned_at) }}
              </span>
              <span class="due-date" *ngIf="entry.due_date">
                Due: {{ entry.due_date | appDate:'short' }}
              </span>
            </div>
            <div class="node-detail" *ngIf="expandedEntry === entry.entry_id">
              <div class="detail-section" *ngIf="entry.context">
                <strong>Context:</strong>
                <pre>{{ entry.context | json }}</pre>
              </div>
              <div class="detail-section" *ngIf="entry.parent_workflow_id">
                <strong>Parent Workflow:</strong> {{ entry.parent_workflow_id }}
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!filteredEntries().length" class="empty-state">
          <p *ngIf="timelineEntries().length === 0">No workflow entries found.</p>
          <p *ngIf="timelineEntries().length > 0 && filteredEntries().length === 0">
            No workflows match your current filters. Try adjusting your filters.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .workflow-visualizer { padding: 1.5rem; }
    .viz-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .viz-nav { display: flex; gap: 0.5rem; }
    .btn-nav { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); background: var(--card-bg, #fff); color: var(--text-body); text-decoration: none; font-size: var(--font-size-tag); }
    .btn-nav:hover { background: var(--bg-subtle, #f4f4f4); }
    .viz-header h2 { margin: 0; font-size: var(--font-size-xl); }
    .viz-filters { display: flex; gap: 0.5rem; }
    .viz-filters select { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .timeline-container { display: flex; flex-direction: column; gap: 0.75rem; }
    .timeline-node { display: flex; gap: 1rem; padding: 1rem; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius); cursor: pointer; transition: box-shadow 0.2s; background: var(--card-bg, #fff); }
    .timeline-node:hover { box-shadow: var(--shadow-card); }
    .timeline-node.overdue { border-inline-start: 4px solid var(--error); }
    .timeline-node.completed { border-inline-start: 4px solid #24a148; opacity: 0.85; }
    .timeline-node.agent { border-inline-end: 3px solid #8a3ffc; }
    .node-indicator { display: flex; align-items: center; font-size: var(--font-size-2xl); }
    .node-content { flex: 1; }
    .node-header { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .participant-name { font-weight: 600; }
    .participant-role { color: var(--text-secondary, #666); font-size: var(--font-size-tag); }
    .badge { padding: 0.15rem 0.5rem; border-radius: var(--radius-lg); font-size: var(--font-size-sm); background: var(--tag-bg, #e0e0e0); }
    .badge[data-status="pending"] { background: #fff1c2; color: #8e6a00; }
    .badge[data-status="overdue"] { background: #ffd7d9; color: #a2191f; }
    .badge[data-status="completed"], .badge[data-status="approved"] { background: #defbe6; color: #0e6027; }
    .badge[data-status="in_progress"] { background: #d0e2ff; color: #0043ce; }
    .node-meta { display: flex; gap: 1rem; margin-top: 0.35rem; font-size: var(--font-size-caption); color: var(--text-secondary, #888); }
    .node-detail { margin-top: 0.75rem; padding: 0.75rem; background: var(--bg-subtle, #f4f4f4); border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .node-detail pre { white-space: pre-wrap; font-size: var(--font-size-caption); margin: 0.25rem 0 0; }
    .empty-state { text-align: center; padding: 3rem; color: var(--text-secondary, #888); }
  `]
})
export class WorkflowVisualizerComponent implements OnInit, OnDestroy {
  private svc = inject(UnifiedSquadService);
  private storage = inject(StorageService);
  private route = inject(ActivatedRoute);

  timelineEntries = signal<GrcRecord[]>([]);
  availableAgents = signal<GrcRecord[]>([]);
  userRole = signal<string | null>(null);
  filterType = signal('');
  filterStatus = signal('');
  filterAgentId = signal('');
  filterRole = signal('');
  expandedEntry: string | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null;

  // Computed filtered entries based on role (client-side filtering)
  filteredEntries = computed(() => {
    let entries = [...this.timelineEntries()];
    const roleFilter = this.filterRole();

    // Role-based filtering (client-side)
    if (roleFilter) {
      if (roleFilter === 'agent') {
        entries = entries.filter(e => e.is_agent === true);
      } else if (roleFilter === 'human') {
        entries = entries.filter(e => e.is_agent === false || !e.is_agent);
      } else if (roleFilter === this.userRole()) {
        // Show workflows assigned to user's role
        const role = this.userRole();
        const userId = this.storage.get('user_id');
        entries = entries.filter(e => 
          e.participant_role === role || 
          e.assigned_participant_id === userId
        );
      }
    }

    return entries;
  });

  async ngOnInit() {
    // Get user role
    const role = this.storage.get('grc_role');
    if (role) {
      this.userRole.set(role);
    }

    // Check for agentId query param (from agent monitoring dashboard)
    this.route.queryParams.subscribe(params => {
      if (params['agentId']) {
        this.filterAgentId.set(params['agentId']);
        this.loadTimeline();
      }
    });

    // Load agents list for filter dropdown
    await this.loadAgents();

    // Load timeline
    await this.loadTimeline();
    this.refreshInterval = setInterval(() => this.loadTimeline(), 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  async loadAgents() {
    try {
      const agents = await this.svc.getAgents();
      this.availableAgents.set(agents);
    } catch (e) {
      devError("[WorkflowVisualizer] Failed to load agents", e);
    }
  }

  async loadTimeline() {
    try {
      const filters: GrcRecord = {
        workflowType: this.filterType() || undefined,
        status: this.filterStatus() || undefined,
      };

      // Add agent filter if selected (server-side filter)
      if (this.filterAgentId()) {
        filters.participantId = this.filterAgentId();
      }

      const entries = await this.svc.getWorkflowTimeline(filters);
      this.timelineEntries.set(entries);
      // Note: Role-based filtering happens client-side in filteredEntries computed signal
    } catch (e) { devError("[catch]", e); }
  }

  toggleExpand(entry: GrcRecord) {
    this.expandedEntry = this.expandedEntry === entry.entry_id ? null : entry.entry_id;
  }

  getTimeElapsed(assignedAt: string): string {
    const diff = Date.now() - new Date(assignedAt).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  trackEntry(_: number, entry: GrcRecord) { return entry.entry_id; }
}
