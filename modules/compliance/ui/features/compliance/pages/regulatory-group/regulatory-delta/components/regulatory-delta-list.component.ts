import { Component, ChangeDetectionStrategy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ButtonModule, PlaceholderModule, TableModule, TooltipModule } from 'carbon-components-angular';

/** Shape of a delta node within a regulatory delta. */
export interface DeltaNode {
  path: string;
  title?: string;
  description?: string;
}

/** Shape of a single regulatory delta record. */
export interface RegulatoryDelta {
  deltaId: string;
  instrumentId: string;
  instrumentName: string;
  previousVersion: string;
  newVersion: string;
  addedNodes: DeltaNode[];
  modifiedNodes: DeltaNode[];
  removedNodes: DeltaNode[];
  detectedAt: string;
}

/**
 * Dumb component: renders the Delta History table with row expansion
 * showing added/modified/removed node details.
 */
@Component({
    selector: 'app-regulatory-delta-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TableModule, TooltipModule, PlaceholderModule, AppDatePipe],
    template: `
    <div class="rd-section">
      <h2 class="rd-section-title">
        <i class=""></i>
        {{ i18n.translate('regulatoryDelta.deltaHistory') || 'Delta History' }}
      </h2>

      @if (loading) {
        <div class="rd-skeleton-table">
          @for (i of [1,2,3,4,5]; track i) {
            <cds-placeholder></cds-placeholder>
          }
        </div>
      } @else if (deltas.length === 0) {
        <div class="rd-empty-state">
          <i class=""></i>
          <p>{{ i18n.translate('regulatoryDelta.noDeltas') || 'No regulatory deltas detected yet. Run a scan to check for changes.' }}</p>
        </div>
      } @else {
        <table cdsTable
          [value]="deltas"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm p-datatable-striped"
          [rowHover]="true"
          dataKey="deltaId"
          [attr.aria-label]="i18n.translate('regulatoryDelta.ariaDeltaTable') || 'Regulatory delta history table'">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:3rem"></th>
              <th>{{ i18n.translate('regulatoryDelta.col.instrument') || 'Instrument' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.previousVersion') || 'Previous Version' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.newVersion') || 'New Version' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.changes') || 'Changes' }}</th>
              <th>{{ i18n.translate('regulatoryDelta.col.detectedDate') || 'Detected Date' }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-delta let-expanded="expanded">
            <tr>
              <td>
                <button cdsButton type="button"
                  [pRowToggler]="delta"
                  class="  "
                  [icon]="expanded ? '' : ''"
                  [cdsTooltip]="expanded ? 'Collapse' : 'Expand'">
                </button>
              </td>
              <td class="rd-instrument-cell">
                <span class="rd-instrument-name">{{ delta.instrumentName }}</span>
              </td>
              <td><code class="rd-version-badge">{{ delta.previousVersion }}</code></td>
              <td><code class="rd-version-badge rd-version-new">{{ delta.newVersion }}</code></td>
              <td>
                <div class="rd-change-badges">
                  @if (delta.addedNodes?.length) {
                    <span class="rd-badge rd-badge-added" [cdsTooltip]="'Added nodes'">+{{ delta.addedNodes.length }}</span>
                  }
                  @if (delta.modifiedNodes?.length) {
                    <span class="rd-badge rd-badge-modified" [cdsTooltip]="'Modified nodes'">~{{ delta.modifiedNodes.length }}</span>
                  }
                  @if (delta.removedNodes?.length) {
                    <span class="rd-badge rd-badge-removed" [cdsTooltip]="'Removed nodes'">-{{ delta.removedNodes.length }}</span>
                  }
                  @if (!delta.addedNodes?.length && !delta.modifiedNodes?.length && !delta.removedNodes?.length) {
                    <span class="rd-badge rd-badge-none">{{ i18n.translate('regulatoryDelta.noChanges') || 'None' }}</span>
                  }
                </div>
              </td>
              <td class="rd-date-cell">{{ delta.detectedAt | appDate:'medium' }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="rowexpansion" let-delta>
            <tr>
              <td colspan="6">
                <div class="rd-expansion-content">
                  @if (delta.addedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-added">
                        <i class=""></i>
                        {{ i18n.translate('regulatoryDelta.addedNodes') || 'Added' }} ({{ delta.addedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.addedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) { <span class="rd-node-title">{{ node.title }}</span> }
                            @if (node.description) { <span class="rd-node-desc">{{ node.description }}</span> }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  @if (delta.modifiedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-modified">
                        <i class=""></i>
                        {{ i18n.translate('regulatoryDelta.modifiedNodes') || 'Modified' }} ({{ delta.modifiedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.modifiedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) { <span class="rd-node-title">{{ node.title }}</span> }
                            @if (node.description) { <span class="rd-node-desc">{{ node.description }}</span> }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                  @if (delta.removedNodes?.length) {
                    <div class="rd-node-group">
                      <h4 class="rd-node-group-title rd-removed">
                        <i class=""></i>
                        {{ i18n.translate('regulatoryDelta.removedNodes') || 'Removed' }} ({{ delta.removedNodes.length }})
                      </h4>
                      <ul class="rd-node-list">
                        @for (node of delta.removedNodes; track node.path) {
                          <li class="rd-node-item">
                            <code class="rd-node-path">{{ node.path }}</code>
                            @if (node.title) { <span class="rd-node-title">{{ node.title }}</span> }
                            @if (node.description) { <span class="rd-node-desc">{{ node.description }}</span> }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center p-4">
                {{ i18n.translate('regulatoryDelta.noDeltas') || 'No regulatory deltas found.' }}
              </td>
            </tr>
          </ng-template>
        </table>
      }
    </div>
  `,
    styles: [`
    .rd-section { margin-bottom: 32px; }
    .rd-section-title {
      display: flex; align-items: center; gap: 10px;
      font-size: var(--font-size-xl); font-weight: 700; color: var(--text-heading, #1e293b);
      margin: 0 0 16px 0; padding-bottom: 12px;
      border-bottom: 2px solid var(--border-subtle, #e2e8f0);
    }
    .rd-section-title i { font-size: var(--font-size-body-md); color: var(--primary, #3b82f6); }

    .rd-instrument-cell { font-weight: 600; }
    .rd-instrument-name { color: var(--text-heading, #1e293b); }
    .rd-version-badge {
      display: inline-block; padding: 2px 10px; border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-caption); font-weight: 600; font-family: 'Fira Code', 'Cascadia Code', monospace;
      background: var(--surface-ground, var(--surface-ice, #f1f5f9)); color: var(--text-color-secondary, #64748b);
      border: 1px solid var(--border-subtle, #e2e8f0);
    }
    .rd-version-new { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
    .rd-date-cell { font-size: var(--font-size-tag); white-space: nowrap; color: var(--text-color-secondary, #64748b); }

    .rd-change-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .rd-badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 2px 10px; border-radius: var(--radius-lg);
      font-size: var(--font-size-sm); font-weight: 700; min-width: 32px;
    }
    .rd-badge-added { background: #dcfce7; color: #15803d; }
    .rd-badge-modified { background: #fef9c3; color: #a16207; }
    .rd-badge-removed { background: #fee2e2; color: #b91c1c; }
    .rd-badge-none { background: var(--surface-ground, #f1f5f9); color: var(--text-color-secondary, #94a3b8); }

    .rd-expansion-content {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px; padding: 16px 8px;
    }
    .rd-node-group {
      background: var(--surface-card, #fff); border-radius: var(--radius-md, 8px);
      padding: 14px; border: 1px solid var(--border-subtle, #e2e8f0);
    }
    .rd-node-group-title {
      display: flex; align-items: center; gap: 8px;
      font-size: var(--font-size-tag); font-weight: 700; margin: 0 0 10px 0;
    }
    .rd-node-group-title.rd-added { color: #15803d; }
    .rd-node-group-title.rd-modified { color: #a16207; }
    .rd-node-group-title.rd-removed { color: #b91c1c; }
    .rd-node-list { list-style: none; padding: 0; margin: 0; }
    .rd-node-item {
      display: flex; flex-direction: column; gap: 2px;
      padding: 6px 0; border-bottom: 1px solid var(--border-subtle, #f1f5f9);
    }
    .rd-node-item:last-child { border-bottom: none; }
    .rd-node-path {
      font-size: var(--font-size-caption); font-family: 'Fira Code', 'Cascadia Code', monospace;
      color: var(--primary, #3b82f6); word-break: break-all;
    }
    .rd-node-title { font-size: var(--font-size-caption); font-weight: 600; color: var(--text-heading, #1e293b); }
    .rd-node-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary, #64748b); }

    .rd-skeleton-table { display: flex; flex-direction: column; gap: 8px; }
    .rd-empty-state {
      text-align: center; padding: 48px 24px;
      color: var(--text-color-secondary, #94a3b8);
    }
    .rd-empty-state i { font-size: var(--font-size-6xl); opacity: 0.2; display: block; margin-bottom: 12px; }
    .rd-empty-state p { font-size: var(--font-size-body-sm); margin: 0; }

    @media (max-width: 768px) {
      .rd-expansion-content { grid-template-columns: 1fr; }
    }
  `]
})
export class RegulatoryDeltaListComponent {
  readonly i18n = inject(I18nService);

  @Input() loading = false;
  @Input() deltas: RegulatoryDelta[] = [];
}
