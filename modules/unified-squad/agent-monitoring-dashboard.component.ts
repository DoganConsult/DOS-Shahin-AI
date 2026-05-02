// ============================================
// AGRC-OS — Agent Monitoring Dashboard
// Requirements: Visual monitoring for all AI agents by tenant administrators
// ============================================

import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnifiedSquadService } from '@app/ai/unified-squad.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { devError } from '../../core/utils/dev-logger';

interface AgentMonitoringData {
  agentId: string;
  displayName: string;
  role: string;
  status: string;
  specialization?: string;
  performance: {
    runsTotal: number;
    runsLast24h: number;
    actionsProposed: number;
    actionsExecuted: number;
    avgDurationMs: number;
    successRate: number;
    lastRunAt: string | null;
    topActionTypes: { type: string; count: number }[];
  } | null;
  collaboration: {
    suggestionsGenerated: number;
    suggestionsAccepted: number;
    tasksCompleted: number;
    avgTaskDurationMs: number;
    errorCount: number;
    snapshotAt: string;
  } | null;
  workflows: {
    total: number;
    byStatus: Record<string, number>;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agent-monitoring-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AppDatePipe],
  template: `
    <div class="agent-monitoring-dashboard">
      <div class="dashboard-header">
        <div class="header-nav">
          <a routerLink="/workspace-home" class="btn-nav">← Home</a>
          <a routerLink="/unified-squad" class="btn-nav">← Squad</a>
        </div>
        <div class="header-title">
          <h1>AI Agent Monitoring</h1>
          <p class="subtitle">Real-time monitoring and performance metrics for all AI agents</p>
        </div>
        <div class="header-actions">
          <button (click)="refreshData()" [disabled]="loading()" class="btn-refresh">
            {{ loading() ? 'Refreshing...' : '🔄 Refresh' }}
          </button>
          <span class="last-updated" *ngIf="lastUpdated()">
            Last updated: {{ lastUpdated() | appDate:'short' }}
          </span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="summary-cards" *ngIf="!loading() && agents().length > 0">
        <div class="summary-card">
          <div class="card-label">Total Agents</div>
          <div class="card-value">{{ totalAgents() }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Active Agents</div>
          <div class="card-value">{{ activeAgents() }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Total Runs (24h)</div>
          <div class="card-value">{{ totalRuns24h() }}</div>
        </div>
        <div class="summary-card">
          <div class="card-label">Avg Success Rate</div>
          <div class="card-value">{{ avgSuccessRate() | number:'1.1-1' }}%</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-section">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="applyFilters()"
          placeholder="Search agents by name, role, or specialization..."
          class="search-input"
        />
        <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="filter-select">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
        </select>
        <select [(ngModel)]="sortBy" (ngModelChange)="applyFilters()" class="filter-select">
          <option value="name">Sort by Name</option>
          <option value="runs">Sort by Runs (24h)</option>
          <option value="success">Sort by Success Rate</option>
          <option value="lastRun">Sort by Last Run</option>
        </select>
      </div>

      <!-- Agent Cards Grid -->
      <div class="agents-grid" *ngIf="!loading()">
        <div
          *ngFor="let agent of filteredAgents(); trackBy: trackAgent"
          class="agent-card"
          [class.has-errors]="(agent.collaboration?.errorCount ?? 0) > 0"
          [class.inactive]="agent.status !== 'active'"
        >
          <div class="agent-card-header">
            <div class="agent-identity">
              <span class="agent-icon">🤖</span>
              <div class="agent-info">
                <h3 class="agent-name">{{ agent.displayName }}</h3>
                <div class="agent-meta">
                  <span class="agent-role">{{ agent.role }}</span>
                  <span class="agent-status" [attr.data-status]="agent.status">{{ agent.status }}</span>
                </div>
                <div class="agent-specialization" *ngIf="agent.specialization">
                  {{ agent.specialization }}
                </div>
              </div>
            </div>
          </div>

          <!-- Performance Metrics -->
          <div class="metrics-section" *ngIf="agent.performance">
            <div class="metric-row">
              <span class="metric-label">Runs (24h):</span>
              <span class="metric-value">{{ agent.performance.runsLast24h }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Total Runs:</span>
              <span class="metric-value">{{ agent.performance.runsTotal }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Success Rate:</span>
              <span class="metric-value" [class.high]="agent.performance.successRate >= 0.9" [class.medium]="agent.performance.successRate >= 0.7 && agent.performance.successRate < 0.9" [class.low]="agent.performance.successRate < 0.7">
                {{ (agent.performance.successRate * 100) | number:'1.1-1' }}%
              </span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Avg Duration:</span>
              <span class="metric-value">{{ agent.performance.avgDurationMs | number }}ms</span>
            </div>
            <div class="metric-row" *ngIf="agent.performance.lastRunAt">
              <span class="metric-label">Last Run:</span>
              <span class="metric-value">{{ agent.performance.lastRunAt | appDate:'short' }}</span>
            </div>
            <div class="metric-row" *ngIf="agent.performance.topActionTypes.length > 0">
              <span class="metric-label">Top Actions:</span>
              <div class="action-tags">
                <span *ngFor="let action of agent.performance.topActionTypes.slice(0, 3)" class="action-tag">
                  {{ action.type }} ({{ action.count }})
                </span>
              </div>
            </div>
          </div>

          <!-- Collaboration Metrics -->
          <div class="metrics-section" *ngIf="agent.collaboration">
            <div class="metric-row">
              <span class="metric-label">Suggestions:</span>
              <span class="metric-value">{{ agent.collaboration.suggestionsGenerated }} generated, {{ agent.collaboration.suggestionsAccepted }} accepted</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Tasks Completed:</span>
              <span class="metric-value">{{ agent.collaboration.tasksCompleted }}</span>
            </div>
            <div class="metric-row" *ngIf="agent.collaboration.errorCount > 0">
              <span class="metric-label error">Errors:</span>
              <span class="metric-value error">{{ agent.collaboration.errorCount }}</span>
            </div>
          </div>

          <!-- Workflow Status -->
          <div class="workflow-section" *ngIf="agent.workflows.total > 0">
            <div class="workflow-header">
              <span class="workflow-label">Workflows:</span>
              <span class="workflow-total">{{ agent.workflows.total }} total</span>
            </div>
            <div class="workflow-status-badges">
              <span *ngFor="let status of getWorkflowStatuses(agent.workflows.byStatus)" class="workflow-badge" [attr.data-status]="status.key">
                {{ status.key }}: {{ status.count }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="agent-actions">
            <a [routerLink]="['/unified-squad/workflow-visualizer']" [queryParams]="{ agentId: agent.agentId }" class="btn-action">
              View Workflows
            </a>
            <a [routerLink]="['/unified-squad/agents', agent.agentId, 'metrics']" class="btn-action">
              Detailed Metrics
            </a>
          </div>
        </div>

        <div *ngIf="filteredAgents().length === 0" class="empty-state">
          <p>No agents found matching your filters.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading()" class="loading-state">
        <p>Loading agent monitoring data...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-state">
        <p class="error-message">{{ error() }}</p>
        <button (click)="refreshData()" class="btn-retry">Retry</button>
      </div>
    </div>
  `,
  styles: [`
    .agent-monitoring-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-nav {
      display: flex;
      gap: 0.5rem;
    }

    .btn-nav {
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      background: var(--card-bg, #fff);
      color: var(--text-body);
      text-decoration: none;
      font-size: var(--font-size-tag);
    }

    .btn-nav:hover {
      background: var(--bg-subtle, #f4f4f4);
    }

    .header-title h1 {
      margin: 0 0 0.25rem 0;
      font-size: var(--font-size-3xl);
      font-weight: 600;
    }

    .subtitle {
      margin: 0;
      color: var(--text-muted, #666);
      font-size: var(--font-size-body-sm);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-refresh {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      background: var(--primary, #1976d2);
      color: white;
      cursor: pointer;
      font-size: var(--font-size-body-sm);
    }

    .btn-refresh:hover:not(:disabled) {
      background: var(--primary-dark, #1565c0);
    }

    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .last-updated {
      font-size: var(--font-size-tag);
      color: var(--text-muted, #666);
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      padding: 1.25rem;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: var(--radius);
      background: var(--card-bg, #fff);
    }

    .card-label {
      font-size: var(--font-size-tag);
      color: var(--text-muted, #666);
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: var(--font-size-4xl);
      font-weight: 600;
      color: var(--text-body);
    }

    .filters-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 250px;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-body-sm);
    }

    .filter-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-body-sm);
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .agent-card {
      padding: 1.5rem;
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: var(--radius);
      background: var(--card-bg, #fff);
      transition: box-shadow 0.2s;
    }

    .agent-card:hover {
      box-shadow: var(--shadow-card, 0 2px 8px rgba(var(--color-black-rgb), 0.1));
    }

    .agent-card.has-errors {
      border-inline-start: 4px solid var(--error, #d32f2f);
    }

    .agent-card.inactive {
      opacity: 0.7;
    }

    .agent-card-header {
      margin-bottom: 1rem;
    }

    .agent-identity {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .agent-icon {
      font-size: var(--font-size-4xl);
    }

    .agent-info {
      flex: 1;
    }

    .agent-name {
      margin: 0 0 0.5rem 0;
      font-size: var(--font-size-body-md);
      font-weight: 600;
    }

    .agent-meta {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 0.25rem;
    }

    .agent-role {
      padding: 0.2rem 0.5rem;
      background: var(--bg-subtle, #f4f4f4);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      color: var(--text-muted, #666);
    }

    .agent-status {
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      font-weight: 500;
    }

    .agent-status[data-status="active"] {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .agent-status[data-status="inactive"] {
      background: #f5f5f5;
      color: #666;
    }

    .agent-status[data-status="error"] {
      background: #ffebee;
      color: #c62828;
    }

    .agent-specialization {
      font-size: var(--font-size-tag);
      color: var(--text-muted, #666);
      margin-top: 0.25rem;
    }

    .metrics-section {
      margin: 1rem 0;
      padding: 1rem;
      background: var(--bg-subtle, #f9f9f9);
      border-radius: var(--radius-sm);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-color, #e0e0e0);
    }

    .metric-row:last-child {
      border-bottom: none;
    }

    .metric-label {
      font-size: var(--font-size-tag);
      color: var(--text-muted, #666);
    }

    .metric-label.error {
      color: var(--error, #d32f2f);
      font-weight: 500;
    }

    .metric-value {
      font-size: var(--font-size-body-sm);
      font-weight: 500;
      color: var(--text-body);
    }

    .metric-value.error {
      color: var(--error, #d32f2f);
    }

    .metric-value.high {
      color: #2e7d32;
    }

    .metric-value.medium {
      color: #f57c00;
    }

    .metric-value.low {
      color: var(--error, #d32f2f);
    }

    .action-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .action-tag {
      padding: 0.2rem 0.5rem;
      background: var(--primary-light, #e3f2fd);
      color: var(--primary, #1976d2);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
    }

    .workflow-section {
      margin: 1rem 0;
      padding: 1rem;
      background: var(--bg-subtle, #f9f9f9);
      border-radius: var(--radius-sm);
    }

    .workflow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .workflow-label {
      font-size: var(--font-size-tag);
      color: var(--text-muted, #666);
      font-weight: 500;
    }

    .workflow-total {
      font-size: var(--font-size-body-sm);
      font-weight: 600;
      color: var(--text-body);
    }

    .workflow-status-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .workflow-badge {
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-sm);
      font-size: var(--font-size-caption);
      font-weight: 500;
    }

    .workflow-badge[data-status="pending"] {
      background: #fff3cd;
      color: #856404;
    }

    .workflow-badge[data-status="in_progress"] {
      background: #cfe2ff;
      color: #084298;
    }

    .workflow-badge[data-status="completed"] {
      background: #d1e7dd;
      color: #0f5132;
    }

    .workflow-badge[data-status="overdue"] {
      background: #f8d7da;
      color: #842029;
    }

    .agent-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, #e0e0e0);
    }

    .btn-action {
      flex: 1;
      padding: 0.5rem 1rem;
      text-align: center;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      background: var(--card-bg, #fff);
      color: var(--primary, #1976d2);
      text-decoration: none;
      font-size: var(--font-size-tag);
      transition: background 0.2s;
    }

    .btn-action:hover {
      background: var(--bg-subtle, #f4f4f4);
    }

    .empty-state,
    .loading-state,
    .error-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted, #666);
    }

    .error-message {
      color: var(--error, #d32f2f);
      margin-bottom: 1rem;
    }

    .btn-retry {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: var(--radius-sm);
      background: var(--primary, #1976d2);
      color: white;
      cursor: pointer;
    }

    .btn-retry:hover {
      background: var(--primary-dark, #1565c0);
    }
  `],
})
export class AgentMonitoringDashboardComponent implements OnInit, OnDestroy {
  private unifiedSquadService = inject(UnifiedSquadService);

  // State
  agents = signal<AgentMonitoringData[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  lastUpdated = signal<Date | null>(null);

  // Filters
  searchQuery = '';
  filterStatus = '';
  sortBy = 'name';

  // Computed
  totalAgents = computed(() => this.agents().length);
  activeAgents = computed(() => this.agents().filter(a => a.status === 'active').length);
  totalRuns24h = computed(() => this.agents().reduce((sum, a) => sum + (a.performance?.runsLast24h || 0), 0));
  avgSuccessRate = computed(() => {
    const agentsWithPerf = this.agents().filter(a => a.performance);
    if (agentsWithPerf.length === 0) return 0;
    const total = agentsWithPerf.reduce((sum, a) => sum + (a.performance!.successRate || 0), 0);
    return (total / agentsWithPerf.length) * 100;
  });

  filteredAgents = computed(() => {
    let filtered = [...this.agents()];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.displayName.toLowerCase().includes(query) ||
        a.role.toLowerCase().includes(query) ||
        (a.specialization?.toLowerCase().includes(query) ?? false)
      );
    }

    // Status filter
    if (this.filterStatus) {
      filtered = filtered.filter(a => a.status === this.filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'runs':
          return (b.performance?.runsLast24h || 0) - (a.performance?.runsLast24h || 0);
        case 'success':
          return (b.performance?.successRate || 0) - (a.performance?.successRate || 0);
        case 'lastRun':
          const aTime = a.performance?.lastRunAt ? new Date(a.performance.lastRunAt).getTime() : 0;
          const bTime = b.performance?.lastRunAt ? new Date(b.performance.lastRunAt).getTime() : 0;
          return bTime - aTime;
        case 'name':
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });

    return filtered;
  });

  private refreshInterval?: number;

  ngOnInit(): void {
    this.loadData();
    // Auto-refresh every 30 seconds
    this.refreshInterval = window.setInterval(() => this.loadData(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.unifiedSquadService.getAgentMonitoring();
      this.agents.set(data.agents as any);
      this.lastUpdated.set(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load agent monitoring data';
      devError('[AgentMonitoring]', msg);
      this.error.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  refreshData(): void {
    this.loadData();
  }

  applyFilters(): void {
    // Filters are applied via computed signal, no action needed
  }

  getWorkflowStatuses(byStatus: Record<string, number>): { key: string; count: number }[] {
    return Object.entries(byStatus).map(([key, count]) => ({ key, count }));
  }

  trackAgent(_index: number, agent: AgentMonitoringData): string {
    return agent.agentId;
  }
}
