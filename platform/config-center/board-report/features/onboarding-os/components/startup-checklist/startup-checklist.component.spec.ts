/**
 * StartupChecklistComponent — spec tests for checklist rendering and behavior.
 * Validates item toggling, progress calculation, category grouping, and empty state.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './startup-checklist.component.ts'), 'utf-8');

describe('StartupChecklistComponent — component creates', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class StartupChecklistComponent');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('declares selector as app-startup-checklist', () => {
    expect(src).toContain("selector: 'app-startup-checklist'");
  });

  it('is a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('accepts items Input with empty default', () => {
    expect(src).toContain('@Input() items: StartupChecklistItem[] = []');
  });

  it('exposes itemCompleted Output event emitter', () => {
    expect(src).toContain('@Output() itemCompleted = new EventEmitter<ChecklistItemCompletedEvent>()');
  });
});

describe('StartupChecklistComponent — item toggling', () => {
  it('defines onToggleItem method to handle checkbox changes', () => {
    expect(src).toContain('onToggleItem(item: StartupChecklistItem, completed: boolean): void');
  });

  it('emits itemCompleted event with itemId and completed state', () => {
    const defIdx = src.indexOf('onToggleItem(item: StartupChecklistItem');
    const method = src.slice(defIdx, defIdx + 200);
    expect(method).toContain('itemCompleted.emit');
    expect(method).toContain('itemId: item.id');
    expect(method).toContain('completed');
  });

  it('exports ChecklistItemCompletedEvent interface with itemId and completed', () => {
    expect(src).toContain('export interface ChecklistItemCompletedEvent');
    expect(src).toContain('itemId: string');
    expect(src).toContain('completed: boolean');
  });

  it('template wires checkbox ngModel to item.isCompleted', () => {
    expect(src).toContain('[ngModel]="item.isCompleted"');
    expect(src).toContain('(ngModelChange)="onToggleItem(item, $event)"');
  });
});

describe('StartupChecklistComponent — progress calculation', () => {
  it('computes completedCount from items with isCompleted=true', () => {
    const computed = src.slice(
      src.indexOf('completedCount = computed'),
      src.indexOf('completedCount = computed') + 150,
    );
    expect(computed).toContain('this.items.filter(i => i.isCompleted).length');
  });

  it('computes progressPct as percentage of completed items', () => {
    const computed = src.slice(
      src.indexOf('progressPct = computed'),
      src.indexOf('progressPct = computed') + 200,
    );
    expect(computed).toContain('Math.round');
    expect(computed).toContain('this.completedCount() / this.items.length');
    expect(computed).toContain('* 100');
  });

  it('returns 0 progress when no items exist', () => {
    const computed = src.slice(
      src.indexOf('progressPct = computed'),
      src.indexOf('progressPct = computed') + 200,
    );
    expect(computed).toContain('this.items.length > 0');
  });

  it('renders progress bar with computed percentage', () => {
    expect(src).toContain('[value]="progressPct()"');
  });

  it('displays completed count text in header', () => {
    expect(src).toContain('{{ completedCount() }}/{{ items.length }} completed');
  });
});

describe('StartupChecklistComponent — category grouping', () => {
  it('computes categoryGroups from items grouped by category', () => {
    expect(src).toContain('categoryGroups = computed<CategoryGroup[]>');
  });

  it('builds groups using Map for stable category order', () => {
    const computed = src.slice(
      src.indexOf('categoryGroups = computed'),
      src.indexOf('categoryGroups = computed') + 500,
    );
    expect(computed).toContain('new Map<string, StartupChecklistItem[]>()');
    expect(computed).toContain('map.get(item.category)');
    expect(computed).toContain('map.set(item.category, existing)');
  });

  it('includes completedCount and totalCount per category group', () => {
    const computed = src.slice(
      src.indexOf('categoryGroups = computed'),
      src.indexOf('categoryGroups = computed') + 500,
    );
    expect(computed).toContain('completedCount: items.filter(i => i.isCompleted).length');
    expect(computed).toContain('totalCount: items.length');
  });

  it('has trackByCategory for ngFor optimization', () => {
    expect(src).toContain('trackByCategory(_index: number, group: CategoryGroup): string');
    expect(src).toContain('return group.category');
  });

  it('renders empty state when items list is empty', () => {
    expect(src).toContain('*ngIf="items.length === 0"');
    expect(src).toContain('No checklist items');
  });

  it('distinguishes required and optional items with badges', () => {
    expect(src).toContain("item.isRequired ? 'Required' : 'Optional'");
    expect(src).toContain("item.isRequired ? 'warning' : 'info'");
  });
});
