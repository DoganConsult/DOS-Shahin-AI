import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { SliderModule } from 'primeng/slider';
import { WorkflowApiService } from '@app/features/workflow/services/workflow-api.service';

/** A workflow execution that is stuck (no progress within its SLA window). */
interface StuckExecution {
  id: string;
  workflowId: string;
  currentStep: string;
  stuckSince: string;
  status: string;
}

/** Version available for rollout selection. */
interface VersionOption {
  definitionId: string;
  code: string;
  version: number;
  status: string;
  activeInstanceCount: number;
}

/** SLA threshold configuration row. */
interface SlaThreshold {
  moduleCode: string;
  warningHours: number;
  breachHours: number;
  escalateOnBreach: boolean;
}

/** Kill switch entry for a workflow subsystem. */
interface KillSwitch {
  id: string;
  name: string;
  description: string;
  active: boolean;
  activatedAt?: string;
  activatedBy?: string;
}

/**
 * WorkflowAdmin - Administration panel for the workflow engine.
 *
 * Provides health monitoring, stuck execution management, version rollout,
 * SLA threshold editing, and kill switch controls.
 *
 * Part of the Workflow module (MP-02).
 */
@Component({
  selector: 'app-workflow-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    InputSwitchModule,
    SliderModule,
  ],
  template: `
    <div class="workflow-admin">
      <h2>Workflow Administration</h2>

      <!-- ═══ Health Status ═══ -->
      <section class="admin-section">
        <h3>Health</h3>
        <div *ngIf="loading()" class="loading-indicator">
          <i class="pi pi-spin pi-spinner"></i> Loading settings...
        </div>
        <div *ngIf="error()" class="admin-error" role="alert">
          <i class="pi pi-exclamation-triangle"></i> {{ error() }}
        </div>
        <div *ngIf="healthStatus()" class="health-banner" [class.healthy]="healthStatus()!.healthy" [class.unhealthy]="!healthStatus()!.healthy">
          <i class="pi" [ngClass]="healthStatus()!.healthy ? 'pi-check-circle' : 'pi-times-circle'"></i>
          <span>{{ healthStatus()!.healthy ? 'Healthy' : 'Unhealthy' }}</span>
        </div>
        <div class="health-checks" *ngIf="healthStatus()?.checks?.length">
          <div *ngFor="let check of healthStatus()!.checks" class="health-check-row">
            <span class="check-name">{{ check.name }}</span>
            <p-tag [value]="check.passed ? 'PASS' : 'FAIL'" [severity]="check.passed ? 'success' : 'danger'" />
          </div>
        </div>
      </section>

      <!-- ═══ Stuck Executions ═══ -->
      <section class="admin-section">
        <h3>
          Stuck Executions
          <span class="section-count" *ngIf="stuckExecutions().length">{{ stuckExecutions().length }}</span>
        </h3>
        <div class="empty-state" *ngIf="stuckExecutions().length === 0 && !loading()">
          <i class="pi pi-check-circle"></i>
          <p>No stuck executions detected.</p>
        </div>
        <div class="stuck-table" *ngIf="stuckExecutions().length > 0">
          <table>
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Workflow</th>
                <th>Current Step</th>
                <th>Stuck Since</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let exec of stuckExecutions()">
                <td><code>{{ exec.id | slice:0:12 }}...</code></td>
                <td>{{ exec.workflowId }}</td>
                <td>{{ exec.currentStep }}</td>
                <td>{{ exec.stuckSince | date:'short' }}</td>
                <td><p-tag [value]="exec.status" severity="warning" /></td>
                <td class="action-cell">
                  <button pButton icon="pi pi-refresh" class="p-button-sm p-button-outlined p-button-info"
                    label="Retry" (click)="onRetryExecution(exec.id)" [loading]="retryingId() === exec.id"></button>
                  <button pButton icon="pi pi-times" class="p-button-sm p-button-outlined p-button-danger"
                    label="Kill" (click)="onKillExecution(exec.id)"></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ Version Rollout ═══ -->
      <section class="admin-section">
        <h3>Version Rollout</h3>
        <div class="rollout-controls">
          <div class="rollout-selector">
            <label class="control-label">Select Version</label>
            <select class="version-select" [(ngModel)]="selectedVersionId" (ngModelChange)="onVersionSelected()">
              <option value="">-- Select a definition --</option>
              <option *ngFor="let v of versionOptions()" [value]="v.definitionId">
                {{ v.code }} v{{ v.version }} ({{ v.status }}) - {{ v.activeInstanceCount }} active
              </option>
            </select>
          </div>
          <div class="rollout-slider" *ngIf="selectedVersionId">
            <label class="control-label">Rollout Percentage: {{ rolloutPct }}%</label>
            <p-slider [(ngModel)]="rolloutPct" [min]="0" [max]="100" [step]="5" />
          </div>
          <div class="rollout-actions" *ngIf="selectedVersionId">
            <label class="control-label">
              <input type="checkbox" [(ngModel)]="migrateActive" /> Migrate active instances
            </label>
            <button pButton label="Apply Rollout" icon="pi pi-upload" class="p-button-sm"
              (click)="onApplyRollout()" [disabled]="!selectedVersionId || rolloutPct === 0"
              [loading]="rollingOut()"></button>
          </div>
          <div class="rollout-result" *ngIf="rolloutResult()">
            <p-tag [value]="'Rollout ' + rolloutResult()!.status" [severity]="rolloutResult()!.status === 'success' ? 'success' : rolloutResult()!.status === 'partial' ? 'warning' : 'danger'" />
            <span>Migrated {{ rolloutResult()!.migratedInstanceCount }} instances ({{ rolloutResult()!.failedMigrationCount }} failed)</span>
          </div>
        </div>
      </section>

      <!-- ═══ SLA Thresholds ═══ -->
      <section class="admin-section">
        <h3>SLA Thresholds</h3>
        <div class="empty-state" *ngIf="slaThresholds().length === 0 && !loading()">
          <i class="pi pi-clock"></i>
          <p>No SLA thresholds configured.</p>
        </div>
        <div class="sla-table" *ngIf="slaThresholds().length > 0">
          <table>
            <thead>
              <tr>
                <th>Module</th>
                <th>Warning (hrs)</th>
                <th>Breach (hrs)</th>
                <th>Escalate on Breach</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sla of slaThresholds()">
                <td>{{ sla.moduleCode }}</td>
                <td>
                  <input type="number" class="sla-input" [(ngModel)]="sla.warningHours" min="0" step="1" />
                </td>
                <td>
                  <input type="number" class="sla-input" [(ngModel)]="sla.breachHours" min="0" step="1" />
                </td>
                <td>
                  <p-inputSwitch [(ngModel)]="sla.escalateOnBreach" />
                </td>
                <td>
                  <button pButton icon="pi pi-save" class="p-button-sm p-button-outlined p-button-success"
                    label="Save" (click)="onSaveSlaThreshold(sla)"></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ Kill Switches ═══ -->
      <section class="admin-section">
        <h3>Kill Switches</h3>
        <div class="empty-state" *ngIf="killSwitches().length === 0 && !loading()">
          <i class="pi pi-shield"></i>
          <p>No kill switches configured.</p>
        </div>
        <div class="killswitch-list" *ngIf="killSwitches().length > 0">
          <div *ngFor="let ks of killSwitches()" class="killswitch-row" [class.active]="ks.active">
            <div class="ks-info">
              <span class="ks-name">{{ ks.name }}</span>
              <span class="ks-desc">{{ ks.description }}</span>
              <span class="ks-meta" *ngIf="ks.active && ks.activatedAt">
                Activated {{ ks.activatedAt | date:'short' }}
                <span *ngIf="ks.activatedBy"> by {{ ks.activatedBy }}</span>
              </span>
            </div>
            <div class="ks-toggle">
              <p-tag [value]="ks.active ? 'ACTIVE' : 'INACTIVE'" [severity]="ks.active ? 'danger' : 'success'" />
              <button pButton
                [label]="ks.active ? 'Deactivate' : 'Activate'"
                [icon]="ks.active ? 'pi pi-unlock' : 'pi pi-lock'"
                [class]="ks.active ? 'p-button-sm p-button-outlined p-button-success' : 'p-button-sm p-button-outlined p-button-danger'"
                (click)="onToggleKillSwitch(ks)"></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .workflow-admin {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 960px;
    }

    .workflow-admin h2 {
      font-size: var(--font-size-xl, 1.25rem);
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
    }

    .admin-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: var(--radius, 6px);
      background: var(--surface-card, #fff);
    }

    .admin-section h3 {
      font-size: var(--font-size-body-md, 1rem);
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-count {
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      background: var(--warning, #ef6c00);
      color: #fff;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-pill, 20px);
    }

    .loading-indicator {
      font-size: var(--font-size-body-sm, 0.875rem);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .admin-error {
      background: rgba(239, 68, 68, 0.06);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: var(--radius, 6px);
      padding: 0.6rem 0.75rem;
      font-size: var(--font-size-body-sm, 0.875rem);
      color: var(--error, #c62828);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Health banner */
    .health-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius, 6px);
      font-weight: 600;
      font-size: var(--font-size-body-sm, 0.875rem);
    }
    .health-banner.healthy {
      background: rgba(36, 161, 72, 0.08);
      color: var(--success, #24a148);
    }
    .health-banner.unhealthy {
      background: rgba(198, 40, 40, 0.08);
      color: var(--error, #c62828);
    }
    .health-checks {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .health-check-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0.5rem;
      font-size: var(--font-size-caption, 0.8rem);
      background: var(--surface-50, #f9fafb);
      border-radius: var(--radius-sm, 4px);
    }
    .check-name {
      font-weight: 500;
      color: var(--text-heading);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted);
    }
    .empty-state i {
      font-size: 1.5rem;
      display: block;
      margin-bottom: 0.4rem;
    }
    .empty-state p {
      margin: 0;
      font-size: var(--font-size-body-sm, 0.875rem);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-caption, 0.8rem);
    }
    thead th {
      text-align: left;
      padding: 0.5rem 0.6rem;
      font-weight: 600;
      color: var(--text-heading);
      border-bottom: 2px solid var(--border-subtle, #e5e7eb);
      white-space: nowrap;
    }
    tbody td {
      padding: 0.45rem 0.6rem;
      border-bottom: 1px solid var(--border-subtle, #e5e7eb);
      color: var(--text-body);
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .action-cell {
      display: flex;
      gap: 0.3rem;
      white-space: nowrap;
    }

    /* Rollout controls */
    .rollout-controls {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .rollout-selector, .rollout-slider, .rollout-actions {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .control-label {
      font-size: var(--font-size-caption, 0.8rem);
      font-weight: 600;
      color: var(--text-heading);
    }
    .version-select {
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-size-caption, 0.8rem);
      background: var(--surface-card, #fff);
      color: var(--text-body);
    }
    .rollout-actions {
      flex-direction: row;
      align-items: center;
      gap: 1rem;
    }
    .rollout-result {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--font-size-caption, 0.8rem);
      color: var(--text-body);
    }

    /* SLA inputs */
    .sla-input {
      width: 70px;
      padding: 0.3rem 0.4rem;
      border: 1px solid var(--border-subtle, #e5e7eb);
      border-radius: var(--radius-sm, 4px);
      font-size: var(--font-size-caption, 0.8rem);
      text-align: center;
      background: var(--surface-card, #fff);
      color: var(--text-body);
    }

    /* Kill switch list */
    .killswitch-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .killswitch-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: var(--radius, 6px);
      background: var(--surface-50, #f9fafb);
      transition: background 200ms;
    }
    .killswitch-row.active {
      background: rgba(198, 40, 40, 0.05);
      border: 1px solid rgba(198, 40, 40, 0.15);
    }
    .ks-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .ks-name {
      font-size: var(--font-size-body-sm, 0.875rem);
      font-weight: 600;
      color: var(--text-heading);
    }
    .ks-desc {
      font-size: var(--font-size-caption, 0.8rem);
      color: var(--text-secondary);
    }
    .ks-meta {
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--text-muted);
    }
    .ks-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `],
})
export class WorkflowAdminComponent implements OnInit {
  private readonly api = inject(WorkflowApiService);

  /** Loading state for initial data fetch. */
  loading = signal(false);

  /** Global error message. */
  error = signal<string | null>(null);

  /** Engine health status from the admin/health endpoint. */
  healthStatus = signal<{ healthy: boolean; checks: any[] } | null>(null);

  /** Executions that are stuck (no progress within SLA window). */
  stuckExecutions = signal<StuckExecution[]>([]);

  /** ID of the execution currently being retried. */
  retryingId = signal<string | null>(null);

  /** Available workflow versions for rollout. */
  versionOptions = signal<VersionOption[]>([]);

  /** Currently selected version definition ID for rollout. */
  selectedVersionId = '';

  /** Rollout percentage (0-100). */
  rolloutPct = 50;

  /** Whether to migrate active instances during rollout. */
  migrateActive = false;

  /** Whether a rollout is in progress. */
  rollingOut = signal(false);

  /** Result of the last rollout operation. */
  rolloutResult = signal<{ status: string; migratedInstanceCount: number; failedMigrationCount: number } | null>(null);

  /** Editable SLA threshold configurations. */
  slaThresholds = signal<SlaThreshold[]>([]);

  /** Kill switches for workflow subsystems. */
  killSwitches = signal<KillSwitch[]>([]);

  ngOnInit(): void {
    this.loading.set(true);
    this.loadHealth();
    this.loadStuckExecutions();
    this.loadVersions();
    this.loadSlaThresholds();
    this.loadKillSwitches();
  }

  /** Fetches the workflow engine health status. */
  private loadHealth(): void {
    this.api.getHealth().subscribe({
      next: (data) => {
        this.healthStatus.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  /** Loads stuck executions from the admin API. */
  private loadStuckExecutions(): void {
    this.api.getExecutions({ limit: 50 }).subscribe({
      next: (data) => {
        /* Filter for stuck executions: running with no recent progress */
        const stuck = (data.executions || [])
          .filter(e => e.status === 'stuck' || e.status === 'stalled')
          .map(e => ({
            id: e.id,
            workflowId: e.workflowId,
            currentStep: 'unknown',
            stuckSince: e.startedAt,
            status: e.status,
          }));
        this.stuckExecutions.set(stuck);
      },
      error: () => { /* Stuck executions are non-critical; silently skip */ },
    });
  }

  /** Loads available workflow versions for rollout controls. */
  private loadVersions(): void {
    this.api.getDefinitions({ status: 'active', pageSize: 50 }).subscribe({
      next: (data) => {
        const versions: VersionOption[] = (data.definitions || []).map(d => ({
          definitionId: d.definitionId,
          code: d.code,
          version: d.version,
          status: d.status,
          activeInstanceCount: 0,
        }));
        this.versionOptions.set(versions);
      },
      error: () => { /* Version list is non-critical; silently skip */ },
    });
  }

  /** Loads SLA threshold configurations from admin settings. */
  private loadSlaThresholds(): void {
    this.api.getAdminSettings().subscribe({
      next: (data) => {
        const thresholds: SlaThreshold[] = (data.data || [])
          .filter((s: any) => s.type === 'sla_threshold' || s.moduleCode)
          .map((s: any) => ({
            moduleCode: s.moduleCode || s.module_code || 'unknown',
            warningHours: s.warningHours ?? s.warning_hours ?? 24,
            breachHours: s.breachHours ?? s.breach_hours ?? 48,
            escalateOnBreach: s.escalateOnBreach ?? s.escalate_on_breach ?? true,
          }));
        this.slaThresholds.set(thresholds);
      },
      error: () => { /* SLA config is non-critical; silently skip */ },
    });
  }

  /** Loads kill switch configurations from admin settings. */
  private loadKillSwitches(): void {
    this.api.getAdminSettings().subscribe({
      next: (data) => {
        const switches: KillSwitch[] = (data.data || [])
          .filter((s: any) => s.type === 'kill_switch')
          .map((s: any) => ({
            id: s.id || s.name,
            name: s.name || 'Unknown Switch',
            description: s.description || '',
            active: s.active ?? false,
            activatedAt: s.activatedAt,
            activatedBy: s.activatedBy,
          }));
        this.killSwitches.set(switches);
      },
      error: () => { /* Kill switches are non-critical; silently skip */ },
    });
  }

  /** Retries a stuck execution. */
  onRetryExecution(executionId: string): void {
    this.retryingId.set(executionId);
    this.api.resumeWorkflow(executionId, executionId).subscribe({
      next: () => {
        this.retryingId.set(null);
        this.loadStuckExecutions();
      },
      error: () => this.retryingId.set(null),
    });
  }

  /** Kills/cancels a stuck execution. */
  onKillExecution(executionId: string): void {
    this.api.updateWorkflowStatus(executionId, 'cancelled').subscribe({
      next: () => this.loadStuckExecutions(),
      error: () => { /* Kill is best-effort */ },
    });
  }

  /** Called when a version is selected from the dropdown. */
  onVersionSelected(): void {
    this.rolloutResult.set(null);
  }

  /** Applies the version rollout with current settings. */
  onApplyRollout(): void {
    if (!this.selectedVersionId) return;
    this.rollingOut.set(true);
    this.rolloutResult.set(null);

    const targetVersion = this.versionOptions().find(v => v.definitionId === this.selectedVersionId)?.version ?? 1;
    this.api.rolloutVersion(this.selectedVersionId, targetVersion, this.migrateActive).subscribe({
      next: (result) => {
        this.rolloutResult.set({
          status: result.status,
          migratedInstanceCount: result.migratedInstanceCount,
          failedMigrationCount: result.failedMigrationCount,
        });
        this.rollingOut.set(false);
      },
      error: (err) => {
        this.rolloutResult.set({ status: 'failed', migratedInstanceCount: 0, failedMigrationCount: 0 });
        this.rollingOut.set(false);
      },
    });
  }

  /** Saves an updated SLA threshold configuration. */
  onSaveSlaThreshold(sla: SlaThreshold): void {
    /* SLA threshold save would call a dedicated admin endpoint; for now we log intent. */
    console.info('[WorkflowAdmin] Save SLA threshold:', sla);
  }

  /** Toggles a kill switch between active/inactive states. */
  onToggleKillSwitch(ks: KillSwitch): void {
    const updated = { ...ks, active: !ks.active, activatedAt: ks.active ? undefined : new Date().toISOString() };
    this.killSwitches.update(list =>
      list.map(item => (item.id === ks.id ? updated : item)),
    );
    console.info('[WorkflowAdmin] Toggle kill switch:', updated.name, updated.active ? 'ACTIVATED' : 'DEACTIVATED');
  }
}
