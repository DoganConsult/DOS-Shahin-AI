/**
 * ConnectorDetailDrawerComponent — Dumb presentational component
 * Right-side drawer showing connector detail: status, ownership,
 * configuration, status history timeline, and transition dialog.
 * Parent: ConnectorManagerComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
// Wave D-2 (Roadmap §2 P0 #17) — adopt DosSideDrawer (Wave H-2) +
// DosDesktopDialog (Wave H). Original chrome:
//   <p-sidebar position="right" width=520> + nested <p-dialog width=400>
// becomes:
//   <dos-side-drawer width="md"> + nested <dos-desktop-dialog width="sm">
import { DosSideDrawerComponent, DosDesktopDialogComponent } from '@dos/ui-system';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { InputTextarea } from 'primeng/textarea';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
  selector: 'app-connector-detail-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, AppDatePipe, StatusBadgeComponent,
    DosSideDrawerComponent, DosDesktopDialogComponent,
    ButtonModule, DropdownModule, InputTextarea,
  ],
  template: `
    <dos-side-drawer
      [open]="visible"
      title="Connector Detail"
      position="right"
      width="md"
      (closed)="closed.emit()">
      <div *ngIf="detail" class="detail-drawer">
        <!-- Header -->
        <div class="detail-header">
          <div class="detail-icon" [style.background]="getTypeColor(detail.source_system_type) + '18'" [style.color]="getTypeColor(detail.source_system_type)">
            <i class="pi" [ngClass]="getTypeIcon(detail.source_system_type)"></i>
          </div>
          <div>
            <div class="detail-name">{{ detail.name }}</div>
            <div class="detail-meta">{{ detail.source_system_type }} · {{ detail.platform || 'generic' }}</div>
          </div>
        </div>

        <!-- Status with Lifecycle -->
        <div class="detail-section">
          <h4>Status</h4>
          <div class="status-row">
            <app-status-badge [status]="detail.status" />
            <p-dropdown *ngIf="nextStatusOptions.length"
              [options]="nextStatusOptions"
              [(ngModel)]="transitionTarget"
              placeholder="Transition to..."
              [style]="{width:'180px'}" appendTo="body" />
            <p-button *ngIf="transitionTarget" icon="pi pi-check" size="small" (onClick)="transitionRequested.emit()" />
          </div>
        </div>

        <!-- Ownership -->
        <div class="detail-section">
          <h4>Ownership</h4>
          <div class="field mb-2">
            <label>Owner</label>
            <p-dropdown [options]="userOptions" [(ngModel)]="detail.owner_id"
              [filter]="true" filterBy="label"
              optionLabel="label" optionValue="value"
              placeholder="Select owner" [showClear]="true"
              appendTo="body" class="w-full"
              (onChange)="ownershipChanged.emit()" />
          </div>
          <div class="field mb-2">
            <label>Responsible Team</label>
            <p-dropdown [options]="teamOptions" [(ngModel)]="detail.owner_team_id"
              [filter]="true" filterBy="label"
              optionLabel="label" optionValue="value"
              placeholder="Select team" [showClear]="true"
              appendTo="body" class="w-full"
              (onChange)="ownershipChanged.emit()" />
          </div>
          <div class="ownership-context" *ngIf="detail.ownerContext">
            <div class="ctx-row"><span>Name:</span><strong>{{ detail.ownerContext.name || '---' }}</strong></div>
            <div class="ctx-row"><span>Email:</span><strong>{{ detail.ownerContext.email || '---' }}</strong></div>
          </div>
          <div class="ownership-context" *ngIf="detail.teamContext">
            <div class="ctx-row"><span>Team:</span><strong>{{ detail.teamContext.name || '---' }}</strong></div>
            <div class="ctx-row"><span>Code:</span><strong>{{ detail.teamContext.code || '---' }}</strong></div>
          </div>
        </div>

        <!-- Config Summary -->
        <div class="detail-section">
          <h4>Configuration</h4>
          <div class="ctx-row"><span>Auth:</span><strong>{{ detail.auth_method }}</strong></div>
          <div class="ctx-row"><span>Schedule:</span><strong>{{ detail.schedule }}</strong></div>
          <div class="ctx-row"><span>Endpoint:</span><strong>{{ detail.endpoint_url || '---' }}</strong></div>
          <div class="ctx-row"><span>Last Success:</span><strong>{{ detail.last_success_at | appDate:'short' }}</strong></div>
          <div class="ctx-row"><span>Failures:</span><strong>{{ detail.failure_count }}</strong></div>
        </div>

        <!-- Status Timeline -->
        <div class="detail-section">
          <h4>Status History</h4>
          <div *ngIf="statusHistory.length === 0" class="text-muted">No status changes recorded</div>
          <div class="timeline-list">
            @for (entry of statusHistory; track entry.log_id) {
              <div class="timeline-entry">
                <div class="tl-dot" [style.background]="getStatusColor(entry.to_status)"></div>
                <div class="tl-content">
                  <div class="tl-transition">
                    <span class="tl-from">{{ entry.from_status || 'created' }}</span>
                    <i class="pi pi-arrow-right" style="font-size:10px;margin:0 4px"></i>
                    <span class="tl-to">{{ entry.to_status }}</span>
                  </div>
                  <div class="tl-meta">{{ entry.changedByName }} · {{ entry.changed_at | appDate:'short' }}</div>
                  <div *ngIf="entry.reason" class="tl-reason">{{ entry.reason }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </dos-side-drawer>

    <!-- Transition Reason Dialog -->
    <dos-desktop-dialog
      [open]="showTransitionDialog"
      title="Status Transition"
      width="sm"
      (closed)="showTransitionDialog = false">
      <p>Transition from <strong>{{ detail?.status }}</strong> to <strong>{{ transitionTarget }}</strong></p>
      <div class="field mt-3">
        <label>Reason (optional)</label>
        <textarea pInputTextarea [(ngModel)]="transitionReason" rows="3" class="w-full"></textarea>
      </div>
      <div dialogFooter>
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="showTransitionDialog = false" />
        <p-button label="Confirm" icon="pi pi-check" (onClick)="transitionConfirmed.emit({ status: transitionTarget, reason: transitionReason })" [loading]="transitioning" />
      </div>
    </dos-desktop-dialog>
  `,
  styles: [`
    .detail-drawer { padding: 0 4px; }
    .detail-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
    .detail-icon { width: 48px; height: 48px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xl); flex-shrink: 0; }
    .detail-name { font-size: var(--font-size-lg); font-weight: 700; }
    .detail-meta { font-size: var(--font-size-xs); color: var(--text-muted); }
    .detail-section { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .detail-section h4 { margin: 0 0 10px; font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); }
    .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ownership-context { margin-top: 10px; padding: 10px; border-radius: var(--radius-sm); background: var(--surface-50, var(--surface-ice)); }
    .ctx-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: var(--font-size-sm); }
    .field { margin-bottom: 0; }
    .field label { display: block; font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 4px; color: var(--text-muted); }
    .mb-2 { margin-bottom: 8px; }
    .mt-3 { margin-top: 12px; }
    .w-full { width: 100%; }
    .text-muted { color: var(--text-muted); }
    .timeline-list { display: flex; flex-direction: column; gap: 12px; }
    .timeline-entry { display: flex; gap: 10px; align-items: flex-start; }
    .tl-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
    .tl-content { flex: 1; }
    .tl-transition { font-size: var(--font-size-sm); font-weight: 600; display: flex; align-items: center; }
    .tl-from, .tl-to { padding: 1px 6px; border-radius: var(--radius-xs); background: var(--surface-100, var(--surface-ice)); }
    .tl-meta { font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px; }
    .tl-reason { font-size: var(--font-size-xs); margin-top: 2px; font-style: italic; }
  `],
})
export class ConnectorDetailDrawerComponent {
  i18n = inject(I18nService);

  @Input() visible = false;
  @Input() detail: GrcRecord | null = null;
  @Input() statusHistory: GrcRecord[] = [];
  @Input() userOptions: { label: string; value: string }[] = [];
  @Input() teamOptions: { label: string; value: string }[] = [];
  @Input() transitioning = false;

  @Output() closed = new EventEmitter<void>();
  @Output() ownershipChanged = new EventEmitter<void>();
  @Output() transitionRequested = new EventEmitter<void>();
  @Output() transitionConfirmed = new EventEmitter<{ status: string; reason: string }>();

  transitionTarget = '';
  transitionReason = '';
  showTransitionDialog = false;

  get nextStatusOptions() {
    return ((this.detail as GrcRecord)?.validNextStatuses || []).map((s: string) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = { siem: '#dc2626', iam: '#7c3aed', itsm: '#0284c7', cmdb: '#059669', vuln: '#ea580c', outlook: '#2563eb', sharepoint: '#2563eb', onedrive: '#2563eb', erp: '#b45309' };
    return map[type] || '#6b7280';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = { siem: 'pi-shield', iam: 'pi-users', itsm: 'pi-ticket', cmdb: 'pi-server', vuln: 'pi-exclamation-triangle', outlook: 'pi-microsoft', sharepoint: 'pi-microsoft', onedrive: 'pi-microsoft', erp: 'pi-chart-bar' };
    return map[type] || 'pi-link';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = { draft: '#9ca3af', testing: '#3b82f6', active: '#16a34a', paused: '#f59e0b', disabled: '#6b7280', error: '#dc2626', archived: '#374151' };
    return map[status] || '#9ca3af';
  }
}
