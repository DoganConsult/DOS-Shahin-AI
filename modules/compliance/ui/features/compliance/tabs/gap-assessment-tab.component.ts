import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { SeverityChipComponent } from '../components/scoring/severity-chip.component';
import { RemediationBoardComponent } from '../components/remediation/remediation-board.component';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import { ComplianceGapDto, AssessmentRunDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { GrcFormFieldComponent } from '@app/widgets';
import { ButtonModule, DialogModule, DropdownModule, InputModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-gap-assessment-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    UIShellModule, DropdownModule, TooltipModule, DialogModule, InputModule,
    SeverityChipComponent, RemediationBoardComponent, ComplianceEmptyStateComponent,
    GrcFormFieldComponent,
  ],
  template: `
    <section cdsToolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <cds-dropdown [options]="sevOptions" [(ngModel)]="sevFilter" optionLabel="label" optionValue="value"
          [placeholder]="L.severity" [style]="{minWidth:'140px'}" (onChange)="filterChange.emit({severity: sevFilter, framework: fwFilter})" />
        <cds-dropdown [options]="fwOptions" [(ngModel)]="fwFilter" optionLabel="label" optionValue="value"
          [placeholder]="L.filterByFramework" [style]="{minWidth:'200px'}" class="ml-2"
          (onChange)="filterChange.emit({severity: sevFilter, framework: fwFilter})" />
      </ng-template>
      <ng-template pTemplate="end">
        <button cdsButton [label]="boardMode ? L.tableView : L.prioritizationBoard"
          [icon]="boardMode ? '' : ''"
          styleClass=" " (onClick)="boardMode = !boardMode" />
        <button cdsButton label="History" icon="" styleClass="  ml-2"
          (onClick)="historyVisible = true" />
      </ng-template>
    </section>

    <!-- Gap severity summary -->
    <div class="gap-sev-row" *ngIf="gaps.length > 0">
      <div class="gap-sev-chip crit"><i class=""></i> Critical: {{ countBySev('critical') }}</div>
      <div class="gap-sev-chip high"><i class=""></i> High: {{ countBySev('high') }}</div>
      <div class="gap-sev-chip med"><i class=""></i> Medium: {{ countBySev('medium') }}</div>
      <div class="gap-sev-chip low"><i class=""></i> Low: {{ countBySev('low') }}</div>
    </div>

    <!-- Board View -->
    <compliance-remediation-board *ngIf="boardMode && gaps.length > 0"
      [gaps]="gaps" groupBy="severity" [L]="L" (openGap)="openDetail.emit($event)" />

    <!-- Table View -->
    <table cdsTable aria-label="Gaps table" [value]="gaps" [paginator]="gaps.length > 15" [rows]="15"
      styleClass="p-datatable-sm p-datatable-gridlines p-datatable-striped"
      [rowHover]="true" *ngIf="!boardMode && gaps.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th style="width:60px">ID</th>
          <th>{{ L.description }}</th>
          <th>{{ L.framework }}</th>
          <th>{{ L.domain }}</th>
          <th>{{ L.obligation }}</th>
          <th style="width:80px">{{ L.severity }}</th>
          <th style="width:80px">{{ L.owner }}</th>
          <th style="width:100px">{{ L.status }}</th>
          <th style="width:90px">{{ L.dueDate }}</th>
          <th style="width:110px">{{ L.action }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-g>
        <tr>
          <td><code>{{ g.gapId?.slice(0,8) }}</code></td>
          <td><strong>{{ g.title }}</strong></td>
          <td>{{ g.frameworkName || '—' }}</td>
          <td>{{ g.domainName || '—' }}</td>
          <td>{{ g.obligationCode || '—' }}</td>
          <td><compliance-severity-chip [severity]="g.severity" /></td>
          <td>{{ g.owner || '—' }}</td>
          <td><cds-tag [value]="statusLabel(g.status)" [severity]="statusSev(g.status)" /></td>
          <td>{{ g.dueDate ? (g.dueDate | appDate:'short') : '—' }}</td>
          <td>
            <div class="act-row">
              <button aria-label="Details" class="icon-act" [cdsTooltip]="Details" (click)="openDetail.emit(g.gapId)"><i class=""></i></button>
              <button aria-label="Remediate" class="icon-act" [cdsTooltip]="Remediate" (click)="createRem.emit(g.gapId)"><i class=""></i></button>
              <button aria-label="Status" class="icon-act" [cdsTooltip]="Status" (click)="changeStatus.emit(g)"><i class=""></i></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </table>

    <!-- Assessment History Dialog -->
    <cds-modal [header]="L.assessmentHistory" [(visible)]="historyVisible" [modal]="true" [style]="{width:'60vw'}">
      <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Assessment History table" [value]="assessmentHistory" styleClass="p-datatable-sm p-datatable-gridlines" *ngIf="assessmentHistory.length > 0">
        <ng-template pTemplate="header">
          <tr><th>Date</th><th>Title</th><th>Status</th><th>Score</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-a>
          <tr>
            <td>{{ a.createdAt | appDate:'medium' }}</td>
            <td>{{ a.title || 'Assessment' }}</td>
            <td><cds-tag [value]="a.status" /></td>
            <td>{{ a.score ?? '—' }}%</td>
          </tr>
        </ng-template>
      </table>
      <div *ngIf="assessmentHistory.length === 0" style="text-align:center;padding:24px;color:#6b7280;">No assessment history</div>
    </cds-modal>

    <!-- Create Remediation Dialog -->
    <cds-modal header="Create Remediation Task" [(visible)]="newRemVisible" [modal]="true" [style]="{width:'400px'}">
      <div style="margin-bottom:12px;">
        <grc-form-field label="Title">
          <input type="text" pInputText [(ngModel)]="newRemTitle" style="width:100%;" />
        </grc-form-field>
      </div>
      <button cdsButton label="Create" icon="" (onClick)="submitRem()" [disabled]="!newRemTitle.trim()" />
    </cds-modal>

    <compliance-empty-state *ngIf="gaps.length === 0 && !loading"
      variant="gaps" [title]="L.emptyGaps" [subtitle]="L.emptyGapsSub" [ctaLabel]="L.emptyGapsCta" />
  `,
  styles: [`
    .ml-2 { margin-inline-start: 8px; }
    .gap-sev-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
    .gap-sev-chip { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: var(--radius); font-size: var(--font-size-sm); font-weight: 700; }
    .gap-sev-chip.crit { background: rgba(var(--color-red-600-rgb), .1); color: var(--error); }
    .gap-sev-chip.high { background: rgba(var(--color-orange-600-rgb), .1); color: var(--warning); }
    .gap-sev-chip.med { background: rgba(var(--color-amber-700-rgb), .1); color: var(--warning); }
    .gap-sev-chip.low { background: rgba(var(--color-blue-600-rgb), .1); color: var(--primary); }
    .act-row { display: flex; gap: 4px; }
    .icon-act {
      width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-sm); color: var(--text-color-secondary); transition: all .15s;
    }
    .icon-act:hover { background: var(--primary-50, #eff6ff); color: var(--primary, var(--primary)); }
  `]
})
export class GapAssessmentTabComponent {
  @Input() gaps: ComplianceGapDto[] = [];
  @Input() assessmentHistory: AssessmentRunDto[] = [];
  @Input() fwOptions: { label: string; value: string }[] = [];
  @Input() loading = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() openDetail = new EventEmitter<string>();
  @Output() createRem = new EventEmitter<string>();
  @Output() changeStatus = new EventEmitter<ComplianceGapDto>();
  @Output() filterChange = new EventEmitter<{ severity: string; framework: string }>();
  @Output() submitRemediation = new EventEmitter<{ gapId: string; title: string }>();

  sevFilter = '';
  fwFilter = '';
  boardMode = false;
  historyVisible = false;
  newRemVisible = false;
  newRemTitle = '';
  activeGapId = '';

  sevOptions = [
    { label: 'All Severities', value: '' },
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  countBySev(sev: string): number {
    return this.gaps.filter(g => g.severity === sev).length;
  }

  statusLabel(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'closed') return 'success';
    if (s === 'in_progress') return 'warning';
    if (s === 'open') return 'danger';
    return 'info';
  }

  openRemDialog(gapId: string): void {
    this.activeGapId = gapId;
    this.newRemTitle = '';
    this.newRemVisible = true;
  }

  submitRem(): void {
    if (!this.newRemTitle.trim()) return;
    this.submitRemediation.emit({ gapId: this.activeGapId, title: this.newRemTitle });
    this.newRemVisible = false;
  }
}
