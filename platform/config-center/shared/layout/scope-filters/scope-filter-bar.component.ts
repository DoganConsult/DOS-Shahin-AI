import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MultiSelectModule } from 'primeng/multiselect';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StorageService } from '@app/infrastructure';

export interface ScopeDimension {
  scope_id: string;
  workspace_id: string;
  dimension_type: string;
  name: string;
  parent_scope_id: string | null;
  created_at: string;
}

export interface ScopeSelection {
  [dimensionType: string]: string[];
}

const STORAGE_KEY = 'grc_scope_selection';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-scope-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule],
  template: `
    <div class="scope-filter-bar" *ngIf="dimensionGroups.length > 0">
      <div class="scope-filter-item" *ngFor="let group of dimensionGroups">
        <p-multiSelect
          [options]="group.options"
          [(ngModel)]="selection[group.type]"
          [optionLabel]="'name'"
          [optionValue]="'scope_id'"
          [placeholder]="group.type | titlecase"
          [maxSelectedLabels]="2"
          [selectedItemsLabel]="'{0} selected'"
          [style]="{'min-width': '160px'}"
          styleClass="scope-multiselect"
          (onChange)="onSelectionChange()">
        </p-multiSelect>
      </div>
      <button aria-label="Filter" class="clear-btn" *ngIf="hasSelection" (click)="clearAll()">
        <i class="pi pi-filter-slash"></i>
      </button>
    </div>
  `,
  styles: [`
    .scope-filter-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      background: linear-gradient(90deg, #ffffff, var(--status-info-bg, #edf5ff));
      border-bottom: 1px solid #bae6fd;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .scope-filter-bar::-webkit-scrollbar { display: none; }
    .scope-filter-item { flex-shrink: 0; }
    .clear-btn {
      display: flex; align-items: center; justify-content: center;
      padding: 6px; background: transparent; border: 1px solid #bae6fd;
      color: var(--text-muted); border-radius: var(--radius); cursor: pointer;
      transition: all 150ms; flex-shrink: 0;
    }
    .clear-btn:hover { background: #e0f2fe; color: #0369a1; }
  `],
})
export class ScopeFilterBarComponent implements OnInit, OnChanges {
  private _storage = inject(StorageService);
  @Input() workspaceId: string | null = null;
  @Output() scopeChange = new EventEmitter<ScopeSelection>();

  dimensionGroups: { type: string; options: ScopeDimension[] }[] = [];
  selection: ScopeSelection = {};

  private api = environment.apiUrl;

  constructor(private http: HttpClient, public i18n: I18nService) {}

  ngOnInit(): void {
    this.restoreSelection();
    if (this.workspaceId) {
      this.loadScopes();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workspaceId'] && !changes['workspaceId'].firstChange) {
      this.clearAll();
      this.loadScopes();
    }
  }

  get hasSelection(): boolean {
    return Object.values(this.selection).some(ids => ids.length > 0);
  }

  get selectedScopeIds(): string[] {
    return Object.values(this.selection).flat();
  }

  onSelectionChange(): void {
    this.persistSelection();
    this.scopeChange.emit({ ...this.selection });
  }

  clearAll(): void {
    this.selection = {};
    for (const group of this.dimensionGroups) {
      this.selection[group.type] = [];
    }
    this.persistSelection();
    this.scopeChange.emit({ ...this.selection });
  }

  private loadScopes(): void {
    if (!this.workspaceId) {
      this.dimensionGroups = [];
      return;
    }

    this.http
      .get<{ scopes: ScopeDimension[]; count: number }>(
        `${this.api}/workspaces/${this.workspaceId}/scopes`
      )
      .subscribe({
        next: (res) => {
          const scopes = res.scopes || [];
          const grouped = new Map<string, ScopeDimension[]>();
          for (const scope of scopes) {
            const group = grouped.get(scope.dimension_type) || [];
            group.push(scope);
            grouped.set(scope.dimension_type, group);
          }
          this.dimensionGroups = Array.from(grouped.entries()).map(
            ([type, options]) => ({ type, options })
          );
          // Initialize selection keys
          for (const group of this.dimensionGroups) {
            if (!this.selection[group.type]) {
              this.selection[group.type] = [];
            }
          }
        },
        error: () => {
          this.dimensionGroups = [];
        },
      });
  }

  private persistSelection(): void {
    try {
      this._storage.set(STORAGE_KEY, JSON.stringify(this.selection));
    } catch { /* ignore */ }
  }

  private restoreSelection(): void {
    try {
      const stored = this._storage.get(STORAGE_KEY, 'session');
      if (stored) {
        this.selection = JSON.parse(stored);
      }
    } catch {
      this.selection = {};
    }
  }

}
