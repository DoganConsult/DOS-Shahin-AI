import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FrameworkDetailDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, ProgressIndicatorModule, TableModule, TagModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-framework-drawer',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule, ProgressIndicatorModule, TableModule],
  template: `
    <cds-modal [header]="L.frameworkDetails" [(visible)]="visible" [modal]="true"
      [style]="{width:'70vw',maxHeight:'90vh'}" (onHide)="closed.emit()" position="right"
      [draggable]="false" [resizable]="false">

      <div *ngIf="fw" class="fd-content">
        <!-- Summary -->
        <div class="fd-summary">
          <h3 class="fd-name">{{ isAr ? fw.nameAr : fw.nameEn }}</h3>
          <cds-tag [value]="fw.status || 'active'" [severity]="fw.status === 'active' ? 'success' : 'info'" />
        </div>
        <p class="fd-desc" *ngIf="fw.summaryEn && !isAr">{{ fw.summaryEn }}</p>
        <p class="fd-desc" *ngIf="fw.summaryAr && isAr">{{ fw.summaryAr }}</p>

        <!-- Metrics -->
        <div class="fd-metrics">
          <div class="fd-metric"><span class="fd-mv">{{ fw.score }}%</span><span class="fd-ml">{{ L.score }}</span></div>
          <div class="fd-metric"><span class="fd-mv">{{ fw.domainsCount ?? 0 }}</span><span class="fd-ml">{{ L.domainsCount }}</span></div>
          <div class="fd-metric"><span class="fd-mv">{{ fw.obligationsCount ?? 0 }}</span><span class="fd-ml">{{ L.obligationsCount }}</span></div>
          <div class="fd-metric"><span class="fd-mv">{{ fw.controlsMapped }}</span><span class="fd-ml">{{ L.mappedControls }}</span></div>
          <div class="fd-metric"><span class="fd-mv">{{ fw.evidenceCoverage }}%</span><span class="fd-ml">{{ L.evidenceCoverage }}</span></div>
          <div class="fd-metric"><span class="fd-mv">{{ fw.openGaps ?? 0 }}</span><span class="fd-ml">{{ L.openGaps }}</span></div>
        </div>

        <cds-progress-bar [value]="fw.score" [showValue]="true" styleClass="fd-bar" />

        <!-- Info -->
        <div class="fd-info" *ngIf="fw.version || fw.regulatorId || fw.instrumentType">
          <div *ngIf="fw.version"><strong>{{ L.version }}:</strong> {{ fw.version }}</div>
          <div *ngIf="fw.regulatorId"><strong>{{ L.regulator }}:</strong> {{ fw.regulatorId }}</div>
          <div *ngIf="fw.instrumentType"><strong>Type:</strong> {{ fw.instrumentType }}</div>
        </div>

        <!-- Domains list -->
        <div class="fd-section" *ngIf="fw.domains?.length">
          <h4>{{ L.domainsCount }} ({{ fw.domains.length }})</h4>
          <div class="fd-chip-list">
            <span tabindex="0" role="button" (keyup.enter)="openDomain.emit(d.node_id)" class="fd-chip" *ngFor="let d of fw.domains" (click)="openDomain.emit(d.node_id)">
              {{ isAr ? d.title_ar : d.title_en }}
            </span>
          </div>
        </div>

        <!-- Findings -->
        <div class="fd-section" *ngIf="fw.findings?.length">
          <h4>Findings ({{ fw.findings.length }})</h4>
          <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="fw.findings.slice(0, 10)" styleClass="p-datatable-sm">
            <ng-template pTemplate="body" let-f>
              <tr>
                <td><cds-tag [value]="f.severity" [severity]="f.severity === 'critical' ? 'danger' : f.severity === 'high' ? 'warning' : 'info'" /></td>
                <td>{{ f.status }}</td>
              </tr>
            </ng-template>
          </table>
        </div>

        <!-- Actions -->
        <div class="fd-actions">
          <button cdsButton [label]="L.launchGap" icon="" styleClass="" (onClick)="launchGap.emit(fw.frameworkId)" />
          <button cdsButton [label]="L.runAssessment" icon="" styleClass=" " (onClick)="assess.emit(fw.frameworkId)" />
          <button cdsButton [label]="L.exportReport" icon="" styleClass=" " (onClick)="exportFw.emit(fw.frameworkId)" />
        </div>
      </div>
    </cds-modal>
  `,
  styles: [`
    .fd-content { display: flex; flex-direction: column; gap: 16px; }
    .fd-summary { display: flex; align-items: center; gap: 12px; }
    .fd-name { margin: 0; font-size: var(--font-size-lg); font-weight: 700; }
    .fd-desc { margin: 0; font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .fd-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .fd-metric { text-align: center; padding: 10px; border-radius: var(--radius); background: var(--surface-50, #f9fafb); border: 1px solid var(--surface-200, var(--border-subtle)); }
    .fd-mv { display: block; font-size: var(--font-size-xl); font-weight: 800; color: var(--text-color, #111); }
    .fd-ml { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; }
    .fd-info { font-size: var(--font-size-sm); color: var(--text-color, #111); display: flex; gap: 16px; flex-wrap: wrap; }
    .fd-info strong { color: var(--text-color-secondary, var(--text-muted)); }
    .fd-section h4 { margin: 0 0 8px; font-size: var(--font-size-base); font-weight: 700; }
    .fd-chip-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .fd-chip { padding: 4px 12px; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; background: var(--primary-50, #eff6ff); color: var(--primary-700, #1d4ed8); cursor: pointer; border: 1px solid var(--primary-200, #bfdbfe); }
    .fd-chip:hover { background: var(--primary-100, #dbeafe); }
    .fd-actions { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
  `]
})
export class FrameworkDetailDrawerComponent {
  @Input() fw: FrameworkDetailDto | null = null;
  @Input() visible = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() closed = new EventEmitter<void>();
  @Output() openDomain = new EventEmitter<string>();
  @Output() launchGap = new EventEmitter<string>();
  @Output() assess = new EventEmitter<string>();
  @Output() exportFw = new EventEmitter<string>();

}
