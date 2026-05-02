/**
 * SoD Filter Bar — Dumb sub-component
 * Renders search input, severity/type dropdowns, and action buttons for SoD conflicts filtering.
 * Emits filter changes and action triggers to the parent.
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-sod-filter-bar',
    imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, DropdownModule, ExportButtonComponent],
    template: `
    <div class="page-toolbar">
      <div class="toolbar-primary">
        <p-button
          [label]="i18n.translate('Run Detection')"
          icon="pi pi-search"
          (onClick)="runDetection.emit()"
          [loading]="detecting" />
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input
            type="text"
            pInputText
            [ngModel]="searchTerm"
            [placeholder]="i18n.translate('Search...')"
            (ngModelChange)="searchTermChange.emit($event)"
            class="search-input" />
        </div>
        <p-dropdown
          [ngModel]="filterSeverity"
          [options]="severityOptions"
          [placeholder]="i18n.translate('All Severities')"
          (onChange)="filterSeverityChange.emit($event.value)"
          styleClass="filter-dropdown" />
        <p-dropdown
          [ngModel]="filterType"
          [options]="typeOptions"
          [placeholder]="i18n.translate('All Types')"
          (onChange)="filterTypeChange.emit($event.value)"
          styleClass="filter-dropdown" />
      </div>
      <div class="toolbar-secondary">
        <p-button
          [label]="i18n.translate('Bulk Resolve')"
          icon="pi pi-check"
          (onClick)="bulkResolve.emit()"
          [disabled]="selectedCount === 0"
          styleClass="p-button-success" />
        <app-export-button
          module="sod-conflicts"
          [data]="exportData" />
      </div>
    </div>
  `,
    styles: [`
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 8px; }
    .toolbar-primary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .toolbar-secondary { display: flex; align-items: center; gap: 8px; }
    .search-wrap { position: relative; display: inline-flex; align-items: center; }
    .search-icon { position: absolute; inset-inline-start: 10px; color: var(--text-muted); font-size: var(--font-size-sm); z-index: var(--z-base); pointer-events: none; }
    .search-input { min-width: 200px; padding-inline-start: 32px; }
    .filter-dropdown { min-width: 150px; }
  `]
})
export class SodFilterBarComponent {
  readonly i18n = inject(I18nService);

  @Input() searchTerm = '';
  @Input() filterSeverity: string | null = null;
  @Input() filterType: string | null = null;
  @Input() detecting = false;
  @Input() selectedCount = 0;
  @Input() exportData: unknown[] = [];
  @Input() severityOptions: { label: string; value: string | null }[] = [];
  @Input() typeOptions: { label: string; value: string | null }[] = [];

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() filterSeverityChange = new EventEmitter<string | null>();
  @Output() filterTypeChange = new EventEmitter<string | null>();
  @Output() runDetection = new EventEmitter<void>();
  @Output() bulkResolve = new EventEmitter<void>();
}
