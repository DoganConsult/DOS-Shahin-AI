import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UnifiedSquadService } from '@app/ai/unified-squad.service';
import { InterventionDialogComponent } from './intervention-dialog.component';
import { devError } from '../../core/utils/dev-logger';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-unified-squad-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InterventionDialogComponent],
  template: `
    <div class="squad-dashboard">
      <div class="dash-header">
        <div class="dash-header-left">
          <a routerLink="/workspace-home" class="btn-nav" aria-label="Back to Dashboard">
            <span>← Home</span>
          </a>
          <h2>Unified Squad Command Center</h2>
        </div>
        <div class="quick-actions">
          <button class="btn-action" routerLink="/unified-squad/workflow">📊 Workflow Timeline</button>
          <button class="btn-action" routerLink="/unified-squad/erp-config">🔗 ERP Config</button>
          <button class="btn-action" (click)="seedAgents()">🤖 Seed AI Squad</button>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="metrics-grid" *ngIf="dashboard">
        <div class="metric-card">
          <div class="metric-value">{{ dashboard.totalParticipants }}</div>
          <div class="metric-label">Total Participants</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ dashboard.humanParticipants }}</div>
          <div class="metric-label">Human Members</div>
        </div>
        <div class="metric-card agent">
          <div class="metric-value">{{ dashboard.aiAgents }}</div>
          <div class="metric-label">AI Agents</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ dashboard.activeWorkflows }}</div>
          <div class="metric-label">Active Workflows</div>
        </div>
        <div class="metric-card warning" *ngIf="dashboard.pendingApprovals > 0">
          <div class="metric-value">{{ dashboard.pendingApprovals }}</div>
          <div class="metric-label">Pending Approvals</div>
        </div>
        <div class="metric-card danger" *ngIf="dashboard.overdueTasks > 0">
          <div class="metric-value">{{ dashboard.overdueTasks }}</div>
          <div class="metric-label">Overdue Tasks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">{{ dashboard.interventionCount }}</div>
          <div class="metric-label">Interventions</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <select [(ngModel)]="filterType" (ngModelChange)="loadParticipants()">
          <option value="">All Types</option>
          <option value="human">Human</option>
          <option value="agent">AI Agent</option>
        </select>
        <select [(ngModel)]="filterMode" (ngModelChange)="loadParticipants()">
          <option value="">All Deployments</option>
          <option value="saas">SaaS</option>
          <option value="on_prem_sdk">On-Prem SDK</option>
          <option value="reseller">Reseller</option>
        </select>
        <select [(ngModel)]="filterStatus" (ngModelChange)="loadParticipants()">
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="idle">Idle</option>
          <option value="working">Working</option>
          <option value="error">Error</option>
        </select>
      </div>

      <!-- Participant List -->
      <div class="participant-list">
        <div *ngFor="let p of participants; trackBy: trackParticipant" class="participant-card"
             [class.agent]="p.isAgent" [class.error]="p.currentStatus === 'error'">
          <div class="p-icon">{{ p.isAgent ? '🤖' : '👤' }}</div>
          <div class="p-info">
            <div class="p-name">{{ p.displayNameEn }}</div>
            <div class="p-name-ar">{{ p.displayNameAr }}</div>
            <div class="p-meta">
              <span class="p-role">{{ p.role }}</span>
              <span class="p-mode">{{ p.deploymentMode }}</span>
              <span class="p-status" [attr.data-status]="p.currentStatus">{{ p.currentStatus }}</span>
            </div>
          </div>
          <div class="p-actions">
            <button class="btn-sm" (click)="openIntervention(p)" title="Intervene">⚡</button>
          </div>
        </div>
      </div>

      <app-intervention-dialog
        [visible]="showIntervention"
        [workflowStepId]="selectedStepId"
        [beforeState]="selectedBeforeState"
        [participants]="participants"
        (closed)="showIntervention = false"
        (interventionExecuted)="onInterventionDone($event)">
      </app-intervention-dialog>
    </div>
  `,
  styles: [`
    .squad-dashboard { padding: 1.5rem; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    .dash-header-left { display: flex; align-items: center; gap: 1rem; }
    .btn-nav { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); background: var(--card-bg, #fff); color: var(--text-body); text-decoration: none; font-size: var(--font-size-tag); }
    .btn-nav:hover { background: var(--bg-subtle, #f4f4f4); }
    .dash-header h2 { margin: 0; font-size: var(--font-size-xl); }
    .quick-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn-action { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); background: var(--card-bg, #fff); cursor: pointer; font-size: var(--font-size-tag); }
    .btn-action:hover { background: var(--bg-subtle, #f4f4f4); }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .metric-card { padding: 1rem; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius); text-align: center; background: var(--card-bg, #fff); }
    .metric-card.agent { border-inline-start: 4px solid #8a3ffc; }
    .metric-card.warning { border-inline-start: 4px solid var(--warning); }
    .metric-card.danger { border-inline-start: 4px solid var(--error); }
    .metric-value { font-size: var(--font-size-3xl); font-weight: 700; }
    .metric-label { font-size: var(--font-size-caption); color: var(--text-secondary, #888); margin-top: 0.25rem; }
    .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .filter-bar select { padding: 0.4rem 0.75rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .participant-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .participant-card { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border: 1px solid var(--border-color, #e0e0e0); border-radius: var(--radius); background: var(--card-bg, #fff); }
    .participant-card.agent { border-inline-end: 3px solid #8a3ffc; }
    .participant-card.error { border-inline-start: 3px solid var(--error); }
    .p-icon { font-size: var(--font-size-2xl); }
    .p-info { flex: 1; }
    .p-name { font-weight: 600; }
    .p-name-ar { font-size: var(--font-size-tag); color: var(--text-secondary, #666); direction: rtl; }
    .p-meta { display: flex; gap: 0.75rem; margin-top: 0.25rem; font-size: var(--font-size-caption); }
    .p-role { color: var(--text-secondary, #666); }
    .p-mode { background: var(--tag-bg, #e0e0e0); padding: 0.1rem 0.4rem; border-radius: var(--radius-xs); }
    .p-status[data-status="online"] { color: #24a148; }
    .p-status[data-status="working"] { color: #0043ce; }
    .p-status[data-status="error"] { color: var(--error); }
    .p-status[data-status="idle"] { color: var(--text-muted, #6f6f6f); }
    .btn-sm { padding: 0.3rem 0.5rem; border: 1px solid var(--border-color, #ddd); border-radius: var(--radius-xs); background: transparent; cursor: pointer; }
  `]
})
export class UnifiedSquadDashboardComponent implements OnInit, OnDestroy {
  private svc = inject(UnifiedSquadService);
  dashboard: Record<string, unknown> | null = null;
  participants: Record<string, unknown>[] = [];
  filterType = '';
  filterMode = '';
  filterStatus = '';
  showIntervention = false;
  selectedStepId = '';
  selectedBeforeState: Record<string, unknown> | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null;

  ngOnInit() {
    this.loadDashboard();
    this.loadParticipants();
    this.refreshInterval = setInterval(() => { this.loadDashboard(); this.loadParticipants(); }, 5000);
  }

  ngOnDestroy() { if (this.refreshInterval) clearInterval(this.refreshInterval); }

  async loadDashboard() {
    try { this.dashboard = await this.svc.getDashboard(); } catch (e) { devError("[catch]", e); }
  }

  async loadParticipants() {
    try {
      this.participants = await this.svc.getParticipants({
        isAgent: this.filterType === 'agent' ? true : this.filterType === 'human' ? false : undefined,
        deploymentMode: this.filterMode || undefined,
        status: this.filterStatus || undefined,
      });
    } catch (e) { devError("[catch]", e); }
  }

  async seedAgents() {
    try { await this.svc.seedAgents(); this.loadDashboard(); this.loadParticipants(); } catch (e) { devError("[catch]", e); }
  }

  openIntervention(p: Record<string, unknown>) {
    this.selectedStepId = '';
    this.selectedBeforeState = { status: p.currentStatus, assigned_participant_id: p.userId };
    this.showIntervention = true;
  }

  onInterventionDone(result: Record<string, unknown>) {
    this.showIntervention = false;
    this.loadDashboard();
    this.loadParticipants();
  }

  trackParticipant(_: number, p: Record<string, unknown>) { return p.userId; }
}
