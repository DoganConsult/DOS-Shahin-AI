import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomainScoreCardComponent } from '../components/scoring/domain-score-card.component';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import { DomainSummaryDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, DropdownModule, ProgressIndicatorModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-domains-tab',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, TagModule,
    UIShellModule, TooltipModule, ProgressIndicatorModule, DropdownModule,
    DomainScoreCardComponent, ComplianceEmptyStateComponent,
  ],
  template: `
    <section cdsToolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <cds-dropdown [options]="fwOptions" [(ngModel)]="fwFilter" optionLabel="label" optionValue="value"
          [placeholder]="L.filterByFramework" [style]="{minWidth:'240px'}" (onChange)="filterChange.emit(fwFilter)" />
      </ng-template>
      <ng-template pTemplate="end">
        <button cdsButton [label]="heatMode ? L.tableView : L.heatView"
          [icon]="heatMode ? '' : ''"
          styleClass=" " (onClick)="heatMode = !heatMode" />
      </ng-template>
    </section>

    <!-- Heat View -->
    <div class="heat-grid" *ngIf="heatMode && domains.length > 0">
      <div tabindex="0" role="button" (keyup.enter)="openDetail.emit(d.nodeId)" class="heat-cell" *ngFor="let d of domains"
           [style.background]="heatBg(d.score)" (click)="openDetail.emit(d.nodeId)">
        <span class="heat-title">{{ isAr ? d.titleAr : d.titleEn }}</span>
        <span class="heat-score">{{ d.score }}%</span>
        <span class="heat-fw">{{ d.frameworkName }}</span>
      </div>
    </div>

    <!-- Table View -->
    <table cdsTable aria-label="Domains table" [value]="domains" [paginator]="domains.length > 15" [rows]="15"
      styleClass="p-datatable-sm p-datatable-gridlines p-datatable-striped"
      [rowHover]="true" *ngIf="!heatMode && domains.length > 0">
      <ng-template pTemplate="header">
        <tr>
          <th >{{ L.name }}</th>
          <th>{{ L.framework }}</th>
          <th>{{ L.owner }}</th>
          <th  style="width:120px">{{ L.score }}</th>
          <th style="width:80px">{{ L.obligationsCount }}</th>
          <th style="width:80px">{{ L.controls }}</th>
          <th style="width:80px">{{ L.evidenceCoverage }}</th>
          <th style="width:70px">Gaps</th>
          <th style="width:60px">Critical</th>
          <th style="width:80px">{{ L.action }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-d>
        <tr>
          <td><strong>{{ isAr ? d.titleAr : d.titleEn }}</strong></td>
          <td>{{ d.frameworkName }}</td>
          <td>{{ d.owner || '—' }}</td>
          <td>
            <div class="score-cell">
              <cds-progress-bar [value]="d.score" [showValue]="false" styleClass="dom-prog" />
              <span class="score-pct" [class.good]="d.score >= 70" [class.warn]="d.score >= 40 && d.score < 70" [class.bad]="d.score < 40">{{ d.score }}%</span>
            </div>
          </td>
          <td>{{ d.obligationsCount }}</td>
          <td>{{ d.controlsMapped }}</td>
          <td>{{ d.evidenceCoverage ?? 0 }}%</td>
          <td>{{ d.openGaps ?? 0 }}</td>
          <td><span class="crit" *ngIf="d.criticalGaps">{{ d.criticalGaps }}</span><span *ngIf="!d.criticalGaps">—</span></td>
          <td>
            <button aria-label="Details" class="icon-act" [cdsTooltip]="Details" (click)="openDetail.emit(d.nodeId)"><i class=""></i></button>
          </td>
        </tr>
      </ng-template>
    </table>

    <compliance-empty-state *ngIf="domains.length === 0 && !loading"
      variant="domains" [title]="L.emptyDomains" [ctaLabel]="L.emptyDomainsCta" />
  `,
  styles: [`
    .heat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
    .heat-cell {
      padding: 16px; border-radius: var(--radius-md); cursor: pointer; text-align: center;
      display: flex; flex-direction: column; gap: 4px; transition: transform .15s;
      border: 1px solid rgba(var(--color-black-rgb), .06);
    }
    .heat-cell:hover { transform: scale(1.03); }
    .heat-title { font-size: var(--font-size-sm); font-weight: 700; color: #111; }
    .heat-score { font-size: var(--font-size-2xl); font-weight: 800; color: #111; }
    .heat-fw { font-size: var(--font-size-xs); color: var(--text-muted); }
    .score-cell { display: flex; align-items: center; gap: 6px; }
    .score-pct { font-size: var(--font-size-sm); font-weight: 700; min-width: 34px; }
    .score-pct.good { color: var(--success); } .score-pct.warn { color: #ca8a04; } .score-pct.bad { color: var(--error); }
    .crit { color: var(--error); font-weight: 700; }
    .icon-act {
      width: 28px; height: 28px; border-radius: var(--radius-sm); border: 1px solid var(--surface-border, var(--border-subtle));
      background: var(--surface-card, #fff); cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: var(--font-size-sm); color: var(--text-color-secondary); transition: all .15s;
    }
    .icon-act:hover { background: var(--primary-50, #eff6ff); color: var(--primary, var(--primary)); }
  `]
})
export class DomainsTabComponent {
  @Input() domains: DomainSummaryDto[] = [];
  @Input() fwOptions: { label: string; value: string }[] = [];
  @Input() loading = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() openDetail = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<string>();

  fwFilter = '';
  heatMode = false;

  heatBg(score: number): string {
    if (score >= 80) return '#dcfce7';
    if (score >= 60) return '#fef9c3';
    if (score >= 40) return '#fed7aa';
    return 'var(--status-danger-bg, #fff1f1)';
  }

}
