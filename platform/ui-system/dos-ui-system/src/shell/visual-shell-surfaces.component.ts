/**
 * Visual shell surface components — Carbon-native (UIShell + Dialog + Tile).
 *
 * Seven prop-driven, standalone components that back the canonical
 * `workspace.shell.*` surfaces resolved through the hybrid-static
 * COMPONENT_MAP. Each component composes IBM Carbon Angular primitives
 * (`cds-header-action`, `cds-sidenav-item`, `[cdsOverflowMenu]`,
 * `cds-overflow-menu-pane`, `cds-overflow-menu-option`) or @dos/ui-system
 * Carbon wrappers (`dos-carbon-tile`) for visible affordances. Hand-rolled
 * `<button>`, `<ul role="menu">`, raw popovers, and bespoke focus/hover
 * styles are forbidden — Carbon owns the *how*, Dynamic UI owns the *what*.
 *
 * Doctrine compliance:
 *   - Render-only. Every label, icon, item list, badge, aria-label, and
 *     action shape arrives via @Input from the resolver-emitted props
 *     bag. NO hardcoded literal, NO i18n fallback, NO local data fetch,
 *     NO non-token CSS values.
 *   - Icon-only controls always emit aria-label.
 *   - Disclosure-style buttons emit aria-haspopup + aria-expanded via
 *     Carbon's `cds-header-action` + `[cdsOverflowMenu]` semantics.
 *   - Navigation flows through Angular Router for ShellAction
 *     {kind:'navigate'}; other action kinds bubble through
 *     dispatchShellAction() to the same shape consumed by ShellHost.
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UIShellModule, DialogModule, ButtonModule } from '../carbon';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import { DosIconComponent } from '../components/icon.component';

let __dosShellMenuIdCounter = 0;
function nextMenuId(prefix: string): string {
  __dosShellMenuIdCounter += 1;
  return `${prefix}-${__dosShellMenuIdCounter}`;
}

export interface ShellSidebarNavItem {
  id: string;
  label: string;
  icon?: string | null;
  action?: { kind: 'navigate'; path: string } | null;
  badge?: string | number | null;
  moduleCode?: string | null;
  groupId?: string | null;
}

export interface ShellAccountMenuEntry {
  id: string;
  i18nKey?: string;
  label?: string;
  ariaLabel?: string | null;
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
  action: { kind: 'navigate'; path: string };
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

// ── Brand (Carbon header__name CSS class) ────────────────────────────
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

// ── Workspace title (Carbon header__menu-bar CSS class) ──────────────
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

// ── User menu (Carbon icon-button + cdsOverflowMenu) ─────────────────
@Component({
  selector: 'dos-shell-user-menu',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedAriaLabel()) {
    <cds-icon-button
      kind="ghost"
      size="lg"
      [description]="resolvedTooltip()"
      [isOpen]="open()"
      [cdsOverflowMenu]="userMenuPane"
      [flip]="true"
      (click)="toggle()"
      [buttonNgClass]="{
        'cds--header__action': true,
        'cds--header__action--active': open()
      }"
      [buttonAttributes]="triggerAttrs()"
      [attr.data-renderer-key]="'shell.user-menu'"
    >
      @if (avatarUri) {
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <image href="{{ avatarUri }}" width="20" height="20" />
        </svg>
      } @else {
        <svg viewBox="0 0 32 32" width="20" height="20"
             aria-hidden="true" focusable="false" fill="currentColor">
          <path d="M16 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 14c5 0 10 2.5 10 7v3H6v-3c0-4.5 5-7 10-7z"/>
        </svg>
      }
    </cds-icon-button>
    <!--
      Carbon directive instantiates its own cds-overflow-menu-pane via
      DialogService when the trigger opens. The projected template MUST
      contain only cds-overflow-menu-option items; wrapping them in another
      cds-overflow-menu-pane creates a second pane with no dialogConfig
      and crashes on placement.split / flip access.
    -->
    <ng-template #userMenuPane>
      @for (entry of menu ?? []; track entry.id) {
        <cds-overflow-menu-option
          [disabled]="entry.enabled === false"
          [type]="entry.destructive ? 'danger' : null"
          [innerClass]="entry.id"
          [attr.data-entry-id]="entry.id"
          [attr.data-action-type]="entry.actionType ? entry.actionType : null"
          [attr.data-route-exists]="entry.routeExists === null || entry.routeExists === undefined ? null : (entry.routeExists ? 'true' : 'false')"
          [attr.aria-label]="entry.ariaLabel || entry.label || entry.i18nKey || null"
          (selected)="activate(entry)"
        >{{ entry.label || entry.i18nKey || entry.id }}</cds-overflow-menu-option>
      }
    </ng-template>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
  `],
})
export class DosShellUserMenuComponent implements OnInit {
  private readonly router = inject(Router);
  @Input() label = '';
  @Input() avatarUri: string | null = null;
  @Input() initials = '';
  @Input() ariaLabel = '';
  @Input() menu: ShellAccountMenuEntry[] | null = [];

  readonly open = signal(false);
  readonly menuId = nextMenuId('dos-shell-user-menu');

  ngOnInit(): void {
    if (!this.resolvedAriaLabel()) {
      // eslint-disable-next-line no-console
      console.warn('[shell.user-menu] MISSING_REQUIRED_PROP ariaLabel — control fail-closed, not rendered');
    }
    // #region agent log
    try {
      // eslint-disable-next-line no-console
      console.info('[DOS_DEBUG] user-menu mounted', { menuLen: (this.menu ?? []).length, ariaLabel: this.resolvedAriaLabel().slice(0, 40) });
    } catch { /* no-op */ }
    // #endregion
  }

  resolvedAriaLabel(): string {
    return this.ariaLabel || this.label || '';
  }

  resolvedTooltip(): string {
    return this.label || this.ariaLabel || '';
  }

  triggerAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {
      'aria-haspopup': 'menu',
      'aria-expanded': this.open() ? 'true' : 'false',
    };
    const aria = this.resolvedAriaLabel();
    if (aria) attrs['aria-label'] = aria;
    if (this.open()) attrs['aria-controls'] = this.menuId;
    return attrs;
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

// ── Settings action (Carbon icon-button) ─────────────────────────────
@Component({
  selector: 'dos-shell-settings-action',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedAriaLabel()) {
    <cds-icon-button
      kind="ghost"
      size="lg"
      [description]="resolvedTooltip()"
      [disabled]="enabled === false"
      (click)="onClick()"
      [buttonNgClass]="{ 'cds--header__action': true }"
      [buttonAttributes]="triggerAttrs()"
      [attr.data-renderer-key]="'shell.settings-action'"
      [attr.data-route-exists]="routeExists === null ? null : (routeExists ? 'true' : 'false')"
    >
      <svg viewBox="0 0 32 32" width="20" height="20"
           aria-hidden="true" focusable="false" fill="currentColor">
        <path d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4.07a2 2 0 0 0-2.31-.92l-2.4.86a11.92 11.92 0 0 0-2.66-1.53L19 2.84A2 2 0 0 0 17 1h-2a2 2 0 0 0-2 1.84l-.55 2.5a11.99 11.99 0 0 0-2.66 1.53l-2.4-.86a2 2 0 0 0-2.32.92L2.7 11a2 2 0 0 0 .38 2.5L5 15.24v1.53l-1.92 1.68A2 2 0 0 0 2.7 21l2.37 4.07a2 2 0 0 0 2.31.92l2.4-.86a11.92 11.92 0 0 0 2.66 1.53L13 29.16A2 2 0 0 0 15 31h2a2 2 0 0 0 2-1.84l.55-2.5a11.99 11.99 0 0 0 2.66-1.53l2.4.86a2 2 0 0 0 2.32-.92L29.3 21a2 2 0 0 0-.38-2.5zM16 22a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/>
      </svg>
    </cds-icon-button>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
  `],
})
export class DosShellSettingsActionComponent implements OnInit {
  private readonly router = inject(Router);
  @Input() label = '';
  @Input() icon = '';
  @Input() ariaLabel = '';
  @Input() action: RawShellAction | null = null;
  @Input() enabled: boolean | null = null;
  @Input() routeExists: boolean | null = null;

  ngOnInit(): void {
    if (!this.resolvedAriaLabel()) {
      // eslint-disable-next-line no-console
      console.warn('[shell.settings-action] MISSING_REQUIRED_PROP ariaLabel — control fail-closed, not rendered');
    }
  }

  resolvedAriaLabel(): string {
    return this.ariaLabel || this.label || '';
  }

  resolvedTooltip(): string {
    return this.label || this.ariaLabel || '';
  }

  triggerAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    const aria = this.resolvedAriaLabel();
    if (aria) attrs['aria-label'] = aria;
    if (this.enabled === false) attrs['aria-disabled'] = 'true';
    return attrs;
  }

  onClick(): void {
    if (this.enabled === false) return;
    dispatchShellAction(this.router, this.action);
  }
}

// ── Global quick actions (command palette + inbox) ───────────────────
@Component({
  selector: 'dos-shell-global-quick-actions',
  standalone: true,
  imports: [CommonModule, ButtonModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasAnyControl()) {
    <div class="dos-shell-global-quick-actions"
         [attr.data-placement]="placement || null"
         [attr.data-renderer-key]="'shell.global-quick-actions'">
      @if (commandSearchAction && resolvedCommandAria()) {
        <span class="dos-shell-global-quick-actions__btn-wrap">
          <cds-icon-button
            kind="ghost"
            size="lg"
            [description]="resolvedCommandTooltip()"
            (click)="onCommandSearch()"
            [buttonNgClass]="{ 'cds--header__action': true }"
            [buttonAttributes]="commandTriggerAttrs()"
          >
            <dos-icon name="search" [size]="20"></dos-icon>
          </cds-icon-button>
        </span>
      }
      @if (inboxAction && resolvedInboxAria()) {
        <span class="dos-shell-global-quick-actions__btn-wrap">
          <cds-icon-button
            kind="ghost"
            size="lg"
            [description]="resolvedInboxTooltip()"
            (click)="onInbox()"
            [buttonNgClass]="{
              'cds--header__action': true,
              'dos-shell-global-quick-actions__inbox--badge': inboxCount > 0
            }"
            [buttonAttributes]="inboxTriggerAttrs()"
            [attr.data-badge-count]="inboxCount > 0 ? inboxCount : null"
          >
            <dos-icon name="notification" [size]="20"></dos-icon>
            @if (inboxCount > 0) {
              <span class="dos-shell-global-quick-actions__badge" aria-hidden="true">
                {{ inboxCount > 99 ? '99+' : inboxCount }}
              </span>
            }
          </cds-icon-button>
        </span>
      }
    </div>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .dos-shell-global-quick-actions {
      display: inline-flex;
      align-items: stretch;
      gap: 0;
    }
    .dos-shell-global-quick-actions__btn-wrap {
      position: relative;
      display: inline-flex;
      align-items: stretch;
    }
    .dos-shell-global-quick-actions__badge {
      position: absolute;
      inset-inline-end: var(--cds-spacing-02);
      inset-block-start: var(--cds-spacing-02);
      min-width: 1rem;
      padding: 0 var(--cds-spacing-02);
      font-size: var(--cds-label-01-font-size);
      line-height: 1rem;
      border-radius: var(--cds-tag-border-radius);
      background-color: var(--cds-support-error);
      color: var(--cds-text-on-color);
    }
  `],
})
export class DosShellGlobalQuickActionsComponent {
  private readonly router = inject(Router);
  @Input() placement = '';
  @Input() commandSearchLabel = '';
  @Input() commandSearchAriaLabel = '';
  @Input() commandSearchAction: RawShellAction | null = null;
  @Input() inboxLabel = '';
  @Input() inboxAriaLabel = '';
  @Input() inboxAction: RawShellAction | null = null;
  @Input() inboxCount = 0;

  hasAnyControl(): boolean {
    return (
      !!(this.commandSearchAction && this.resolvedCommandAria()) ||
      !!(this.inboxAction && this.resolvedInboxAria())
    );
  }

  resolvedCommandAria(): string {
    return this.commandSearchAriaLabel || this.commandSearchLabel || '';
  }

  resolvedCommandTooltip(): string {
    return this.commandSearchLabel || this.commandSearchAriaLabel || '';
  }

  resolvedInboxAria(): string {
    return this.inboxAriaLabel || this.inboxLabel || '';
  }

  resolvedInboxTooltip(): string {
    return this.inboxLabel || this.inboxAriaLabel || '';
  }

  commandTriggerAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    const aria = this.resolvedCommandAria();
    if (aria) attrs['aria-label'] = aria;
    return attrs;
  }

  inboxTriggerAttrs(): Record<string, string> {
    const attrs: Record<string, string> = {};
    const aria = this.resolvedInboxAria();
    if (aria) attrs['aria-label'] = aria;
    return attrs;
  }

  onCommandSearch(): void {
    dispatchShellAction(this.router, this.commandSearchAction);
  }

  onInbox(): void {
    dispatchShellAction(this.router, this.inboxAction);
  }
}

// ── Sidebar nav (Carbon cds-sidenav-item) ────────────────────────────
@Component({
  selector: 'dos-shell-sidebar-nav',
  standalone: true,
  imports: [CommonModule, UIShellModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="cds--side-nav__navigation"
         [attr.aria-label]="ariaLabel || null"
         [attr.data-renderer-key]="'shell.sidebar-nav'">
      @if (items?.length) {
        <ul class="cds--side-nav__items">
          @for (item of items; track item.id) {
            <cds-sidenav-item
              [href]="item.action?.kind === 'navigate' ? item.action.path : ''"
              [title]="item.label"
              [attr.data-nav-id]="item.id"
              [attr.data-module-code]="item.moduleCode || null"
              [class.dos-shell-sidebar-nav__item--active]="isActive(item)"
              [attr.aria-current]="isActive(item) ? 'page' : null"
              (navigation)="onNavigated($event, item)"
            >
              {{ item.label }}
              @if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
                <span class="dos-shell-sidebar-nav__badge" [attr.aria-label]="badgeLabel || null">{{ item.badge }}</span>
              }
            </cds-sidenav-item>
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
    .dos-shell-sidebar-nav__badge {
      margin-inline-start: auto;
      font-size: var(--cds-label-01-font-size);
      color: var(--cds-text-helper);
    }
    :host ::ng-deep .dos-shell-sidebar-nav__item--active .cds--side-nav__link {
      background-color: var(--cds-layer-selected);
      border-inline-start: 3px solid var(--cds-border-interactive);
      color: var(--cds-text-primary);
      font-weight: 600;
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
  private readonly destroyRef = inject(DestroyRef);

  @Input() items: ShellSidebarNavItem[] | null = [];
  @Input() emptyMessage = '';
  @Input() ariaLabel = '';
  @Input() badgeLabel = '';

  /**
   * Current normalized URL signal — drives OnPush re-evaluation of
   * isActive() on every NavigationEnd. Without this signal, the
   * component renders once at mount and never updates the highlighted
   * item when the user navigates between routes.
   */
  private readonly currentUrl = signal<string>(this.normalizePath(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((ev) => this.currentUrl.set(this.normalizePath(ev.urlAfterRedirects ?? ev.url)));
  }

  private normalizePath(url: string): string {
    const q = url.indexOf('?');
    const u = q === -1 ? url : url.slice(0, q);
    const h = u.indexOf('#');
    const v = h === -1 ? u : u.slice(0, h);
    return v.length > 1 && v.endsWith('/') ? v.slice(0, -1) : v;
  }

  /**
   * Active when the navigation path is exactly the current URL or is a
   * canonical prefix (boundary-checked so '/foundation/users' does not
   * match '/foundation/users-archive'). Single canonical mechanism — no
   * label match, no hover, no hardcoded route list.
   */
  isActive(item: ShellSidebarNavItem): boolean {
    const action = item.action;
    if (!action || action.kind !== 'navigate' || !action.path) return false;
    const target = this.normalizePath(action.path);
    const url = this.currentUrl();
    if (url === target) return true;
    return url.startsWith(target + '/');
  }

  onNavigated(_navPromise: Promise<boolean>, item: ShellSidebarNavItem): void {
    if (!item.action || item.action.kind !== 'navigate') return;
    void this.router.navigateByUrl(item.action.path);
  }
}

// ── Module cards (Carbon dos-carbon-tile clickable grid) ─────────────
@Component({
  selector: 'dos-shell-module-cards',
  standalone: true,
  imports: [CommonModule, DosCarbonTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items?.length) {
      <section class="dos-shell-module-cards"
               [attr.aria-label]="ariaLabel || null"
               [attr.data-renderer-key]="'shell.module-cards'">
        <ul class="dos-shell-module-cards__grid">
          @for (item of items; track item.id) {
            <li>
              <dos-carbon-tile
                [clickable]="true"
                [route]="item.action.path"
                (activated)="onActivate($event, item)"
                [attr.data-module-id]="item.id"
              >
                <strong class="dos-shell-module-cards__title">{{ item.title }}</strong>
                @if (item.productCode) {
                  <span class="dos-shell-module-cards__product">{{ item.productCode }}</span>
                }
              </dos-carbon-tile>
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
    .dos-shell-module-cards__title {
      display: block;
      font-size: var(--cds-heading-compact-02-font-size);
      line-height: var(--cds-heading-compact-02-line-height);
    }
    .dos-shell-module-cards__product {
      display: block;
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

  onActivate(ev: MouseEvent, item: ShellModuleCard): void {
    const action = item.action;
    if (!action || action.kind !== 'navigate') return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    void this.router.navigateByUrl(action.path);
  }
}

// ── Catalog widget binder (workspace.action/data/input/nav/polish) ───
// Render-only dynamic shell adapter for contract components that are
// resolved from DB but not part of the core shell.frame/shell.* visuals.
@Component({
  selector: 'dos-shell-catalog-widget',
  standalone: true,
  imports: [CommonModule, DosCarbonTileComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [attr.data-renderer-key]="'shell.catalog-widget'">
      <dos-carbon-tile
        [clickable]="isNavigateAction(action)"
        [route]="routeForAction(action)"
        (activated)="onActivate($event)">
        @if (title) {
          <strong class="dos-shell-catalog-widget__title">{{ title }}</strong>
        }
        @if (subtitle) {
          <p class="dos-shell-catalog-widget__subtitle">{{ subtitle }}</p>
        }
        @if (detail) {
          <p class="dos-shell-catalog-widget__detail">{{ detail }}</p>
        }
        @if (items?.length) {
          <ul class="dos-shell-catalog-widget__list">
            @for (it of items; track $index) {
              <li>{{ it?.label ?? it?.title ?? it?.id ?? '' }}</li>
            }
          </ul>
        }
      </dos-carbon-tile>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .dos-shell-catalog-widget__title {
      display: block;
      font-size: var(--cds-heading-compact-01-font-size);
      line-height: var(--cds-heading-compact-01-line-height);
    }
    .dos-shell-catalog-widget__subtitle,
    .dos-shell-catalog-widget__detail {
      margin: var(--cds-spacing-02) 0 0;
      font-size: var(--cds-body-compact-01-font-size);
      color: var(--cds-text-secondary);
    }
    .dos-shell-catalog-widget__list {
      margin: var(--cds-spacing-03) 0 0;
      padding-inline-start: var(--cds-spacing-05);
    }
  `],
})
export class DosShellCatalogWidgetComponent {
  private readonly router = inject(Router);
  @Input() title = '';
  @Input() subtitle = '';
  @Input() detail = '';
  @Input() items: Array<Record<string, unknown>> | null = null;
  @Input() action: RawShellAction | null = null;

  isNavigateAction(action: RawShellAction | null): action is { kind: 'navigate'; path: string } {
    return !!action && action.kind === 'navigate' && typeof (action as { path?: unknown }).path === 'string';
  }

  routeForAction(action: RawShellAction | null): string {
    return this.isNavigateAction(action) ? action.path : '';
  }

  onActivate(ev: MouseEvent): void {
    if (!this.action) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    dispatchShellAction(this.router, this.action);
  }
}
