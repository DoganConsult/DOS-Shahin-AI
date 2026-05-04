/**
 * Phase WS-2 + Carbon-Wiring — workspace.sidebar wrapper.
 * Selector: dos-workspace-sidebar
 * Carbon primitive: ui-shell (UIShellModule → cds-sidenav + cds-sidenav-menu + cds-sidenav-item)
 * DB: dos.dynamic_ui_component_registry component_key='workspace.sidebar' carbon_key='ui-shell'
 *
 * Token stack:
 *   --cds-side-nav-*     (Carbon UI-Shell nav tokens)
 *   --shell-nav-active-bg (structural alias → cds-background-selected)
 *   kpi-count-enter       (badge pop animation — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
  computed, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UIShellModule } from 'carbon-components-angular';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';
import { DosIconComponent } from '../components/icon.component';
import type { WorkspaceNavItem } from './workspace-shell.contracts';

@Component({
  selector: 'dos-workspace-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UIShellModule, DosCarbonTagComponent, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav
      [expanded]="!collapsed"
      [attr.aria-label]="ariaLabel || null"
      [attr.dir]="dir"
      data-testid="dos-workspace-sidebar"
    >
      @for (group of groupedItems(); track group.group) {
        @if (group.group && group.items.length) {
          <!-- Named group → cds-sidenav-menu (collapsible group) -->
          <cds-sidenav-menu [title]="group.group" [expanded]="isGroupExpanded(group.group)">
            @for (item of group.items; track item.id) {
              <cds-sidenav-item
                [routerLink]="item.route ? [item.route] : null"
                routerLinkActive="dos-sidebar-item--active"
                [attr.data-nav-id]="item.id"
                (selected)="navigate.emit(item)"
              >
                <!-- Icon before label (Carbon sidenav supports leading icon via slot) -->
                <span class="dos-sidebar-item-inner">
                  @if (item.icon && !collapsed) {
                    <dos-icon class="dos-sidebar-icon" [name]="item.icon" [size]="16"></dos-icon>
                  }
                  <span class="dos-sidebar-label">
                    {{ item.label.fallback ?? item.label.i18nKey }}
                  </span>
                  @if (item.badgeCount && item.badgeCount > 0 && !collapsed) {
                    <dos-carbon-tag type="blue" size="sm" class="dos-sidebar-badge">
                      {{ item.badgeCount > 99 ? '99+' : item.badgeCount }}
                    </dos-carbon-tag>
                  }
                </span>
              </cds-sidenav-item>
            }
          </cds-sidenav-menu>
        } @else {
          <!-- Ungrouped items → flat cds-sidenav-item -->
          @for (item of group.items; track item.id) {
            <cds-sidenav-item
              [routerLink]="item.route ? [item.route] : null"
              routerLinkActive="dos-sidebar-item--active"
              [attr.data-nav-id]="item.id"
              (selected)="navigate.emit(item)"
            >
              <span class="dos-sidebar-item-inner">
                @if (item.icon) {
                  <dos-icon class="dos-sidebar-icon" [name]="item.icon" [size]="16"></dos-icon>
                }
                @if (!collapsed) {
                  <span class="dos-sidebar-label">
                    {{ item.label.fallback ?? item.label.i18nKey }}
                  </span>
                  @if (item.badgeCount && item.badgeCount > 0) {
                    <dos-carbon-tag type="blue" size="sm" class="dos-sidebar-badge">
                      {{ item.badgeCount > 99 ? '99+' : item.badgeCount }}
                    </dos-carbon-tag>
                  }
                }
              </span>
            </cds-sidenav-item>
          }
        }
      }

      <!-- Sidebar footer: brand attribution -->
      @if (!collapsed) {
        <div class="dos-sidebar-footer">
          <span class="dos-sidebar-footer__text">Powered by Dogan-AI OS</span>
        </div>
      }
    </cds-sidenav>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    /* ── Item inner layout ───────────────────────────── */
    .dos-sidebar-item-inner {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      width: 100%;
      min-width: 0;
    }

    .dos-sidebar-icon {
      flex: 0 0 auto;
      color: var(--cds-icon-secondary, #525252);
      transition: color 0.12s;
    }

    /* Active item: Carbon sets .cds--side-nav__link--current but we also
       handle routerLinkActive class for programmatic activation */
    :host ::ng-deep .dos-sidebar-item--active .cds--side-nav__link,
    :host ::ng-deep .cds--side-nav__link--current {
      background: var(--shell-nav-active-bg, var(--cds-background-selected, #e0e0e0));
      border-inline-start: 3px solid var(--cds-border-interactive, #0f62fe);
      color: var(--cds-text-primary, #161616);
      font-weight: 600;
    }

    :host ::ng-deep .dos-sidebar-item--active .dos-sidebar-icon,
    :host ::ng-deep .cds--side-nav__link--current .dos-sidebar-icon {
      color: var(--cds-link-primary, #0f62fe);
    }

    .dos-sidebar-label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Badge ────────────────────────────────────────── */
    .dos-sidebar-badge {
      margin-inline-start: auto;
      flex: 0 0 auto;
      animation: kpi-count-enter 0.2s ease-out both;
    }

    @keyframes kpi-count-enter {
      0%   { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* ── Footer ──────────────────────────────────────── */
    .dos-sidebar-footer {
      margin-block-start: auto;
      padding: var(--cds-spacing-03, 0.5rem) var(--cds-spacing-05, 1rem);
      border-block-start: 1px solid var(--cds-border-subtle-00, #e0e0e0);
    }

    .dos-sidebar-footer__text {
      font-size: 0.6875rem;
      color: var(--cds-text-disabled, #c6c6c6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `],
})
export class DosWorkspaceSidebarComponent {
  @Input() items: WorkspaceNavItem[] = [];
  @Input() collapsed = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() ariaLabel: string | null = null;
  @Output() navigate = new EventEmitter<WorkspaceNavItem>();

  private expandedGroups = signal<Set<string>>(new Set());

  groupedItems(): Array<{ group: string; items: WorkspaceNavItem[] }> {
    const out = new Map<string, WorkspaceNavItem[]>();
    for (const it of this.items) {
      const g = it.group ?? '';
      if (!out.has(g)) out.set(g, []);
      out.get(g)!.push(it);
    }
    return [...out.entries()].map(([group, items]) => ({ group, items }));
  }

  isGroupExpanded(group: string): boolean {
    // Default: all groups expanded; collapses on user action (future)
    return !this.expandedGroups().has(`collapsed:${group}`);
  }
}
