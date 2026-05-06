/**
 * Phase WS-2 + Carbon-Wiring — workspace.sidebar wrapper.
 * Selector: dos-workspace-sidebar
 * Carbon primitive: ui-shell (UIShellModule → cds-sidenav + cds-sidenav-menu + cds-sidenav-item)
 * DB: dos.dynamic_ui_component_registry component_key=workspace.sidebar carbon_key=ui-shell
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
                    {{ item.label?.fallback ?? item.label?.i18nKey ?? '' }}
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
                    {{ item.label?.fallback ?? item.label?.i18nKey ?? '' }}
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

    /* ──────────────────────────────────────────────────────────────────
     * Phase F-F12 — defloat the Carbon side-nav.
     * ------------------------------------------------------------------
     * Carbon's <cds-sidenav> ships with \`position: fixed; inset-block-start: 3rem;
     * width: 16rem; z-index: 8000\`, designed for the "shell host" pattern
     * where the side-nav floats over content from the left edge of the
     * viewport. In our grid-based <dos-app-shell> the sidebar is a grid
     * cell — the Carbon defaults caused it to render as a floating
     * popover at the top-right of the page (RTL) and overlap the masthead.
     *
     * Override here forces the inner Carbon DOM to behave like a normal
     * static block element so the parent grid takes over positioning.
     * Mobile drawer wraps this same component — there the override is
     * harmless because <dos-mobile-drawer> establishes its own portal
     * with explicit positioning.
     * ────────────────────────────────────────────────────────────────── */
    :host ::ng-deep .cds--side-nav,
    :host ::ng-deep .cds--side-nav__navigation {
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      max-width: 100% !important;
      height: 100% !important;
      z-index: auto !important;
      box-shadow: none !important;
      transform: none !important;
    }

    /* ── Item inner layout ───────────────────────────── */
    .dos-sidebar-item-inner {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      width: 100%;
      min-width: 0;
    }

    .dos-sidebar-icon {
      flex: 0 0 auto;
      color: var(--cds-icon-secondary);
      transition: color 0.12s;
    }

    /* Active item: Carbon sets .cds--side-nav__link--current but we also
       handle routerLinkActive class for programmatic activation */
    :host ::ng-deep .dos-sidebar-item--active .cds--side-nav__link,
    :host ::ng-deep .cds--side-nav__link--current {
      background: var(--shell-nav-active-bg));
      border-inline-start: var(--dos-sidebar-active-border-width) solid var(--cds-border-interactive);
      color: var(--cds-text-primary);
      font-weight: 600;
    }

    :host ::ng-deep .dos-sidebar-item--active .dos-sidebar-icon,
    :host ::ng-deep .cds--side-nav__link--current .dos-sidebar-icon {
      color: var(--cds-link-primary);
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
      padding: var(--cds-spacing-03) var(--cds-spacing-05);
      border-block-start: 1px solid var(--cds-border-subtle-00);
    }

    .dos-sidebar-footer__text {
      font-size: 0.6875rem;
      color: var(--cds-text-disabled);
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
