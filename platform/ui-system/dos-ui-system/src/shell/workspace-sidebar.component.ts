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
import { DosIconComponent } from '../components/icon.component';
import type { WorkspaceNavItem } from './workspace-shell.contracts';

@Component({
  selector: 'dos-workspace-sidebar',
  standalone: true,
  imports: [CommonModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-workspace-sidebar"
         [class.dos-workspace-sidebar--collapsed]="collapsed"
         [attr.dir]="dir"
         [attr.aria-label]="ariaLabel || null"
         data-testid="dos-workspace-sidebar">
      @for (group of groupedItems(); track group.group) {
        @if (group.group && !collapsed) {
          <div class="dos-workspace-sidebar__group">{{ group.group }}</div>
        }
        @for (item of group.items; track item.id) {
          <button type="button"
                  class="dos-workspace-sidebar__item"
                  [class.dos-workspace-sidebar__item--active]="item.active"
                  [attr.aria-current]="item.active ? 'page' : null"
                  [attr.title]="collapsed ? (item.label.fallback ?? item.label.i18nKey) : null"
                  [attr.data-nav-id]="item.id"
                  (click)="navigate.emit(item)">
            @if (item.icon) {
              <dos-icon class="dos-workspace-sidebar__icon"
                        [name]="item.icon"
                        [size]="20"></dos-icon>
            }
            @if (!collapsed) {
              <span class="dos-workspace-sidebar__label">
                {{ item.label.fallback ?? item.label.i18nKey }}
              </span>
              @if (item.badgeCount && item.badgeCount > 0) {
                <span class="dos-workspace-sidebar__badge"
                      data-cds-component="tag">{{ item.badgeCount }}</span>
              }
            }
          </button>
        }
      }
    </nav>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .dos-workspace-sidebar { display: flex; flex-direction: column; gap: .125rem; padding: .5rem 0; }
    .dos-workspace-sidebar--collapsed .dos-workspace-sidebar__item { justify-content: center; padding: .5rem; }
    .dos-workspace-sidebar__group {
      padding: .75rem 1rem .25rem; font-size: .6875rem; font-weight: 600;
      color: var(--cds-text-secondary, #6f6f6f); text-transform: uppercase; letter-spacing: .04em;
    }
    .dos-workspace-sidebar__item {
      display: flex; gap: .75rem; align-items: center; padding: .5rem 1rem;
      border: 0; background: transparent; cursor: pointer; text-align: start;
      width: 100%; color: var(--cds-text-primary, #161616);
      border-inline-start: 3px solid transparent;
      transition: background .12s, border-color .12s;
    }
    .dos-workspace-sidebar__item:hover { background: var(--cds-layer-hover, #e8e8e8); }
    .dos-workspace-sidebar__item--active {
      background: var(--cds-layer-selected, #e0e0e0);
      border-inline-start-color: var(--cds-link-primary, #0f62fe);
      font-weight: 600;
    }
    .dos-workspace-sidebar__icon { color: var(--cds-icon-primary, #161616); flex: 0 0 auto; }
    .dos-workspace-sidebar__label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dos-workspace-sidebar__badge {
      margin-inline-start: auto; font-size: .75rem; padding: 0 .5rem; border-radius: 999px;
      background: var(--cds-tag-background-blue, #d0e2ff); color: var(--cds-tag-color-blue, #0043ce);
    }
  `],
})
export class DosWorkspaceSidebarComponent {
  @Input() items: WorkspaceNavItem[] = [];
  @Input() collapsed = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() ariaLabel: string | null = null;
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
