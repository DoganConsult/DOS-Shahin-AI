import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '@env/environment';
import { devError } from '../../core/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-digital-twin',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, StatCardComponent,
    CardModule, ButtonModule, ToolbarModule, TagModule, DialogModule, DropdownModule,
    InputTextModule, TooltipModule, AppDatePipe],
  template: `
    <app-page-shell
      icon="clone"
      [title]="i18n.translate('nextgen.digitalTwin')"
      [subtitle]="i18n.translate('nextgen.digitalTwinDesc')"
      [breadcrumbs]="['Dashboard', 'Digital Twin']"
      [loading]="loading">

      <!-- Summary Stats -->
      <div class="stats-row" *ngIf="simulations.length > 0">
        <app-stat-card icon="play" [value]="simulations.length" label="Total Simulations" accentColor="#0f62fe" />
        <app-stat-card icon="check-circle" [value]="activeCount" label="Active" accentColor="#22c55e" />
        <app-stat-card icon="times-circle" [value]="discardedCount" label="Discarded" accentColor="#94a3b8" />
        <app-stat-card icon="chart-line" [value]="bestDelta" label="Best Compliance Δ" accentColor="#8b5cf6" />
      </div>

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-button label="New Simulation" icon="pi pi-plus" (onClick)="createSim()" />
        </ng-template>
      </p-toolbar>

      <div class="cards-grid" *ngIf="simulations.length > 0">
        <p-card *ngFor="let s of simulations" [styleClass]="'sim-card sim-card--' + s.status">
          <div class="sim-inner">
            <div class="sim-header">
              <app-status-badge [status]="s.status" />
              <span class="sim-date">{{ s.created_at | appDate:'short' }}</span>
            </div>
            <h3 class="sim-title">Simulation #{{ s.simulation_id?.slice(0,8) }}</h3>

            <!-- Impact Projection (from backend computeImpact) -->
            <div *ngIf="s.impact_projection" class="impact-section">
              <div class="impact-row">
                <span class="impact-label">Compliance Before</span>
                <span class="impact-value">{{ s.impact_projection.complianceScoreBefore || 0 }}%</span>
              </div>
              <div class="impact-row">
                <span class="impact-label">Compliance After</span>
                <span class="impact-value highlight">{{ s.impact_projection.complianceScoreAfter || 0 }}%</span>
              </div>
              <div class="impact-row">
                <span class="impact-label">Delta</span>
                <span class="impact-delta" [class.positive]="(s.impact_projection.complianceDelta || 0) > 0" [class.negative]="(s.impact_projection.complianceDelta || 0) < 0">
                  <i class="pi" [ngClass]="(s.impact_projection.complianceDelta || 0) >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'" ></i>
                  {{ (s.impact_projection.complianceDelta || 0) >= 0 ? '+' : '' }}{{ s.impact_projection.complianceDelta || 0 }}%
                </span>
              </div>
              <div class="impact-row" *ngIf="s.impact_projection.changesCount">
                <span class="impact-label">Changes Applied</span>
                <span class="impact-value">{{ s.impact_projection.changesCount }}</span>
              </div>
            </div>

            <!-- No impact yet — show snapshot summary -->
            <div *ngIf="!s.impact_projection && s.source_snapshot" class="snapshot-grid">
              <div class="snap-item">
                <span class="snap-value">{{ s.source_snapshot?.controls?.length || 0 }}</span>
                <span class="snap-label">Controls</span>
              </div>
              <div class="snap-item">
                <span class="snap-value">{{ s.source_snapshot?.risks?.length || 0 }}</span>
                <span class="snap-label">Risks</span>
              </div>
              <div class="snap-item">
                <span class="snap-value">{{ s.source_snapshot?.frameworks?.length || 0 }}</span>
                <span class="snap-label">Frameworks</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="sim-actions" *ngIf="s.status === 'active'">
              <button class="action-btn primary" (click)="openChangeDialog(s)" pTooltip="Apply What-If Change">
                <i class="pi pi-sliders-h"></i> Apply Change
              </button>
              <button aria-label="Discard Simulation" class="action-btn danger" (click)="discardSim(s)" pTooltip="Discard Simulation">
                <i class="pi pi-trash"></i>
              </button>
            </div>
          </div>
        </p-card>
      </div>

      <div *ngIf="!loading && simulations.length === 0" class="empty-state">
        <i class="pi pi-clone empty-icon"></i>
        <p>No simulations yet. Create one to model compliance changes without affecting production data.</p>
        <p-button label="Create First Simulation" icon="pi pi-plus" (onClick)="createSim()" [outlined]="true" />
      </div>

      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>

      <!-- Apply Change Dialog -->
      <p-dialog header="Apply What-If Change" [(visible)]="showChangeDialog" [modal]="true" [style]="{width:'500px'}">
        <div class="dialog-form">
          <div class="field">
            <label>Change Type</label>
            <p-dropdown [options]="changeTypeOptions" [(ngModel)]="changeForm.type" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
          <div class="field">
            <label>Entity ID</label>
            <input pInputText [(ngModel)]="changeForm.entityId" class="w-full" placeholder="e.g., control ID or risk ID" aria-label="e.g., control ID or risk ID" />
          </div>
          <div class="field">
            <label>New Status</label>
            <p-dropdown [options]="statusOptions" [(ngModel)]="changeForm.newStatus" optionLabel="label" optionValue="value" styleClass="w-full" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="showChangeDialog=false" />
          <p-button label="Apply Change" icon="pi pi-check" (onClick)="applyChange()" [disabled]="!changeForm.entityId" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .sim-inner { display: flex; flex-direction: column; gap: 10px; }
    .sim-header { display: flex; justify-content: space-between; align-items: center; }
    .sim-date { font-size: var(--font-size-sm); color: var(--text-muted); }
    .sim-title { font-size: var(--font-size-base); font-weight: 700; margin: 0; color: var(--text-heading); }
    .impact-section { background: var(--surface-sunken); border-radius: var(--radius); padding: 12px; }
    .impact-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-size-sm); }
    .impact-label { color: var(--text-muted); }
    .impact-value { font-weight: 600; color: var(--text-heading); }
    .impact-value.highlight { color: var(--primary); }
    .impact-delta { font-weight: 700; display: flex; align-items: center; gap: 4px; }
    .impact-delta.positive { color: var(--success); }
    .impact-delta.negative { color: var(--error); }
    .snapshot-grid { display: flex; gap: 24px; }
    .snap-item { text-align: center; }
    .snap-value { display: block; font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading); }
    .snap-label { font-size: var(--font-size-xs); color: var(--text-muted); }
    .sim-actions { display: flex; gap: 8px; margin-top: 4px; }
    .action-btn {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle); background: var(--surface); cursor: pointer;
      font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); transition: all 150ms;
    }
    .action-btn.primary:hover { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .action-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); border-color: var(--status-danger-bg, #fff1f1); }
    .empty-state { text-align: center; padding: 48px 0; color: var(--text-muted); }
    .empty-icon { font-size: 48px; margin-bottom: 16px; display: block; }
    .mb-3 { margin-bottom: 16px; }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    @media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } .cards-grid { grid-template-columns: 1fr; } }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `],
})
export class DigitalTwinComponent implements OnInit {
  simulations: Record<string, any>[] = [];
  loading = true;
  error = '';
  activeCount = 0;
  discardedCount = 0;
  bestDelta = 0;

  showChangeDialog = false;
  changingSimId = '';
  changeForm = { type: 'control_change', entityId: '', newStatus: 'implemented' };

  changeTypeOptions = [
    { label: 'Control Change', value: 'control_change' },
    { label: 'Risk Change', value: 'risk_change' },
    { label: 'Policy Change', value: 'policy_change' },
  ];

  statusOptions = [
    { label: 'Implemented', value: 'implemented' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Not Started', value: 'not_started' },
    { label: 'Mitigated', value: 'mitigated' },
    { label: 'Accepted', value: 'accepted' },
  ];

  private api = environment.apiUrl;
  private cdr = inject(ChangeDetectorRef);

  constructor(public i18n: I18nService, private http: HttpClient, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void { this.loadSimulations(); }

  loadSimulations(): void {
    this.loading = true;
    this.operationsSvc.getSimulations().subscribe({
      next: (r: Record<string, any>) => {
        this.simulations = r.simulations || [];
        this.activeCount = this.simulations.filter((s: Record<string, any>) => s.status === 'active').length;
        this.discardedCount = this.simulations.filter((s: Record<string, any>) => s.status === 'discarded').length;
        this.bestDelta = this.simulations.reduce((best: number, s: Record<string, any>) => {
          const d = s.impact_projection?.complianceDelta || 0;
          return d > best ? d : best;
        }, 0);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  createSim(): void {
    this.operationsSvc.createSimulation().subscribe(() => this.loadSimulations());
  }

  discardSim(sim: Record<string, any>): void {
    this.http.delete(`${this.api}/digital-twin/${sim.simulation_id}`).subscribe(() => this.loadSimulations());
  }

  openChangeDialog(sim: Record<string, any>): void {
    this.changingSimId = sim.simulation_id;
    this.changeForm = { type: 'control_change', entityId: '', newStatus: 'implemented' };
    this.showChangeDialog = true;
  }

  applyChange(): void {
    if (!this.changeForm.entityId) return;
    this.http.post(`${this.api}/digital-twin/${this.changingSimId}/change`, {
      type: this.changeForm.type,
      entityId: this.changeForm.entityId,
      changes: { status: this.changeForm.newStatus },
    }).subscribe({
      next: () => { this.showChangeDialog = false; this.loadSimulations(); },
      error: (e: unknown) => devError("[API]", e),
    });
  }

}
