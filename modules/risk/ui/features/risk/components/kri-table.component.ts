import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { HasPermissionDirective } from '@app/dauth/directives/has-permission.directive';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

/**
 * Presentational component: renders the KRI data table with sparklines,
 * anomaly badges, trend arrows, and row-level actions.
 * Emits action events to the parent orchestrator.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-kri-table',
    imports: [CommonModule, TableModule, TagModule, TooltipModule, HasPermissionDirective, AppDatePipe],
    template: `
    <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="KRI register table"
             [value]="kris" styleClass="p-datatable-sm p-datatable-striped"
             *ngIf="kris.length > 0" selectionMode="single" (onRowSelect)="rowSelect.emit($event.data)">
      <ng-template pTemplate="header">
        <tr>
          <th>{{ i18n.translate('risk.name') }}</th>
          <th>{{ i18n.translate('risk.linkedRisk') }}</th>
          <th>{{ i18n.translate('risk.owner') }}</th>
          <th>{{ i18n.translate('risk.threshold') }}</th>
          <th>{{ i18n.translate('risk.currentValue') }}</th>
          <th>{{ i18n.translate('risk.status') }}</th>
          <th>{{ i18n.translate('risk.sparkline') }}</th>
          <th>{{ i18n.translate('risk.trend') }}</th>
          <th>{{ i18n.translate('risk.lastUpdated') }}</th>
          <th>{{ i18n.translate('risk.actions') }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-kri>
        <tr [pSelectableRow]="kri" class="kri-row">
          <td class="font-semibold kri-name-cell">
            {{ kri.name }}
            <span *ngIf="isAnomaly(kri.kriId)" class="anomaly-badge" [pTooltip]="i18n.translate('risk.anomalyTooltip')">
              <i class="pi pi-exclamation-triangle"></i> {{ i18n.translate('risk.anomalyBadge') }}
            </span>
          </td>
          <td>
            <a *ngIf="kri.linkedCategory" class="category-link" (click)="categoryClick.emit({ category: kri.linkedCategory, event: $event })">
              {{ kri.linkedCategory }}
            </a>
            <span *ngIf="!kri.linkedCategory">&mdash;</span>
          </td>
          <td>{{ kri.owner || '&mdash;' }}</td>
          <td class="text-xs">R:{{ kri.threshold.red }} A:{{ kri.threshold.amber }} G:{{ kri.threshold.green }}</td>
          <td><span class="score-pill" [class]="kriStatusClass(kri.status)">{{ kri.currentValue }}</span></td>
          <td><p-tag [value]="kri.status" [severity]="kriTagSeverity(kri.status)" [rounded]="true" /></td>
          <td class="sparkline-cell" (click)="$event.stopPropagation()">
            <span *ngIf="sparklines.get(kri.kriId)" [innerHTML]="sparklines.get(kri.kriId)"></span>
            <span *ngIf="!sparklines.get(kri.kriId)" class="text-muted text-xs">&mdash;</span>
          </td>
          <td>
            <i *ngIf="kri.trend === 'up'" class="pi pi-arrow-up text-danger"></i>
            <i *ngIf="kri.trend === 'down'" class="pi pi-arrow-down text-success"></i>
            <i *ngIf="kri.trend === 'stable'" class="pi pi-minus text-muted"></i>
          </td>
          <td class="text-xs">{{ kri.lastUpdated | appDate:'short' }}</td>
          <td>
            <div class="row-actions" (click)="$event.stopPropagation()">
              <button aria-label="View detail" class="icon-btn" (click)="viewDetail.emit(kri)" [pTooltip]="i18n.translate('risk.viewDetail')"><i class="pi pi-eye"></i></button>
              <button *appHasPermission="'risk.record.write'" aria-label="Edit" class="icon-btn" (click)="edit.emit(kri)" [pTooltip]="i18n.translate('risk.editKRI')"><i class="pi pi-pencil"></i></button>
              <button *appHasPermission="'risk.record.delete'" aria-label="Delete" class="icon-btn danger" (click)="deleteKri.emit(kri)" [pTooltip]="i18n.translate('risk.deleteKRI')"><i class="pi pi-trash"></i></button>
            </div>
          </td>
        </tr>
      </ng-template>
    </p-table>
    <div *ngIf="kris.length === 0" class="empty-section">
      <i class="pi pi-chart-line"></i>
      <p>{{ emptyMessage }}</p>
    </div>
  `,
    styles: [`
    .kri-row { cursor: pointer; }
    .font-semibold { font-weight: 600; }
    .text-xs { font-size: var(--font-size-sm); }
    .text-danger { color: var(--error); }
    .text-success { color: var(--success); }
    .text-muted { color: var(--text-muted); }
    .kri-name-cell { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .anomaly-badge { display: inline-flex; align-items: center; gap: 3px; font-size: var(--font-size-nano); font-weight: 600; color: var(--severity-high, #7c3aed); background: rgba(var(--color-violet-600-rgb), .1); padding: 2px 6px; border-radius: var(--radius-md); white-space: nowrap; }
    .anomaly-badge i { font-size: var(--font-size-nano); }
    .category-link { color: var(--primary); cursor: pointer; text-decoration: none; font-weight: 500; }
    .category-link:hover { text-decoration: underline; }
    .score-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 28px; padding: 0 8px; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: 700; }
    .score-pill.score-danger { background: rgba(var(--module-accent-red-rgb), .12); color: var(--error); }
    .score-pill.score-warning { background: rgba(var(--module-accent-amber-rgb), .12); color: var(--warning); }
    .score-pill.score-success { background: rgba(var(--module-accent-green-rgb), .12); color: var(--success); }
    .score-pill.score-info { background: rgba(var(--module-accent-blue-rgb), .12); color: var(--primary); }
    .sparkline-cell { min-width: 90px; }
    :host .kri-sparkline { display: block; }
    .row-actions { display: flex; gap: var(--space-xs, 4px); }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px 6px; border-radius: var(--radius-sm, 4px); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: var(--surface-ice, rgba(var(--color-black-rgb), .05)); color: var(--primary); }
    .icon-btn.danger:hover { background: rgba(var(--module-accent-red-rgb), .08); color: var(--error); }
    .empty-section { text-align: center; padding: var(--space-2xl, 32px); }
    .empty-section i { font-size: var(--font-size-5xl); color: var(--text-muted); margin-bottom: var(--space-md, 12px); display: block; }
    .empty-section p { color: var(--text-muted); }
  `]
})
export class KriTableComponent {
  public i18n = inject(I18nService);

  /** KRI items to display */
  @Input() kris: Array<Record<string, any>> = [];

  /** Map of kriId -> sanitized SVG sparkline string */
  @Input() sparklines: Map<string, string> = new Map();

  /** Set of kriIds that are anomalies */
  @Input() anomalyKriIds: Set<string> = new Set();

  /** Empty state message */
  @Input() emptyMessage = '';

  /** Row selection event */
  @Output() rowSelect = new EventEmitter<Record<string, any>>();

  /** Category link click */
  @Output() categoryClick = new EventEmitter<{ category: string; event: Event }>();

  /** View detail action */
  @Output() viewDetail = new EventEmitter<Record<string, any>>();

  /** Edit action */
  @Output() edit = new EventEmitter<Record<string, any>>();

  /** Delete action */
  @Output() deleteKri = new EventEmitter<Record<string, any>>();

  /** Check if a KRI is flagged as anomalous */
  isAnomaly(kriId: string): boolean {
    return this.anomalyKriIds.has(kriId);
  }

  /** CSS class for score pill based on KRI status */
  kriStatusClass(status: string): string {
    const map: Record<string, string> = { breach: 'score-danger', warning: 'score-warning', normal: 'score-success' };
    return map[status] || 'score-info';
  }

  /** PrimeNG tag severity based on KRI status */
  kriTagSeverity(status: string): 'danger' | 'warning' | 'success' | 'info' {
    const map: Record<string, 'danger' | 'warning' | 'success' | 'info'> = { breach: 'danger', warning: 'warning', normal: 'success' };
    return map[status] || 'info';
  }
}
