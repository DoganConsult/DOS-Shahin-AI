import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnInit, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FoundationApiService } from '../services/foundation-api.service';

/**
 * Foundation org-chart navigator component.
 *
 * Side-panel navigator that lets users browse the organizational hierarchy
 * (departments, business units, teams) and select an entity to view.
 * Emits a `selected` signal consumed by sibling canvas or detail panels.
 *
 * This is a standalone component consumed by the Foundation shell.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-foundation-org-navigator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="org-navigator" aria-label="Organisation Navigator">
      <div class="nav-search">
        <input
          type="search"
          [(ngModel)]="searchTerm"
          placeholder="Search departments, teams…"
          class="nav-search-input"
          aria-label="Search organisations"
          (input)="onSearch()"
        />
      </div>

      @if (loading()) {
        <div class="nav-loading">
          <span class="pi pi-spin pi-spinner" aria-hidden="true"></span>
        </div>
      } @else if (error()) {
        <div class="nav-error" role="alert">{{ error() }}</div>
      } @else {
        <ul class="nav-list" role="list">
          @for (dept of filteredDepartments(); track dept['department_id'] ?? dept['id']) {
            <li
              class="nav-item"
              [class.selected]="selectedId() === (dept['department_id'] ?? dept['id'])"
              role="listitem"
              (click)="select(dept)"
              (keydown.enter)="select(dept)"
              tabindex="0"
            >
              <span class="pi pi-building nav-icon" aria-hidden="true"></span>
              <span>{{ dept['name_en'] ?? dept['name'] }}</span>
            </li>
          }
          @if (!filteredDepartments().length) {
            <li class="nav-empty">No results.</li>
          }
        </ul>
      }
    </nav>
  `,
  styles: [`
    .org-navigator { display: flex; flex-direction: column; height: 100%; }
    .nav-search { padding: 0.75rem; border-bottom: 1px solid var(--surface-border, #e5e7eb); }
    .nav-search-input {
      width: 100%; padding: 0.5rem 0.75rem; border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: 0.375rem; font-size: 0.875rem;
    }
    .nav-loading, .nav-error, .nav-empty {
      padding: 1rem; color: var(--text-secondary, #6b7280); font-size: 0.875rem;
    }
    .nav-error { color: var(--color-error, #dc2626); }
    .nav-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1rem; cursor: pointer; font-size: 0.875rem;
      border-bottom: 1px solid var(--surface-border, #e5e7eb);
    }
    .nav-item:hover, .nav-item:focus { background: var(--surface-hover, #f3f4f6); outline: none; }
    .nav-item.selected { background: var(--primary-50, #eff6ff); font-weight: 500; }
    .nav-icon { color: var(--text-secondary, #6b7280); font-size: 0.875rem; }
  `],
})
export class FoundationOrgNavigatorComponent implements OnInit {
  private readonly api = inject(FoundationApiService);
  readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedId = signal<string | null>(null);

  private departments: Record<string, unknown>[] = [];
  readonly filteredDepartments = signal<Record<string, unknown>[]>([]);

  searchTerm = '';

  ngOnInit(): void {
    this.loadDepartments();
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.filteredDepartments.set(this.departments);
    } else {
      this.filteredDepartments.set(
        this.departments.filter((d) => {
          const name = String(d['name_en'] ?? d['name'] ?? '').toLowerCase();
          return name.includes(term);
        }),
      );
    }
    this.cdr.markForCheck();
  }

  select(dept: Record<string, unknown>): void {
    const id = String(dept['department_id'] ?? dept['id'] ?? '');
    this.selectedId.set(id);
    this.cdr.markForCheck();
  }

  private loadDepartments(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getDepartments().subscribe({
      next: (res) => {
        const rows = (Array.isArray(res?.departments) ? res.departments : (res?.rows ?? [])) as Record<string, unknown>[];
        this.departments = rows;
        this.filteredDepartments.set(rows);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
