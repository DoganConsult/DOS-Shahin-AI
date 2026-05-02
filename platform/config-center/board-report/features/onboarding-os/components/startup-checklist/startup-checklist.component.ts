import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';

/**
 * Startup checklist item as received from the onboarding API.
 * Each item belongs to a category and may be required or optional.
 */
export interface StartupChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

/** Emitted when the user marks an item as completed. */
export interface ChecklistItemCompletedEvent {
  itemId: string;
  completed: boolean;
}

interface CategoryGroup {
  category: string;
  items: StartupChecklistItem[];
  completedCount: number;
  totalCount: number;
}

/**
 * StartupChecklist - Renders a grouped checklist of startup tasks
 * with progress tracking, required/optional badges, and an empty state.
 *
 * Part of the Onboarding-OS module (MP-01).
 */
@Component({
  selector: 'app-startup-checklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ButtonModule,
    CheckboxModule,
    ProgressBarModule,
    TagModule,
    FormsModule,
  ],
  template: `
    <!-- Empty state -->
    <div class="checklist-empty" *ngIf="items.length === 0">
      <i class="pi pi-inbox"></i>
      <h3>No checklist items</h3>
      <p>There are no startup checklist items to display.</p>
    </div>

    <div class="startup-checklist" *ngIf="items.length > 0">
      <!-- Progress header -->
      <div class="checklist-header">
        <div class="checklist-progress-info">
          <span class="checklist-progress-label">
            {{ completedCount() }}/{{ items.length }} completed
          </span>
          <span class="checklist-progress-pct">{{ progressPct() }}%</span>
        </div>
        <p-progressBar
          [value]="progressPct()"
          [showValue]="false"
          [style]="{ height: '8px', 'border-radius': '4px' }"
        />
        <div class="checklist-legend">
          <span class="legend-item legend-required">
            <i class="pi pi-exclamation-circle"></i> Required
          </span>
          <span class="legend-item legend-optional">
            <i class="pi pi-info-circle"></i> Optional
          </span>
        </div>
      </div>

      <!-- Category groups -->
      <div
        *ngFor="let group of categoryGroups(); trackBy: trackByCategory"
        class="checklist-category"
      >
        <div class="category-header">
          <h3 class="category-title">{{ group.category }}</h3>
          <span class="category-count">
            {{ group.completedCount }}/{{ group.totalCount }}
          </span>
        </div>

        <div
          *ngFor="let item of group.items; trackBy: trackByItem"
          class="checklist-item"
          [class.item-completed]="item.isCompleted"
        >
          <div class="item-checkbox">
            <p-checkbox
              [binary]="true"
              [ngModel]="item.isCompleted"
              (ngModelChange)="onToggleItem(item, $event)"
              [inputId]="'chk-' + item.id"
            />
          </div>
          <div class="item-content">
            <label [for]="'chk-' + item.id" class="item-title">
              {{ item.title }}
            </label>
            <p class="item-description">{{ item.description }}</p>
            <div class="item-meta" *ngIf="item.isCompleted && item.completedAt">
              <span class="meta-completed">
                <i class="pi pi-check"></i>
                Completed {{ item.completedAt | date:'medium' }}
              </span>
              <span class="meta-by" *ngIf="item.completedBy">
                by {{ item.completedBy }}
              </span>
            </div>
          </div>
          <div class="item-badge">
            <p-tag
              [value]="item.isCompleted ? 'Done' : item.isRequired ? 'Required' : 'Optional'"
              [severity]="item.isCompleted ? 'success' : item.isRequired ? 'warning' : 'info'"
            />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Empty state */
    .checklist-empty {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-secondary);
    }
    .checklist-empty i {
      font-size: 2.5rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }
    .checklist-empty h3 {
      font-size: var(--font-size-lg, 1.125rem);
      font-weight: 600;
      color: var(--text-heading);
      margin: 0 0 0.25rem;
    }
    .checklist-empty p {
      font-size: var(--font-size-body-sm, 0.875rem);
      margin: 0;
    }

    /* Container */
    .startup-checklist {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 780px;
    }

    /* Progress header */
    .checklist-header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .checklist-progress-info {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .checklist-progress-label {
      font-size: var(--font-size-body-sm, 0.875rem);
      font-weight: 600;
      color: var(--text-heading);
    }
    .checklist-progress-pct {
      font-size: var(--font-size-2xl, 1.5rem);
      font-weight: 800;
      color: var(--primary);
    }
    .checklist-legend {
      display: flex;
      gap: 1rem;
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--text-muted);
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .legend-required i { color: var(--warning, #ef6c00); }
    .legend-optional i { color: var(--info, #1976d2); }

    /* Category groups */
    .checklist-category {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-subtle, #e5e7eb);
    }
    .category-title {
      font-size: var(--font-size-body-md, 1rem);
      font-weight: 700;
      color: var(--text-heading);
      margin: 0;
    }
    .category-count {
      font-size: var(--font-size-xs, 0.75rem);
      font-weight: 600;
      color: var(--text-muted);
      background: var(--surface-50, #f9fafb);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-pill, 20px);
    }

    /* Individual items */
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius, 6px);
      background: var(--surface-50, #f9fafb);
      transition: background 200ms, opacity 200ms;
    }
    .checklist-item.item-completed {
      background: rgba(36, 161, 72, 0.04);
      opacity: 0.85;
    }
    .checklist-item:hover {
      background: var(--surface-100, #f3f4f6);
    }

    .item-checkbox {
      padding-top: 0.1rem;
      flex-shrink: 0;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }
    .item-title {
      font-size: var(--font-size-body-sm, 0.875rem);
      font-weight: 600;
      color: var(--text-heading);
      cursor: pointer;
      display: block;
      margin: 0;
    }
    .item-completed .item-title {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .item-description {
      font-size: var(--font-size-caption, 0.8rem);
      color: var(--text-secondary);
      margin: 0.15rem 0 0;
      line-height: 1.4;
    }
    .item-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.3rem;
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--text-muted);
    }
    .meta-completed i {
      font-size: var(--font-size-2xs, 0.7rem);
      color: var(--success, #24a148);
      margin-right: 0.2rem;
    }

    .item-badge {
      flex-shrink: 0;
      padding-top: 0.1rem;
    }
  `],
})
export class StartupChecklistComponent {
  /** Full list of checklist items to render. */
  @Input() items: StartupChecklistItem[] = [];

  /** Emitted when the user toggles an item's completion state. */
  @Output() itemCompleted = new EventEmitter<ChecklistItemCompletedEvent>();

  /** Number of completed items. */
  completedCount = computed(() =>
    this.items.filter(i => i.isCompleted).length,
  );

  /** Progress percentage (0-100). */
  progressPct = computed(() =>
    this.items.length > 0
      ? Math.round((this.completedCount() / this.items.length) * 100)
      : 0,
  );

  /** Items grouped by category with per-group completion counts. */
  categoryGroups = computed<CategoryGroup[]>(() => {
    const map = new Map<string, StartupChecklistItem[]>();
    for (const item of this.items) {
      const existing = map.get(item.category) || [];
      existing.push(item);
      map.set(item.category, existing);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
      completedCount: items.filter(i => i.isCompleted).length,
      totalCount: items.length,
    }));
  });

  /** Handles checkbox toggle and emits the itemCompleted event. */
  onToggleItem(item: StartupChecklistItem, completed: boolean): void {
    this.itemCompleted.emit({ itemId: item.id, completed });
  }

  trackByCategory(_index: number, group: CategoryGroup): string {
    return group.category;
  }

  trackByItem(_index: number, item: StartupChecklistItem): string {
    return item.id;
  }
}
