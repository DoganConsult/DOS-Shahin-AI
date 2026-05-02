/**
 * GRC Data Table Component
 *
 * Standardized table shell that composes loading (skeleton), empty state,
 * export, and toolbar concerns around a projected p-table. Provides a
 * consistent wrapper for all data table views in the GRC platform.
 *
 * Usage:
 * ```typescript
 * <grc-data-table
 *   title="Controls"
 *   [totalRecords]="controls.length"
 *   [loading]="isLoading"
 *   [showExport]="true"
 *   exportFilename="controls"
 *   emptyMessage="No controls found">
 *   <div tableToolbar>
 *     <input pInputText placeholder="Search..." />
 *   </div>
 *   <p-table [value]="controls" [paginator]="true" [rows]="20">
 *     ...columns...
 *   </p-table>
 * </grc-data-table>
 * ```
 */
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from '../guided-interaction/skeleton-loader.component';
import { EmptyStateComponent } from '../layouts/primitives/empty-state.component';
import { ExportButtonComponent } from './export-button.component';

@Component({
    selector: 'grc-data-table',
    imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent, ExportButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="grc-table-shell">
      <!-- Header row: title + toolbar + export -->
      <div class="grc-table-shell__header" *ngIf="title || showExport">
        <h3 *ngIf="title" class="grc-table-shell__title">{{ title }}</h3>
        <div class="grc-table-shell__toolbar">
          <ng-content select="[tableToolbar]"></ng-content>
        </div>
        <app-export-button
          *ngIf="showExport"
          [module]="exportFilename"
          label="Export"
          [data]="[]">
        </app-export-button>
      </div>

      <!-- Loading state -->
      <app-skeleton-loader
        *ngIf="loading"
        variant="list"
        [count]="rows">
      </app-skeleton-loader>

      <!-- Empty state (shown when not loading and no records) -->
      <app-empty-state
        *ngIf="!loading && totalRecords === 0"
        [title]="emptyMessage"
        [description]="'Adjust your filters or create a new record to get started.'">
      </app-empty-state>

      <!-- Projected table content (visible when not loading and has records) -->
      <div class="grc-table-shell__content" *ngIf="!loading && totalRecords > 0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
    styles: [`
    .grc-table-shell {
      background: var(--surface);
      border-radius: var(--radius-md, 8px);
      padding: var(--space-lg, 24px);
      border: 1px solid var(--border);
    }

    .grc-table-shell__header {
      display: flex;
      align-items: center;
      gap: var(--space-md, 16px);
      margin-bottom: var(--space-lg, 24px);
      flex-wrap: wrap;
    }

    .grc-table-shell__title {
      font-size: var(--font-size-lg, 1.125rem);
      font-weight: 600;
      color: var(--text-heading);
      margin: 0;
      white-space: nowrap;
    }

    .grc-table-shell__toolbar {
      flex: 1;
      display: flex;
      align-items: center;
      gap: var(--space-sm, 8px);
    }

    .grc-table-shell__content {
      overflow-x: auto;
    }

    /* Ensure projected p-table fills available width */
    .grc-table-shell__content .p-datatable {
      width: 100%;
    }
  `]
})
export class GrcDataTableComponent {
  /** Title displayed in the table header */
  @Input() title = '';

  /** Total number of records (used to toggle empty state) */
  @Input() totalRecords = 0;

  /** Whether the table data is currently loading */
  @Input() loading = false;

  /** Number of skeleton rows to display during loading */
  @Input() rows = 20;

  /** Message shown when the table has no records */
  @Input() emptyMessage = 'No records found';

  /** Icon variant for the empty state */
  @Input() emptyIcon = 'inbox';

  /** Whether to show the export button in the header */
  @Input() showExport = false;

  /** Filename/module identifier passed to the export button */
  @Input() exportFilename = 'export';
}
