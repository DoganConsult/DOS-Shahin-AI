import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { SeverityChipComponent } from '../components/scoring/severity-chip.component';
import { GapDetailDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, TableModule, TagModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-gap-drawer',
  standalone: true,
  imports: [CommonModule, AppDatePipe, DialogModule, ButtonModule, TagModule, TableModule, SeverityChipComponent],
  template: `
    <cds-modal [header]="L.gapDetails" [(visible)]="visible" [modal]="true"
      [style]="{width:'65vw',maxHeight:'90vh'}" (onHide)="closed.emit()" position="right"
      [draggable]="false" [resizable]="false">

      <div *ngIf="detail" class="gd-content">
        <!-- Header -->
        <div class="gd-header">
          <h3 class="gd-title">{{ detail.gap.title }}</h3>
          <div class="gd-meta">
            <compliance-severity-chip [severity]="detail.gap.severity" />
            <cds-tag [value]="statusLabel(detail.gap.status)" [severity]="statusSev(detail.gap.status)" />
            <span *ngIf="detail.gap.frameworkName">{{ detail.gap.frameworkName }}</span>
          </div>
        </div>

        <!-- Description -->
        <div class="gd-section" *ngIf="detail.gap.description">
          <h4>{{ L.description }}</h4>
          <p class="gd-text">{{ detail.gap.description }}</p>
        </div>

        <!-- Cause / Impact -->
        <div class="gd-row">
          <div class="gd-section" *ngIf="detail.gap.cause">
            <h4>{{ L.cause }}</h4>
            <p class="gd-text">{{ detail.gap.cause }}</p>
          </div>
          <div class="gd-section" *ngIf="detail.gap.impact">
            <h4>{{ L.impact }}</h4>
            <p class="gd-text">{{ detail.gap.impact }}</p>
          </div>
        </div>

        <!-- Related obligation -->
        <div class="gd-section" *ngIf="detail.gap.obligationCode">
          <h4>{{ L.obligation }}</h4>
          <div class="gd-obl">
            <code>{{ detail.gap.obligationCode }}</code>
            <span>{{ isAr ? detail.gap.obligationTitleAr : detail.gap.obligationTitle }}</span>
          </div>
          <p class="gd-text" *ngIf="detail.gap.obligationDescription">{{ detail.gap.obligationDescription }}</p>
        </div>

        <!-- Linked Controls -->
        <div class="gd-section" *ngIf="detail.linkedControls?.length">
          <h4>{{ L.linkedControls }} ({{ detail.linkedControls.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.linkedControls" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template pTemplate="header">
              <tr><th>Title</th><th>Status</th><th>Test</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td>{{ c.title }}</td>
                <td><cds-tag [value]="c.status" [severity]="c.status === 'implemented' ? 'success' : 'warning'" /></td>
                <td>{{ c.test_status || '—' }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Remediation Plan -->
        <div class="gd-section" *ngIf="detail.gap.remediationPlan">
          <h4>{{ L.remediationPlan }}</h4>
          <p class="gd-text">{{ detail.gap.remediationPlan }}</p>
        </div>

        <!-- Remediation Tasks -->
        <div class="gd-section" *ngIf="detail.remediationTasks?.length">
          <h4>Remediation Tasks ({{ detail.remediationTasks.length }})</h4>
          <div class="gd-task" *ngFor="let t of detail.remediationTasks">
            <span class="gd-task-title">{{ t.title }}</span>
            <cds-tag [value]="t.status" />
            <span class="gd-task-owner" *ngIf="t.assigned_to">{{ t.assigned_to }}</span>
          </div>
        </div>

        <!-- Target / Validation -->
        <div class="gd-row" *ngIf="detail.gap.targetDate || detail.gap.validationEvidence">
          <div class="gd-section" *ngIf="detail.gap.targetDate">
            <h4>{{ L.targetDate }}</h4>
            <span>{{ detail.gap.targetDate | appDate:'medium' }}</span>
          </div>
          <div class="gd-section" *ngIf="detail.gap.validationEvidence">
            <h4>{{ L.validationEvidence }}</h4>
            <p class="gd-text">{{ detail.gap.validationEvidence }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="gd-actions">
          <button cdsButton [label]="L.startRemediation" icon="" styleClass="" (onClick)="startRem.emit(detail.gap.gapId)" />
          <button cdsButton [label]="L.attachEvidence" icon="" styleClass=" " (onClick)="attachEv.emit(detail.gap.gapId)" />
          <button cdsButton [label]="L.markReady" icon="" styleClass=" " (onClick)="validate.emit(detail.gap.gapId)" />
          <button cdsButton [label]="L.closeGap" icon="" styleClass=" " (onClick)="closeGap.emit(detail.gap.gapId)" />
          <button cdsButton [label]="L.acceptRisk" icon="" styleClass="  " (onClick)="acceptRisk.emit(detail.gap.gapId)" />
        </div>
      </div>
    </cds-modal>
  `,
  styles: [`
    .gd-content { display: flex; flex-direction: column; gap: 16px; }
    .gd-header { display: flex; flex-direction: column; gap: 6px; }
    .gd-title { margin: 0; font-size: 17px; font-weight: 700; }
    .gd-meta { display: flex; gap: 10px; align-items: center; font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .gd-section h4 { margin: 0 0 6px; font-size: var(--font-size-sm); font-weight: 700; color: var(--text-color, #111); }
    .gd-text { margin: 0; font-size: var(--font-size-sm); color: var(--text-color, #111); line-height: 1.6; }
    .gd-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gd-obl { display: flex; gap: 8px; align-items: center; font-size: var(--font-size-sm); }
    .gd-obl code { color: var(--primary, var(--primary)); font-weight: 700; }
    .gd-task { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--surface-100, var(--surface-ice)); }
    .gd-task-title { flex: 1; font-size: var(--font-size-sm); font-weight: 500; }
    .gd-task-owner { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
    .gd-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
  `]
})
export class GapDetailDrawerComponent {
  @Input() detail: GapDetailDto | null = null;
  @Input() visible = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() closed = new EventEmitter<void>();
  @Output() startRem = new EventEmitter<string>();
  @Output() attachEv = new EventEmitter<string>();
  @Output() validate = new EventEmitter<string>();
  @Output() closeGap = new EventEmitter<string>();
  @Output() acceptRisk = new EventEmitter<string>();

  statusLabel(s: string): string { return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }
  statusSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'closed') return 'success';
    if (s === 'in_progress') return 'warning';
    if (s === 'open') return 'danger';
    return 'info';
  }

}
