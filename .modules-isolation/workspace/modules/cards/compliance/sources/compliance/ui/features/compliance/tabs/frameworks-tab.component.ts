import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import { FrameworkSummaryDto, FrameworkComparisonDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DialogModule, InputModule, ProgressIndicatorModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-frameworks-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    UIShellModule, InputModule, TooltipModule, DialogModule, ProgressIndicatorModule,
    ComplianceEmptyStateComponent,
  ],
  template: `
    <!-- Toolbar -->
    <section cdsToolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <span class="p-input-icon-left">
          <i class=""></i>
          <input type="text" pInputText [(ngModel)]="searchTerm" [placeholder]="L.search" [attr.aria-label]="L.search" class="fw-search" />
        </span>
      </ng-template>
      <ng-template pTemplate="end">
        <button cdsButton [label]="L.comparison" icon="" styleClass=" "
          (onClick)="compareClick.emit()" [disabled]="frameworks.length < 2" />
        <button cdsButton [label]="L.addFramework" icon="" styleClass=" ml-2"
          (onClick)="addFramework.emit()" />
      </ng-template>
    </section>

    <!-- Register Table -->
    <table cdsTable aria-label="Filtered table" [value]="filtered" [paginator]="filtered.length > 12" [rows]="12"
      styleClass="p-datatable-sm p-datatable-gridlines p-datatable-striped"
      [rowHover]="true" *ngIf="frameworks.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th  style="width:100px">{{ L.code }}</th>
          <th >{{ L.name }}</th>
          <th style="width:80px">{{ L.status }}</th>
          <th style="width:100px">{{ L.owner }}</th>
          <th  style="width:120px">{{ L.score }}</th>
          <th style="width:70px">{{ L.domainsCount }}</th>
          <th style="width:90px">{{ L.obligationsCount }}</th>
          <th style="width:90px">{{ L.mappedControls }}</th>
          <th style="width:90px">{{ L.evidenceCoverage }}</th>
          <th style="width:130px">{{ L.action }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-fw>
        <tr>
          <td><code>{{ fw.frameworkCode }}</code></td>
          <td>
            <strong>{{ isAr ? fw.nameAr : fw.nameEn }}</strong>
            <div class="fw-cat" *ngIf="fw.category"><cds-tag [value]="fw.category" severity="info" /></div>
          </td>
          <td><cds-tag [value]="fw.status" [severity]="statusSev(fw.status)" /></td>
          <td>{{ fw.owner || '—' }}</td>
          <td>
            <div class="score-cell">
              <cds-progress-bar [value]="fw.score" [showValue]="false" styleClass="fw-prog" />
              <span class="score-pct" [class.good]="fw.score >= 70" [class.warn]="fw.score >= 40 && fw.score < 70" [class.bad]="fw.score < 40">{{ fw.score }}%</span>
            </div>
          </td>
          <td>{{ fw.domainsCount ?? '—' }}</td>
          <td>{{ fw.obligationsCount ?? '—' }}</td>
          <td>{{ fw.controlsMapped }}</td>
          <td>{{ fw.evidenceCoverage }}%</td>
          <td>
            <div class="act-row">
              <button aria-label="Open" class="icon-act" [cdsTooltip]="Open" (click)="openDetail.emit(fw.frameworkId)"><i class=""></i></button>
              <button aria-label="Assess" class="icon-act" [cdsTooltip]="Assess" (click)="assessFw.emit(fw.frameworkId)"><i class=""></i></button>
              <button aria-label="Export" class="icon-act" [cdsTooltip]="Export" (click)="exportFw.emit(fw.frameworkId)"><i class=""></i></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </table>

    <!-- Comparison Dialog -->
    <cds-modal [header]="L.comparison" [(visible)]="compareVisible" [modal]="true" [style]="{width:'80vw'}">
      <table cdsTable [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Comparison table" [value]="comparison" styleClass="p-datatable-sm p-datatable-gridlines" *ngIf="comparison.length">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ L.framework }}</th>
            <th>{{ L.score }}</th>
            <th>{{ L.controls }}</th>
            <th>{{ L.implemented }}</th>
            <th>{{ L.mappedControls }}</th>
            <th>{{ L.evidenceCoverage }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-c>
          <tr>
            <td><strong>{{ c.frameworkName }}</strong></td>
            <td><span [class]="'sc ' + scoreClass(c.score)">{{ c.score }}%</span></td>
            <td>{{ c.totalControls }}</td>
            <td>{{ c.implementedControls }}</td>
            <td>{{ c.controlsMapped }}</td>
            <td>{{ c.evidenceCoverage }}%</td>
          </tr>
        </ng-template>
      </table>
    </cds-modal>

    <!-- Empty -->
    <compliance-empty-state *ngIf="frameworks.length === 0 && !loading"
      variant="frameworks" [title]="L.emptyFrameworks" [ctaLabel]="L.emptyFrameworksCta" />
  `,
  styles: [`
    .fw-search { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-color-secondary); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .ml-2 { margin-inline-start: 8px; }
    .fw-cat { margin-top: 2px; }
    .score-cell { display: flex; align-items: center; gap: 6px; }
    .score-pct { font-size: var(--font-size-sm); font-weight: 700; min-width: 34px; }
    .score-pct.good { color: var(--success); } .score-pct.warn { color: #ca8a04; } .score-pct.bad { color: var(--error); }
    .act-row { display: flex; gap: 4px; }
    .icon-act {
      width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); transition: all .15s;
    }
    .icon-act:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-300, #93c5fd); color: var(--primary, var(--primary)); }
    .sc { font-weight: 700; }
    .sc.good { color: var(--success); } .sc.warn { color: #ca8a04; } .sc.bad { color: var(--error); }
  `]
})
export class FrameworksTabComponent {
  @Input() frameworks: FrameworkSummaryDto[] = [];
  @Input() comparison: FrameworkComparisonDto[] = [];
  @Input() loading = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() openDetail = new EventEmitter<string>();
  @Output() assessFw = new EventEmitter<string>();
  @Output() exportFw = new EventEmitter<string>();
  @Output() compareClick = new EventEmitter<void>();
  @Output() addFramework = new EventEmitter<void>();

  searchTerm = '';
  compareVisible = false;

  get filtered(): FrameworkSummaryDto[] {
    if (!this.searchTerm) return this.frameworks;
    const t = this.searchTerm.toLowerCase();
    return this.frameworks.filter(f =>
      f.frameworkName.toLowerCase().includes(t) || f.frameworkCode?.toLowerCase().includes(t)
    );
  }

  statusSev(s: string): 'success' | 'warning' | 'danger' | 'info' {
    if (s === 'active') return 'success';
    if (s === 'draft') return 'info';
    return 'warning';
  }

  scoreClass(score: number): string {
    return score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad';
  }

  showComparison(): void { this.compareVisible = true; }
}
