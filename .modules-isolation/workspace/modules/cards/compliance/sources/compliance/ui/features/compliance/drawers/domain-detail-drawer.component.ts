import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomainDetailDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, ProgressIndicatorModule, TableModule, TagModule } from 'carbon-components-angular';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-domain-drawer',
    standalone: true,
    imports: [CommonModule, DialogModule, ButtonModule, TagModule, TableModule, ProgressIndicatorModule],
    template: `
    <cds-modal [header]="L.domainDetails" [(visible)]="visible" [modal]="true"
      [style]="{width:'70vw',maxHeight:'90vh'}" (onHide)="closed.emit()" position="right"
      [draggable]="false" [resizable]="false">

      <div *ngIf="detail" class="dd-content">
        <div class="dd-header">
          <h3 class="dd-name">{{ isAr ? detail.domain.titleAr : detail.domain.titleEn }}</h3>
          <span class="dd-fw">{{ detail.domain.frameworkName }}</span>
        </div>

        <div class="dd-score-row">
          <span class="dd-score" [style.color]="scoreColor(detail.score)">{{ detail.score }}%</span>
          <cds-progress-bar [value]="detail.score" [showValue]="false" styleClass="dd-bar" />
        </div>
        <div class="dd-maturity" *ngIf="detail.domain?.maturityLevel">
          <span class="dd-maturity-label">Maturity:</span>
          <span class="dd-maturity-value">{{ detail.domain.maturityLevel }}</span>
          <span class="dd-maturity-score" *ngIf="detail.domain.maturityScore != null">({{ detail.domain.maturityScore }}%)</span>
        </div>

        <!-- Chain: Obligations -->
        <div class="dd-section">
          <h4>{{ L.linkedObligations }} ({{ detail.obligations.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.obligations.slice(0, 20)" styleClass="p-datatable-sm p-datatable-gridlines" *ngIf="detail.obligations.length > 0">
            <ng-template pTemplate="header">
              <tr><th>Code</th><th>Title</th><th>Controls</th><th>Covered</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-o>
              <tr>
                <td><code>{{ o.code }}</code></td>
                <td>{{ isAr ? o.title_ar : o.title_en }}</td>
                <td>{{ o.controlsMapped || 0 }}</td>
                <td><i class="pi" [ngClass]="o.covered ? 'pi-check-circle ok' : 'pi-times-circle no'" ></i></td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Chain: Controls -->
        <div class="dd-section" *ngIf="detail.controls?.length">
          <h4>{{ L.linkedControls }} ({{ detail.controls.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.controls.slice(0, 15)" styleClass="p-datatable-sm p-datatable-gridlines">
            <ng-template pTemplate="header">
              <tr><th>Title</th><th>Status</th><th>Owner</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-c>
              <tr>
                <td>{{ c.title }}</td>
                <td><cds-tag [value]="c.status" [severity]="c.status === 'implemented' ? 'success' : 'warning'" /></td>
                <td>{{ c.owner || '—' }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Chain: Evidence -->
        <div class="dd-section" *ngIf="detail.evidence?.length">
          <h4>{{ L.linkedEvidence }} ({{ detail.evidence.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.evidence.slice(0, 10)" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-e>
              <tr>
                <td>{{ e.title }}</td>
                <td><i class="pi" [ngClass]="e.verified ? 'pi-check ok' : 'pi-clock no'" ></i> {{ e.verified ? 'Verified' : 'Pending' }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Chain: Findings/Gaps -->
        <div class="dd-section" *ngIf="detail.findings?.length">
          <h4>Findings ({{ detail.findings.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="detail.findings.slice(0, 10)" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-f>
              <tr>
                <td>{{ f.title || f.finding_id?.slice(0,8) }}</td>
                <td><cds-tag [value]="f.severity" [severity]="f.severity === 'critical' ? 'danger' : 'warning'" /></td>
                <td>{{ f.status }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Remediation -->
        <div class="dd-section" *ngIf="detail.remediationTasks?.length">
          <h4>{{ L.activeRemediation }} ({{ detail.remediationTasks.length }})</h4>
          <div class="dd-rem" *ngFor="let t of detail.remediationTasks.slice(0, 5)">
            <span class="dd-rem-title">{{ t.title }}</span>
            <cds-tag [value]="t.status" />
          </div>
        </div>
      </div>
    </cds-modal>
  `,
    styles: [`
    .dd-content { display: flex; flex-direction: column; gap: 16px; }
    .dd-header { display: flex; flex-direction: column; gap: 4px; }
    .dd-name { margin: 0; font-size: var(--font-size-lg); font-weight: 700; }
    .dd-fw { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .dd-score-row { display: flex; align-items: center; gap: 12px; }
    .dd-score { font-size: var(--font-size-3xl); font-weight: 800; }
    .dd-maturity { font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px; }
    .dd-maturity-label { color: var(--text-color-secondary, var(--text-muted)); }
    .dd-maturity-value { font-weight: 700; color: var(--primary); }
    .dd-maturity-score { color: var(--text-color-secondary, var(--text-muted)); }
    .dd-section h4 { margin: 0 0 8px; font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); }
    .ok { color: var(--success); } .no { color: var(--border-subtle); }
    .dd-rem { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--surface-100, var(--surface-ice)); }
    .dd-rem-title { font-size: var(--font-size-sm); font-weight: 500; }
  `]
})
export class DomainDetailDrawerComponent {
  @Input() detail: DomainDetailDto | null = null;
  @Input() visible = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() closed = new EventEmitter<void>();

  scoreColor(score: number): string {
    return score >= 70 ? '#16a34a' : score >= 40 ? '#ca8a04' : 'var(--error)';
  }

}
