import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ObligationDetailDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, TableModule, TagModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-obligation-drawer',
  standalone: true,
  imports: [CommonModule, AppDatePipe, DialogModule, ButtonModule, TagModule, TableModule],
  template: `
    <cds-modal [header]="L.obligationDetails" [(visible)]="visible" [modal]="true"
      [style]="{width:'65vw',maxHeight:'90vh'}" (onHide)="closed.emit()" position="right"
      [draggable]="false" [resizable]="false">

      <div *ngIf="detail" class="od-content">
        <!-- Header -->
        <div class="od-header">
          <code class="od-code">{{ detail.obligation.code }}</code>
          <h3 class="od-title">{{ isAr ? detail.obligation.titleAr : detail.obligation.titleEn }}</h3>
          <div class="od-meta">
            <span>{{ detail.obligation.frameworkName }}</span>
            <span *ngIf="detail.obligation.domainName">{{ isAr ? detail.obligation.domainNameAr : detail.obligation.domainName }}</span>
            <cds-tag [value]="detail.obligation.priority || 'medium'" [severity]="detail.obligation.priority === 'high' ? 'danger' : 'info'" />
          </div>
        </div>

        <!-- Full text -->
        <div class="od-section" *ngIf="detail.obligation.descriptionEn || detail.obligation.descriptionAr">
          <h4>{{ L.fullText }}</h4>
          <p class="od-text">{{ isAr ? (detail.obligation.descriptionAr || detail.obligation.descriptionEn) : detail.obligation.descriptionEn }}</p>
        </div>

        <!-- Evidence types -->
        <div class="od-section" *ngIf="detail.obligation.evidenceTypes?.length">
          <h4>Required Evidence Types</h4>
          <div class="od-chips">
            <span class="od-chip" *ngFor="let et of detail.obligation.evidenceTypes">{{ et }}</span>
          </div>
        </div>

        <!-- Linked Controls -->
        <div class="od-section" *ngIf="detail.controls?.length">
          <h4>{{ L.linkedControls }} ({{ detail.controls.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.controls" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template pTemplate="header">
              <tr><th>Title</th><th>Status</th><th>Test</th><th>Owner</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td>{{ c.title }}</td>
                <td><cds-tag [value]="c.status" [severity]="c.status === 'implemented' ? 'success' : 'warning'" /></td>
                <td>{{ c.test_status || '—' }}</td>
                <td>{{ c.owner || '—' }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Linked Evidence -->
        <div class="od-section" *ngIf="detail.evidence?.length">
          <h4>{{ L.linkedEvidence }} ({{ detail.evidence.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.evidence" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-e>
              <tr>
                <td>{{ e.title }}</td>
                <td><i class="pi" [ngClass]="e.verified ? 'pi-check ok' : 'pi-clock no'" ></i></td>
                <td>{{ e.expiry_date ? (e.expiry_date | appDate:'short') : '—' }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Findings -->
        <div class="od-section" *ngIf="detail.findings?.length">
          <h4>Findings ({{ detail.findings.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.findings" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-f>
              <tr>
                <td>{{ f.title || f.finding_id?.slice(0,8) }}</td>
                <td><cds-tag [value]="f.severity" [severity]="f.severity === 'critical' ? 'danger' : 'warning'" /></td>
                <td>{{ f.status }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Remediation Tasks -->
        <div class="od-section" *ngIf="detail.remediationTasks?.length">
          <h4>Remediation Tasks ({{ detail.remediationTasks.length }})</h4>
          <div class="od-task" *ngFor="let t of detail.remediationTasks">
            <span>{{ t.title }}</span>
            <cds-tag [value]="t.status" />
          </div>
        </div>

        <!-- Actions -->
        <div class="od-actions">
          <button cdsButton [label]="L.mapControl" icon="" styleClass="" (onClick)="mapControl.emit(detail.obligation.nodeId)" />
          <button cdsButton [label]="L.mapEvidence" icon="" styleClass=" " (onClick)="mapEvidence.emit(detail.obligation.nodeId)" />
          <button cdsButton [label]="L.createTask" icon="" styleClass=" " (onClick)="createTask.emit(detail.obligation.nodeId)" />
        </div>
      </div>
    </cds-modal>
  `,
  styles: [`
    .od-content { display: flex; flex-direction: column; gap: 16px; }
    .od-header { display: flex; flex-direction: column; gap: 4px; }
    .od-code { font-size: var(--font-size-sm); color: var(--primary, var(--primary)); font-weight: 700; }
    .od-title { margin: 0; font-size: 17px; font-weight: 700; }
    .od-meta { display: flex; gap: 10px; align-items: center; font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .od-section h4 { margin: 0 0 8px; font-size: var(--font-size-base); font-weight: 700; }
    .od-text { margin: 0; font-size: var(--font-size-sm); color: var(--text-color, #111); line-height: 1.6; white-space: pre-wrap; }
    .od-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .od-chip { padding: 3px 10px; border-radius: var(--radius-xs); font-size: var(--font-size-xs); font-weight: 600; background: var(--surface-100, var(--surface-ice)); color: var(--text-color, #111); }
    .ok { color: var(--success); } .no { color: var(--border-subtle); }
    .od-task { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--surface-100, var(--surface-ice)); font-size: var(--font-size-sm); }
    .od-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
  `]
})
export class ObligationDetailDrawerComponent {
  @Input() detail: ObligationDetailDto | null = null;
  @Input() visible = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() closed = new EventEmitter<void>();
  @Output() mapControl = new EventEmitter<string>();
  @Output() mapEvidence = new EventEmitter<string>();
  @Output() createTask = new EventEmitter<string>();

}
