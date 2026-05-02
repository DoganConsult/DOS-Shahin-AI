import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/select';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational child component for the Configuration History section
 * of the tenant configuration page. Displays a timeline of configuration
 * changes with filtering and diff expansion.
 */
@Component({
    selector: 'app-tenant-config-history',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, AppDatePipe, ButtonModule, TagModule, DropdownModule],
    template: `
    <div class="sc-card">
      <div class="sc-section-header">
        <div class="sc-section-title-row">
          <h3 class="sc-card-title">{{ i18n.translate('tenantConfig.configurationHistory') }}</h3>
          <p-tag [value]="history.length + ' ' + (i18n.translate('tenantConfig.entries'))" severity="info" />
        </div>
        <p class="sc-card-desc">{{ i18n.translate('tenantConfig.trackConfigurationChangesOverTime') }}</p>
      </div>
      <div class="sc-history-toolbar">
        <p-dropdown [options]="historySectionFilterOptions" [(ngModel)]="historySectionFilter" (onChange)="filterHistory()"
          [placeholder]="i18n.translate('tenantConfig.allSections')" [showClear]="true" styleClass="me-2" appendTo="body" />
        <p-button [label]="i18n.translate('tenantConfig.exportSnapshot')" icon="pi pi-download" severity="secondary" [text]="true" (onClick)="exportConfigSnapshot.emit()" />
      </div>
      <div class="sc-timeline">
        @if (filteredEntries.length === 0) {
          <div class="sc-empty-inline">
            <i class="pi pi-history" style="font-size: var(--font-size-2xl);color:#94a3b8"></i>
            <span>{{ i18n.translate('tenantConfig.noHistoryEntries') }}</span>
          </div>
        } @else {
          @for (h of filteredEntries; track h.version || $index) {
            <div tabindex="0" role="button" (keyup.enter)="toggleHistoryDiff(h)" class="sc-timeline-item" (click)="toggleHistoryDiff(h)">
              <div class="sc-tl-dot" [class.sc-tl-dot-active]="h._expanded"></div>
              <div class="sc-tl-content">
                <div class="sc-tl-header">
                  <span class="sc-tl-version">v{{ h.version }}</span>
                  <span class="sc-tl-date">{{ h.created_at | appDate:'medium' }}</span>
                  <span class="sc-tl-user" *ngIf="h.changed_by">{{ h.changed_by }}</span>
                </div>
                <div class="sc-tl-changed">{{ h.changed_fields || h.section || '--' }}</div>
                @if (h._expanded && h.diff) {
                  <div class="sc-tl-diff">
                    <pre class="sc-diff-pre">{{ h.diff | json }}</pre>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
    styles: [`
    .sc-card{background:var(--surface-card,#fff);border:1px solid var(--surface-border,var(--border-subtle));border-radius:var(--radius-lg);padding:24px;display:flex;flex-direction:column;gap:16px}
    .sc-section-header{display:flex;flex-direction:column;gap:4px;margin-bottom:4px}
    .sc-section-title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
    .sc-card-title{margin:0;font-size:17px;font-weight:700;color:var(--text-heading,#111)}
    .sc-card-desc{margin:0;font-size:var(--font-size-sm);color:var(--text-muted,var(--text-muted))}
    .sc-history-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .sc-timeline{display:flex;flex-direction:column;gap:0}
    .sc-timeline-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--surface-border);cursor:pointer;transition:background .15s}
    .sc-timeline-item:hover{background:var(--surface-50)}
    .sc-tl-dot{width:12px;height:12px;border-radius:var(--radius-pill);background:var(--surface-border);margin-top:4px;flex-shrink:0;transition:background .15s}
    .sc-tl-dot-active{background:var(--primary)}
    .sc-tl-content{flex:1;min-width:0}
    .sc-tl-header{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
    .sc-tl-version{font-weight:700;font-size:var(--font-size-sm);color:var(--text-heading)}
    .sc-tl-date{font-size:var(--font-size-sm);color:var(--text-muted)}
    .sc-tl-user{font-size:var(--font-size-sm);color:var(--primary-600)}
    .sc-tl-changed{font-size:var(--font-size-sm);color:var(--text-color-secondary);margin-top:2px}
    .sc-tl-diff{margin-top:8px;padding:10px;background:var(--surface-ground);border-radius:var(--radius);border:1px solid var(--surface-border)}
    .sc-diff-pre{margin:0;font-size:var(--font-size-sm);white-space:pre-wrap;word-break:break-word;font-family:monospace;color:var(--text-color-secondary)}
    .sc-empty-inline{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;color:var(--text-muted);font-size:var(--font-size-sm)}
    .me-2{margin-inline-end:8px}
  `]
})
export class TenantConfigHistoryComponent {
  /** Full history entries array */
  @Input() history: GrcRecord[] = [];
  /** Options for the section filter dropdown */
  @Input() historySectionFilterOptions: { label: string; value: string }[] = [];

  @Output() exportConfigSnapshot = new EventEmitter<void>();

  /** Current section filter value */
  historySectionFilter: string | null = null;

  constructor(public i18n: I18nService) {}

  /** Computed filtered history based on section filter */
  get filteredEntries(): GrcRecord[] {
    if (!this.historySectionFilter) return this.history;
    return this.history.filter(h =>
      (h.section || h.changed_fields || '').toLowerCase().includes(this.historySectionFilter!.toLowerCase())
    );
  }

  /** Re-trigger filtering (called on dropdown change) */
  filterHistory(): void {
    // Filtering is handled reactively via the getter; this exists for the dropdown onChange binding
  }

  /** Toggle expanded state to show/hide diff for a history entry */
  toggleHistoryDiff(h: GrcRecord): void {
    h._expanded = !h._expanded;
  }
}
