import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageMatrixComponent } from '../components/analysis/coverage-matrix.component';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import { ObligationRowDto, CoverageMatrixDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, DropdownModule, InputModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-obligations-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    UIShellModule, InputModule, DropdownModule, TooltipModule, DialogModule,
    CoverageMatrixComponent, ComplianceEmptyStateComponent,
  ],
  template: `
    <section cdsToolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <span class="p-input-icon-left">
          <i class=""></i>
          <input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="L.search" [attr.aria-label]="L.search" class="obl-search" />
        </span>
        <cds-dropdown [options]="statusOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value"
          [placeholder]="L.status" [style]="{minWidth:'160px'}" class="ml-2" />
      </ng-template>
      <ng-template pTemplate="end">
        <button cdsButton [label]="L.coverageMatrix" icon="" styleClass=" "
          (onClick)="matrixClick.emit()" />
      </ng-template>
    </section>

    <table cdsTable aria-label="Filtered table" [value]="filtered" [paginator]="filtered.length > 15" [rows]="15"
      styleClass="p-datatable-sm p-datatable-gridlines p-datatable-striped"
      [rowHover]="true" *ngIf="obligations.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th  style="width:100px">{{ L.code }}</th>
          <th>{{ L.obligation }}</th>
          <th>{{ L.framework }}</th>
          <th>{{ L.domain }}</th>
          <th style="width:80px">{{ L.owner }}</th>
          <th style="width:110px">{{ L.status }}</th>
          <th style="width:80px">{{ L.controls }}</th>
          <th style="width:90px">{{ L.evidenceCoverage }}</th>
          <th style="width:80px">{{ L.action }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-o>
        <tr>
          <td><code>{{ o.code }}</code></td>
          <td>
            <strong>{{ isAr ? o.titleAr : o.titleEn }}</strong>
            <div class="obl-desc" *ngIf="!isAr && o.descriptionEn">{{ o.descriptionEn | slice:0:80 }}...</div>
          </td>
          <td>{{ o.frameworkName }}</td>
          <td>{{ isAr ? o.domainNameAr : o.domainName }}</td>
          <td>{{ o.owner || '—' }}</td>
          <td><cds-tag [value]="statusLabel(o.status)" [severity]="statusSev(o.status)" /></td>
          <td>{{ o.controlCoverage }}/{{ o.controlsImplemented }}</td>
          <td>{{ o.evidenceCoverage }}%</td>
          <td>
            <div class="act-row">
              <button aria-label="Details" class="icon-act" [cdsTooltip]="Details" (click)="openDetail.emit(o.nodeId)"><i class=""></i></button>
              <button aria-label="Map Control" class="icon-act" [cdsTooltip]="Map Control" (click)="mapControl.emit(o.nodeId)"><i class=""></i></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </table>

    <!-- Coverage Matrix Dialog -->
    <cds-modal [header]="L.coverageMatrix" [(visible)]="matrixVisible" [modal]="true" [style]="{width:'85vw'}">
      <compliance-coverage-matrix [matrix]="coverageMatrix" [L]="L" />
    </cds-modal>

    <compliance-empty-state *ngIf="obligations.length === 0 && !loading"
      variant="obligations" [title]="L.emptyObligations" [ctaLabel]="L.emptyObligationsCta" />
  `,
  styles: [`
    .obl-search { min-width: 200px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-color-secondary); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .ml-2 { margin-inline-start: 8px; }
    .obl-desc { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); margin-top: 2px; }
    .act-row { display: flex; gap: 4px; }
    .icon-act {
      width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-sm); color: var(--text-color-secondary); transition: all .15s;
    }
    .icon-act:hover { background: var(--primary-50, #eff6ff); color: var(--primary, var(--primary)); }
  `]
})
export class ObligationsTabComponent {
  @Input() obligations: ObligationRowDto[] = [];
  @Input() coverageMatrix: CoverageMatrixDto | null = null;
  @Input() loading = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() openDetail = new EventEmitter<string>();
  @Output() mapControl = new EventEmitter<string>();
  @Output() matrixClick = new EventEmitter<void>();

  searchTerm = '';
  statusFilter = '';
  matrixVisible = false;

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Covered', value: 'covered' },
    { label: 'Partially Covered', value: 'partially_covered' },
    { label: 'Uncovered', value: 'uncovered' },
    { label: 'Not Assessed', value: 'not_assessed' },
  ];

  get filtered(): ObligationRowDto[] {
    let list = this.obligations;
    if (this.statusFilter) list = list.filter(o => o.status === this.statusFilter);
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(o => o.titleEn.toLowerCase().includes(t) || o.code.toLowerCase().includes(t));
    }
    return list;
  }

  statusLabel(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  statusSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'covered') return 'success';
    if (s === 'partially_covered') return 'warning';
    if (s === 'uncovered') return 'danger';
    return 'info';
  }
}
