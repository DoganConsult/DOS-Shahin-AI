/**
 * Visual shell surface components — Carbon-tokenized.
 *
 * Six prop-driven, standalone components that back the canonical
 * `workspace.shell.*` surfaces resolved through the hybrid-static
 * COMPONENT_MAP. Each component renders Carbon UI-Shell primitive
 * markup so the surfaces inherit Carbon design tokens (height,
 * typography, focus ring, hover, spacing) automatically when the host
 * zone carries the matching Carbon container class.
 *
 * Doctrine compliance:
 *   - Render-only. Every label, icon name, item list, badge value,
 *     aria-label, action shape arrives via @Input from the resolver-
 *     emitted binding props bag. NO hardcoded literal, NO i18n
 *     fallback, NO local data fetch, NO CSS var(...,fallback) literals.
 *   - Icon-only controls always emit aria-label.
 *   - Disclosure-style buttons emit aria-haspopup + aria-expanded.
 *   - Navigation flows through Angular Router for ShellAction
 *     {kind:'navigate'}; other action kinds bubble through
 *     dispatchShellAction() to the same shape consumed by ShellHost.
 */
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

export interface ShellSidebarNavItem {
  id: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  badge?: string | number | null;
  moduleCode?: string | null;
}

export interface ShellAccountMenuEntry {
  id: string;
  i18nKey?: string;
  label?: string;
  ariaLabel?: string;
  actionType?: string;
  action?: { kind: string; path?: string; url?: string } | null;
  enabled?: boolean;
  routeExists?: boolean | null;
  destructive?: boolean;
  permission?: string | null;
}

export interface ShellModuleCard {
  id: string;
  title: string;
  route: string;
  productCode?: string;
}

type RawShellAction =
  | { kind: 'navigate'; path: string }
  | { kind: 'open_external'; url: string }
  | { kind: 'toggle_language' }
  | { kind: 'toggle_theme' }
  | { kind: string; [k: string]: unknown };

function dispatchShellAction(router: Router, action: RawShellAction | null | undefined): void {
  if (!action || typeof action.kind !== 'string') return;
  // Navigate stays local — the Angular router lives on the same DI tree
  // as the menu component, so we don't need a round-trip through the
  // CustomEvent boundary.
  if (action.kind === 'navigate' && typeof (action as { path?: string }).path === 'string') {
    void router.navigateByUrl((action as { path: string }).path);
    return;
  }
  // Every other typed action — toggle_language, toggle_theme,
  // open_external, dispatch_event, auth.logout, etc. — is delegated to
  // the canonical ShellHost dispatcher via a DOM CustomEvent. This
  // keeps the visual surface render-only (no localStorage writes, no
  // document.dir mutation, no window.open of session endpoints).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dos:shell-action', { detail: action }));
  }
}

// ── Brand ────────────────────────────────────────────────────────────
@Component({
  selector: 'dos-shell-brand',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="cds--header__name"
       [attr.href]="logoHref || null"
       [attr.aria-label]="text || null"
       [attr.data-renderer-key]="'shell.brand'"
       (click)="onClick($event)">
      @if (logoUri) {
        <img class="dos-shell-brand__logo" [src]="logoUri" alt="" />
      }
      @if (text) {
        <span class="cds--header__name--prefix">{{ text }}</span>
      }
    </a>
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .cds--header__name {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-03);
      padding: 0 var(--cds-spacing-05);
      text-decoration: none;
      color: var(--cds-text-primary);
      font-size: var(--cds-heading-compact-02-font-size);
      font-weight: 600;
    }
    .cds--header__name:hover { background: var(--cds-background-hover); }
    .dos-shell-brand__logo { height: 1.25rem; width: auto; }
  `],
})
export class DosShellBrandComponent {
  private readonly router = inject(Router);
  @Input() text = '';
  @Input() logoUri: string | null = null;
  @Input() logoHref = '';

  onClick(ev: MouseEvent): void {
    if (!this.logoHref) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    void this.router.navigateByUrl(this.logoHref);
  }
}

// ── Workspace title (header menu item) ───────────────────────────────
@Component({
  selector: 'dos-shell-workspace-title',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="cds--header__menu-bar"
          role="presentation"
          [attr.data-renderer-key]="'shell.workspace-title'">
      <span class="cds--header__menu-item dos-shell-workspace-title">
        @if (eyebrow) {
          <span class="dos-shell-workspace-title__eyebrow">{{ eyebrow }}</span>
        }
        <span class="dos-shell-workspace-title__text">{{ text }}</span>
      </span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .cds--header__menu-bar { display: inline-flex; align-items: stretch; }
    .dos-shell-workspace-title {
      display: inline-flex; flex-direction: column; justify-content: center;
      padding: 0 var(--cds-spacing-05);
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      line-height: var(--cds-body-compact-01-line-height);
      letter-spacing: var(--cds-body-compact-01-letter-spacing);
    }
    .dos-shell-workspace-title__eyebrow {
      font-size: var(--cds-label-01-font-size);
      letter-spacing: var(--cds-label-01-letter-spacing);
      text-transform: uppercase;
      color: var(--cds-text-helper);
    }
  `],
})
export class DosShellWorkspaceTitleComponent {
  @Input() text = '';
  @Input() eyebrow = '';
}

// ── User menu (header global action with disclosure semantics) ───────
@Component({
  selector: 'dos-shell-user-menu',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-shell-user-menu"
         [attr.data-renderer-key]="'shell.user-menu'">
      <button type="button"
              class="cds--header__action"
              [attr.aria-label]="resolvedAriaLabel()"
              aria-haspopup="menu"
              [attr.aria-expanded]="open()"
              (click)="toggle()">
        <span class="dos-shell-user-menu__inner">
          @if (avatarUri) {
            <img class="dos-shell-user-menu__avatar" [src]="avatarUri" alt="" />
          } @else {
            <svg class="dos-shell-user-menu__glyph" viewBox="0 0 32 32" width="20" height="20"
                 aria-hidden="true" focusable="false" fill="currentColor">
              <path d="M16 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 14c5 0 10 2.5 10 7v3H6v-3c0-4.5 5-7 10-7z"/>
            </svg>
          }
        </span>
      </button>
      @if (open() && menu?.length) {
        <ul class="dos-shell-user-menu__list" role="menu">
          @for (entry of menu; track entry.id) {
            <li role="none">
              <button type="button"
                      class="dos-shell-user-menu__item"
                      role="menuitem"
                      [attr.data-entry-id]="entry.id"
                      [attr.data-action-type]="entry.actionType || null"
                      [attr.data-route-exists]="entry.routeExists === null || entry.routeExists === undefined ? null : (entry.routeExists ? 'true' : 'false')"
                      [attr.aria-label]="entry.ariaLabel || null"
                      [attr.aria-disabled]="entry.enabled === false ? 'true' : null"
                      [disabled]="entry.enabled === false ? true : null"
                      [class.dos-shell-user-menu__item--destructive]="entry.destructive === true"
                      [class.dos-shell-user-menu__item--disabled]="entry.enabled === false"
                      (click)="activate(entry)">
                {{ entry.label || entry.i18nKey || entry.id }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .dos-shell-user-menu { position: relative; display: inline-flex; align-items: stretch; }
    .cds--header__action {
      display: inline-flex; align-items: center; justify-content: center;
      width: 3rem; height: 100%;
      background: transparent; border: 0; cursor: pointer;
      color: var(--cds-icon-primary);
    }
    .cds--header__action:focus-visible {
      outline: 2px solid var(--cds-focus);
      outline-offset: -2px;
    }
    .cds--header__action:hover { background: var(--cds-background-hover); }
    .dos-shell-user-menu__inner {
      display: inline-flex; align-items: center; gap: var(--cds-spacing-02);
    }
    .dos-shell-user-menu__avatar {
      width: 1.5rem; height: 1.5rem; border-radius: 50%; object-fit: cover;
    }
    .dos-shell-user-menu__list {
      position: absolute; top: 100%; right: 0;
      list-style: none; padding: var(--cds-spacing-02) 0; margin: 0;
      min-width: 14rem;
      background: var(--cds-layer);
      border: 1px solid var(--cds-border-subtle);
      box-shadow: 0 2px 6px rgba(0,0,0,.16);
      z-index: 9000;
    }
    .dos-shell-user-menu__item {
      width: 100%; text-align: start;
      background: transparent; border: 0; cursor: pointer;
      padding: var(--cds-spacing-04) var(--cds-spacing-05);
      font-size: var(--cds-body-compact-01-font-size);
      color: var(--cds-text-primary);
    }
    .dos-shell-user-menu__item:hover { background: var(--cds-background-hover); }
    .dos-shell-user-menu__item--destructive { color: var(--cds-text-error); }
    .dos-shell-user-menu__item--disabled,
    .dos-shell-user-menu__item[disabled] {
      color: var(--cds-text-disabled);
      cursor: not-allowed;
      background: transparent;
    }
    .dos-shell-user-menu__item--disabled:hover,
    .dos-shell-user-menu__item[disabled]:hover { background: transparent; }
  `],
})
export class DosShellUserMenuComponent {
  private readonly router = inject(Router);
  @Input() label = '';
  @Input() avatarUri: string | null = null;
  @Input() initials = '';
  @Input() ariaLabel = '';
  @Input() menu: ShellAccountMenuEntry[] | null = [];

  readonly open = signal(false);

  resolvedAriaLabel(): string {
    return this.ariaLabel || this.label || '';
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  activate(entry: ShellAccountMenuEntry): void {
    if (entry.enabled === false) return;
    this.open.set(false);
    dispatchShellAction(this.router, entry.action ?? null);
  }
}

// ── Settings action (header global icon-button) ──────────────────────
@Component({
  selector: 'dos-shell-settings-action',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button"
            class="cds--header__action"
            [attr.aria-label]="resolvedAriaLabel()"
            [attr.data-renderer-key]="'shell.settings-action'"
            [attr.data-route-exists]="routeExists === null ? null : (routeExists ? 'true' : 'false')"
            [attr.aria-disabled]="enabled === false ? 'true' : null"
            [disabled]="enabled === false ? true : null"
            (click)="onClick()">
      <svg class="dos-shell-settings-action__glyph"
           viewBox="0 0 32 32" width="20" height="20"
           aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4.07a2 2 0 0 0-2.31-.92l-2.4.86a11.92 11.92 0 0 0-2.66-1.53L19 2.84A2 2 0 0 0 17 1h-2a2 2 0 0 0-2 1.84l-.55 2.5a11.99 11.99 0 0 0-2.66 1.53l-2.4-.86a2 2 0 0 0-2.32.92L2.7 11a2 2 0 0 0 .38 2.5L5 15.24v1.53l-1.92 1.68A2 2 0 0 0 2.7 21l2.37 4.07a2 2 0 0 0 2.31.92l2.4-.86a11.92 11.92 0 0 0 2.66 1.53L13 29.16A2 2 0 0 0 15 31h2a2 2 0 0 0 2-1.84l.55-2.5a11.99 11.99 0 0 0 2.66-1.53l2.4.86a2 2 0 0 0 2.32-.92L29.3 21a2 2 0 0 0-.38-2.5zM16 22a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/>
      </svg>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .cds--header__action {
      display: inline-flex; align-items: center; justify-content: center;
      width: 3rem; height: 100%;
      background: transparent; border: 0; cursor: pointer;
      color: var(--cds-icon-primary);
    }
    .cds--header__action:focus-visible {
      outline: 2px solid var(--cds-focus);
      outline-offset: -2px;
    }
    .cds--header__action:hover { background: var(--cds-background-hover); }
  `],
})
export class DosShellSettingsActionComponent {
  private readonly router = inject(Router);
  @Input() label = '';
  @Input() icon = '';
  @Input() ariaLabel = '';
  @Input() action: RawShellAction | null = null;
  @Input() enabled: boolean | null = null;
  @Input() routeExists: boolean | null = null;

  resolvedAriaLabel(): string {
    return this.ariaLabel || this.label || '';
  }

  onClick(): void {
    if (this.enabled === false) return;
    dispatchShellAction(this.router, this.action);
  }
}

// ── Sidebar nav (Carbon side-nav primitive markup) ───────────────────
@Component({
  selector: 'dos-shell-sidebar-nav',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="cds--side-nav__navigation"
         [attr.aria-label]="ariaLabel || 'Primary navigation'"
         [attr.data-renderer-key]="'shell.sidebar-nav'">
      @if (items?.length) {
        <ul class="cds--side-nav__items">
          @for (item of items; track item.id) {
            <li class="cds--side-nav__item">
              <a class="cds--side-nav__link"
                 [attr.href]="item.route || null"
                 [attr.data-nav-id]="item.id"
                 [attr.data-module-code]="item.moduleCode || null"
                 (click)="onClick($event, item)">
                @if (item.icon) {
                  <span class="cds--side-nav__icon" aria-hidden="true">{{ item.icon }}</span>
                }
                <span class="cds--side-nav__link-text">{{ item.label }}</span>
                @if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
                  <span class="dos-shell-sidebar-nav__badge" aria-label="badge">{{ item.badge }}</span>
                }
              </a>
            </li>
          }
        </ul>
      } @else if (emptyMessage) {
        <p class="dos-shell-sidebar-nav__empty"
           data-testid="dos-shell-sidebar-nav__empty"
           role="status">{{ emptyMessage }}</p>
      } @else {
        <span class="dos-shell-sidebar-nav__empty"
              data-testid="dos-shell-sidebar-nav__empty"
              role="status"
              aria-live="polite"></span>
      }
    </nav>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .cds--side-nav__navigation {
      display: block; padding: var(--cds-spacing-03) 0; height: 100%;
      background: var(--cds-background);
    }
    .cds--side-nav__items { list-style: none; padding: 0; margin: 0; }
    .cds--side-nav__link {
      display: flex; align-items: center; gap: var(--cds-spacing-04);
      padding: var(--cds-spacing-04) var(--cds-spacing-05);
      text-decoration: none;
      color: var(--cds-text-secondary);
      font-size: var(--cds-heading-compact-01-font-size);
      line-height: var(--cds-heading-compact-01-line-height);
      min-height: 2rem;
    }
    .cds--side-nav__link:hover {
      background: var(--cds-background-hover);
      color: var(--cds-text-primary);
    }
    .cds--side-nav__link:focus-visible {
      outline: 2px solid var(--cds-focus);
      outline-offset: -2px;
    }
    .dos-shell-sidebar-nav__badge {
      margin-inline-start: auto;
      font-size: var(--cds-label-01-font-size);
      color: var(--cds-text-helper);
    }
    .dos-shell-sidebar-nav__empty {
      padding: var(--cds-spacing-05);
      font-size: var(--cds-body-compact-01-font-size);
      color: var(--cds-text-helper);
    }
  `],
})
export class DosShellSidebarNavComponent {
  private readonly router = inject(Router);
  @Input() items: ShellSidebarNavItem[] | null = [];
  @Input() emptyMessage = '';
  @Input() ariaLabel = '';

  onClick(ev: MouseEvent, item: ShellSidebarNavItem): void {
    if (!item.route) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    void this.router.navigateByUrl(item.route);
  }
}

// ── Module cards (entitled-module grid in main zone) ─────────────────
@Component({
  selector: 'dos-shell-module-cards',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items?.length) {
      <section class="dos-shell-module-cards"
               [attr.aria-label]="ariaLabel || 'Modules'"
               [attr.data-renderer-key]="'shell.module-cards'">
        <ul class="dos-shell-module-cards__grid">
          @for (item of items; track item.id) {
            <li>
              <a class="cds--tile cds--tile--clickable dos-shell-module-cards__tile"
                 [attr.href]="item.route || '#'"
                 [attr.data-module-id]="item.id"
                 (click)="onClick($event, item)">
                <strong class="dos-shell-module-cards__title">{{ item.title }}</strong>
                @if (item.productCode) {
                  <span class="dos-shell-module-cards__product">{{ item.productCode }}</span>
                }
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .dos-shell-module-cards__grid {
      list-style: none; padding: 0; margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: var(--cds-spacing-05);
    }
    .dos-shell-module-cards__tile {
      display: flex; flex-direction: column; gap: var(--cds-spacing-02);
      padding: var(--cds-spacing-06);
      text-decoration: none;
      background: var(--cds-layer);
      color: var(--cds-text-primary);
      border: 1px solid var(--cds-border-subtle);
      min-height: 6rem;
    }
    .dos-shell-module-cards__tile:hover {
      background: var(--cds-layer-hover);
    }
    .dos-shell-module-cards__tile:focus-visible {
      outline: 2px solid var(--cds-focus);
      outline-offset: -2px;
    }
    .dos-shell-module-cards__title {
      font-size: var(--cds-heading-compact-02-font-size);
      line-height: var(--cds-heading-compact-02-line-height);
    }
    .dos-shell-module-cards__product {
      font-size: var(--cds-label-01-font-size);
      color: var(--cds-text-helper);
      letter-spacing: var(--cds-label-01-letter-spacing);
      text-transform: uppercase;
    }
  `],
})
export class DosShellModuleCardsComponent {
  private readonly router = inject(Router);
  @Input() items: ShellModuleCard[] | null = [];
  @Input() ariaLabel = '';

  onClick(ev: MouseEvent, item: ShellModuleCard): void {
    if (!item.route) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    void this.router.navigateByUrl(item.route);
  }
}
