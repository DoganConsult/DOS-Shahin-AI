/**
 * Phase WS-2 — workspace.sidebar wrapper.
 * Selector: dos-workspace-sidebar
 * Carbon primitive: SideNav (composes ui-shell carbon_key).
 * Mobile_mode: hidden (replaced by dos-mobile-bottom-nav at ≤480px).
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { WorkspaceNavItem } from './workspace-shell.contracts';

@Component({
  selector: 'dos-workspace-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-workspace-sidebar"
         [class.dos-workspace-sidebar--collapsed]="collapsed"
         [attr.dir]="dir"
         aria-label="Primary"
         data-testid="dos-workspace-sidebar">
      @for (group of groupedItems(); track group.group) {
        @if (group.group) { <div class="dos-workspace-sidebar__group">{{ group.group }}</div> }
        @for (item of group.items; track item.id) {
          <button type="button"
                  class="dos-workspace-sidebar__item"
                  [class.dos-workspace-sidebar__item--active]="item.active"
                  [attr.data-nav-id]="item.id"
                  (click)="navigate.emit(item)">
            @if (item.icon) { <span class="dos-workspace-sidebar__icon" aria-hidden="true">{{ item.icon }}</span> }
            <span class="dos-workspace-sidebar__label">{{ item.label.fallback ?? item.label.i18nKey }}</span>
            @if (item.badgeCount) {
              <span class="dos-workspace-sidebar__badge" data-cds-component="tag">{{ item.badgeCount }}</span>
            }
          </button>
        }
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .dos-workspace-sidebar { display: flex; flex-direction: column; gap: .25rem; padding: .5rem 0; }
    .dos-workspace-sidebar--collapsed .dos-workspace-sidebar__label { display: none; }
    .dos-workspace-sidebar__group { padding: .5rem 1rem; font-size: .75rem; color: var(--cds-text-secondary, #6f6f6f); text-transform: uppercase; }
    .dos-workspace-sidebar__item { display: flex; gap: .5rem; align-items: center; padding: .5rem 1rem; border: 0; background: transparent; cursor: pointer; text-align: start; }
    .dos-workspace-sidebar__item--active { background: var(--cds-layer-selected, #e0e0e0); font-weight: 600; }
    .dos-workspace-sidebar__badge { margin-inline-start: auto; }
  `],
})
export class DosWorkspaceSidebarComponent {
  @Input() items: WorkspaceNavItem[] = [];
  @Input() collapsed = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Output() navigate = new EventEmitter<WorkspaceNavItem>();

  groupedItems(): Array<{ group: string; items: WorkspaceNavItem[] }> {
    const out = new Map<string, WorkspaceNavItem[]>();
    for (const it of this.items) {
      const g = it.group ?? '';
      if (!out.has(g)) out.set(g, []);
      out.get(g)!.push(it);
    }
    return [...out.entries()].map(([group, items]) => ({ group, items }));
  }
}
