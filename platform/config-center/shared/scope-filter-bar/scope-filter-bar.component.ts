/**
 * Scope Filter Bar Component — Reusable filter for dashboard pages.
 *
 * Provides entity, framework, and time-period filters with sessionStorage
 * persistence for cross-page consistency.
 *
 * Requirements: 15.1, 15.2, 15.3
 */

import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';

// ── Exported interfaces ──────────────────────────────────────────────

export interface OrgEntity {
  entityId: string;
  nameEn: string;
  nameAr: string;
  parentId: string | null;
}

export interface ScopeFilter {
  entityId: string | null;
  framework: string | null;
  period: 'last-30d' | 'last-90d' | 'last-1y' | 'all';
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'scope-filter-state';

const DEFAULT_FILTER: ScopeFilter = {
  entityId: null,
  framework: null,
  period: 'last-90d',
};

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-scope-filter-bar',
    imports: [CommonModule, FormsModule, DropdownModule, SelectButtonModule],
    template: `
    <div class="scope-filter-bar" [attr.dir]="i18n.direction()">
      <!-- Entity dropdown -->
      <div class="filter-item">
        <p-dropdown
          [options]="entityOptions"
          [(ngModel)]="selectedEntityId"
          [placeholder]="entityPlaceholder"
          [showClear]="true"
          optionLabel="label"
          optionValue="value"
          styleClass="scope-dropdown"
          [style]="{ 'min-width': '180px' }"
          (onChange)="onFilterChange()"
          [disabled]="entities.length === 0"
          appendTo="body"
        />
      </div>

      <!-- Framework dropdown -->
      <div class="filter-item">
        <p-dropdown
          [options]="frameworkOptions"
          [(ngModel)]="selectedFramework"
          [placeholder]="frameworkPlaceholder"
          [showClear]="true"
          optionLabel="label"
          optionValue="value"
          styleClass="scope-dropdown"
          [style]="{ 'min-width': '180px' }"
          (onChange)="onFilterChange()"
          [disabled]="frameworks.length === 0"
          appendTo="body"
        />
      </div>

      <!-- Period select button -->
      <div class="filter-item">
        <p-selectButton
          [options]="periodOptions"
          [(ngModel)]="selectedPeriod"
          optionLabel="label"
          optionValue="value"
          styleClass="scope-period-btn"
          (onChange)="onFilterChange()"
        />
      </div>
    </div>
  `,
    styles: [`
    .scope-filter-bar {
      display: flex;
      align-items: center;
      gap: var(--space-md, 12px);
      padding: var(--space-sm, 10px) var(--space-md, 16px);
      background: linear-gradient(90deg, var(--surface-card, #ffffff), var(--status-info-bg, #edf5ff));
      border-bottom: 1px solid var(--status-info-border, #bae6fd);
      flex-wrap: wrap;
    }
    .filter-item { flex-shrink: 0; }
  `]
})
export class ScopeFilterBarComponent implements OnInit, OnChanges {
  private _storage = inject(StorageService);
  i18n = inject(I18nService);

  @Input() entities: OrgEntity[] = [];
  @Input() frameworks: string[] = [];
  @Output() filterChange = new EventEmitter<ScopeFilter>();

  selectedEntityId: string | null = null;
  selectedFramework: string | null = null;
  selectedPeriod: ScopeFilter['period'] = 'last-90d';

  entityOptions: { label: string; value: string }[] = [];
  frameworkOptions: { label: string; value: string }[] = [];

  periodOptions = [
    { label: 'Last 30 Days', value: 'last-30d' as const },
    { label: 'Last 90 Days', value: 'last-90d' as const },
    { label: 'Last Year', value: 'last-1y' as const },
    { label: 'All Time', value: 'all' as const },
  ];

  get entityPlaceholder(): string {
    return this.entities.length === 0
      ? this.i18n.translate('scopeFilter.dataUnavailable')
      : this.i18n.translate('scopeFilter.selectEntity');
  }

  get frameworkPlaceholder(): string {
    return this.frameworks.length === 0
      ? this.i18n.translate('scopeFilter.dataUnavailable')
      : this.i18n.translate('scopeFilter.selectFramework');
  }

  ngOnInit(): void {
    this.restoreState();
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entities'] || changes['frameworks']) {
      this.buildOptions();
    }
  }

  onFilterChange(): void {
    const filter = this.buildFilter();
    this.persistState(filter);
    this.filterChange.emit(filter);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private buildFilter(): ScopeFilter {
    return {
      entityId: this.selectedEntityId,
      framework: this.selectedFramework,
      period: this.selectedPeriod,
    };
  }

  private buildOptions(): void {
    const lang = this.i18n.currentLang();
    this.entityOptions = this.entities.map(e => ({
      label: lang === 'ar' ? (e.nameAr || e.nameEn) : (e.nameEn || e.nameAr),
      value: e.entityId,
    }));
    this.frameworkOptions = this.frameworks.map(f => ({
      label: f,
      value: f,
    }));
  }

  private persistState(filter: ScopeFilter): void {
    try {
      this._storage.set(STORAGE_KEY, JSON.stringify(filter));
    } catch { /* sessionStorage unavailable — degrade gracefully */ }
  }

  private restoreState(): void {
    try {
      const raw = this._storage.get(STORAGE_KEY);
      if (raw) {
        const saved: ScopeFilter = JSON.parse(raw);
        this.selectedEntityId = saved.entityId ?? null;
        this.selectedFramework = saved.framework ?? null;
        if (['last-30d', 'last-90d', 'last-1y', 'all'].includes(saved.period)) {
          this.selectedPeriod = saved.period;
        }
      }
    } catch {
      // sessionStorage unavailable — use defaults
    }
  }
}
