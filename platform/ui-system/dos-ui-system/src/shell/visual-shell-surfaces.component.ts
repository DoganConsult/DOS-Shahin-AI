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
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UIShellModule } from '../carbon';
import { TilesModule } from 'carbon-components-angular';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import { DosCarbonHeaderActionComponent } from '../carbon/dos-carbon-header-action.component';
import {
  DosCarbonContextMenuComponent,
  type DosCarbonContextMenuItem,
} from '../carbon/dos-carbon-context-menu.component';
import { DosIconComponent } from '../components/icon.component';
import { ShellStateService, type ShellMenuId } from './shell-state.service';

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

export interface ShellSidebarNavGroup {
  moduleCode: string;
  groupId: string;
  sortOrder?: number | null;
  label?: { i18nKey?: string; fallback?: string; label?: string } | null;
}

export interface ShellSidebarNavModule {
  moduleCode: string;
  sortOrder?: number | null;
  label?: { i18nKey?: string; fallback?: string; label?: string } | null;
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

// User menu — Carbon-native disclosure menu backed by ShellOverlayService.
//
// Composition (ZERO raw HTML controls — Dynamic UI decides WHAT, Carbon
// decides HOW):
//   • Trigger : <dos-carbon-header-action>  → Carbon UIShell `cds-header-action`
//               (renders a Carbon-owned icon button, exposes [active] +
//               (selected); we project the avatar/identity SVG slot).
//   • Panel   : <cds-context-menu>          → Carbon menu surface
//               ([open] = ShellState.isMenuOpen('profile')); renders
//               role="menu" via the Carbon component itself.
//   • Item    : <cds-context-menu-item>     → Carbon menu item
//               ([label], [disabled], [danger], (itemClick)).
//
// Doctrine: a single ShellOverlayService owns "which overlay is open".
// At most one overlay may be open at a time; opening one closes any
// other. Click-outside and Escape are wired in the service via the
// `data-shell-overlay-trigger` (host-bound on the action) and
// `data-shell-overlay` (host-bound on the menu) attributes — those are
// what the central pointer-down guard scopes against.
//
// We deliberately do NOT use Carbon's [cdsOverflowMenu] directive: it
// mounts its pane via DialogService into document.body, anchors it via
// floating-ui to the directive's elementRef, and owns its own open/close
// state — three behaviours that fight ShellOverlayService coordination
// and the Carbon UIShell layout grid. The cds-context-menu surface lives
// inline inside the trigger's relative-positioned anchor, so RTL is a
// native logical-property flip and z-index is owned by the panel.
@Component({
  selector: 'dos-shell-user-menu',
  standalone: true,
  imports: [CommonModule, DosCarbonHeaderActionComponent, DosCarbonContextMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedAriaLabel()) {
    <span class="dos-shell-user-menu" [attr.data-renderer-key]="'shell.user-menu'">
      <dos-carbon-header-action
        class="dos-shell-user-menu__trigger"
        [description]="resolvedTooltip()"
        [active]="isOpen()"
        [attr.aria-label]="resolvedAriaLabel()"
        [attr.aria-haspopup]="'menu'"
        [attr.aria-expanded]="isOpen() ? 'true' : 'false'"
        [attr.aria-controls]="isOpen() ? menuId : null"
        [attr.data-shell-overlay-trigger]="overlayId"
        (selected)="toggle()"
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
      </dos-carbon-header-action>
      <dos-carbon-context-menu
        class="dos-shell-user-menu__panel"
        size="md"
        [open]="isOpen()"
        [items]="menuItems()"
        [id]="menuId"
        [attr.aria-label]="resolvedAriaLabel()"
        [attr.data-shell-overlay]="overlayId"
        (selected)="onMenuSelected($event)"
      ></dos-carbon-context-menu>
    </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .dos-shell-user-menu {
      position: relative;
      display: inline-flex; align-items: stretch; height: 100%;
    }
    .dos-shell-user-menu__trigger { display: inline-flex; align-items: stretch; height: 100%; }
    /*
     * cds-context-menu binds inline style.left.px/style.top.px from its
     * [position] Input (default {0,0}); to anchor it under the trigger
     * we override those inline styles with logical-property CSS using
     * !important. Carbon's cds--menu CSS already supplies position:
     * absolute, surface tokens, focus ring, and keyboard navigation —
     * we only re-anchor + raise z-index for the shell layer.
     */
    .dos-shell-user-menu__panel {
      inset-block-start: 100% !important;
      inset-inline-end: 0 !important;
      inset-inline-start: auto !important;
      top: auto !important;
      left: auto !important;
      min-inline-size: 13rem;
      z-index: var(--shell-z-overlay);
    }
  `],
})
export class DosShellUserMenuComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly state = inject(ShellStateService);
  @Input() label = '';
  @Input() avatarUri: string | null = null;
  @Input() initials = '';
  @Input() ariaLabel = '';
  @Input() menu: ShellAccountMenuEntry[] | null = [];

  readonly overlayId: ShellMenuId = 'profile';
  readonly menuId = nextMenuId('dos-shell-user-menu');

  isOpen(): boolean {
    return this.state.isMenuOpen(this.overlayId);
  }

  ngOnInit(): void {
    if (!this.resolvedAriaLabel()) {
      // eslint-disable-next-line no-console
      console.warn('[shell.user-menu] MISSING_REQUIRED_PROP ariaLabel — control fail-closed, not rendered');
    }
  }

  resolvedAriaLabel(): string {
    return this.ariaLabel || this.label || '';
  }

  resolvedTooltip(): string {
    return this.label || this.ariaLabel || '';
  }

  toggle(): void {
    this.state.toggleMenu(this.overlayId);
  }

  // Maps the resolver-emitted entries into the Carbon-wrapper item shape.
  // Original entry is kept on `data` so the (selected) handler can
  // re-resolve disabled-state, action, and `closeMenuFor` semantics.
  menuItems(): DosCarbonContextMenuItem[] {
    return (this.menu ?? []).map((entry) => ({
      id: entry.id,
      label: entry.label || entry.i18nKey || entry.id,
      disabled: entry.enabled === false,
      danger: !!entry.destructive,
      ariaLabel: entry.ariaLabel || entry.label || entry.i18nKey || null,
      data: { entry },
    }));
  }

  onMenuSelected(item: DosCarbonContextMenuItem): void {
    const entry = (item.data?.['entry'] as ShellAccountMenuEntry | undefined) ?? null;
    if (!entry) return;
    this.activate(entry);
  }

  activate(entry: ShellAccountMenuEntry): void {
    if (entry.enabled === false) return;
    this.state.closeMenuFor(this.overlayId);
    dispatchShellAction(this.router, entry.action ?? null);
  }
}

// Settings action — Carbon-native single-action OR disclosure menu.
//
// Behaviour split on the emitted contract:
//   • `menu` items present  → <dos-carbon-header-action> trigger +
//     <cds-context-menu> panel anchored under the gear icon. Backed by
//     ShellOverlayService with id 'settings' (cannot coexist with the
//     profile menu).
//   • no `menu` items       → single-action click that dispatches
//     `action`. The trigger stays Carbon-native; we just don't mount a
//     panel and (selected) goes straight to dispatchShellAction.
@Component({
  selector: 'dos-shell-settings-action',
  standalone: true,
  imports: [CommonModule, DosCarbonHeaderActionComponent, DosCarbonContextMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (resolvedAriaLabel()) {
    <span class="dos-shell-settings-action" [attr.data-renderer-key]="'shell.settings-action'">
      <dos-carbon-header-action
        class="dos-shell-settings-action__trigger"
        [description]="resolvedTooltip()"
        [active]="hasMenu() && isOpen()"
        [attr.aria-label]="resolvedAriaLabel()"
        [attr.aria-haspopup]="hasMenu() ? 'menu' : null"
        [attr.aria-expanded]="hasMenu() ? (isOpen() ? 'true' : 'false') : null"
        [attr.aria-controls]="hasMenu() && isOpen() ? menuId : null"
        [attr.aria-disabled]="enabled === false ? 'true' : null"
        [attr.data-shell-overlay-trigger]="hasMenu() ? overlayId : null"
        [attr.data-route-exists]="routeExists === null ? null : (routeExists ? 'true' : 'false')"
        (selected)="onTriggerClick()"
      >
        <svg viewBox="0 0 32 32" width="20" height="20"
             aria-hidden="true" focusable="false" fill="currentColor">
          <path d="M27 16.76v-1.53l1.92-1.68A2 2 0 0 0 29.3 11l-2.36-4.07a2 2 0 0 0-2.31-.92l-2.4.86a11.92 11.92 0 0 0-2.66-1.53L19 2.84A2 2 0 0 0 17 1h-2a2 2 0 0 0-2 1.84l-.55 2.5a11.99 11.99 0 0 0-2.66 1.53l-2.4-.86a2 2 0 0 0-2.32.92L2.7 11a2 2 0 0 0 .38 2.5L5 15.24v1.53l-1.92 1.68A2 2 0 0 0 2.7 21l2.37 4.07a2 2 0 0 0 2.31.92l2.4-.86a11.92 11.92 0 0 0 2.66 1.53L13 29.16A2 2 0 0 0 15 31h2a2 2 0 0 0 2-1.84l.55-2.5a11.99 11.99 0 0 0 2.66-1.53l2.4.86a2 2 0 0 0 2.32-.92L29.3 21a2 2 0 0 0-.38-2.5zM16 22a6 6 0 1 1 6-6 6 6 0 0 1-6 6z"/>
        </svg>
      </dos-carbon-header-action>
      @if (hasMenu()) {
        <dos-carbon-context-menu
          class="dos-shell-settings-action__panel"
          size="md"
          [open]="isOpen()"
          [items]="menuItems()"
          [id]="menuId"
          [attr.aria-label]="resolvedAriaLabel()"
          [attr.data-shell-overlay]="overlayId"
          (selected)="onMenuSelected($event)"
        ></dos-carbon-context-menu>
      }
    </span>
    }
  `,
  styles: [`
    :host { display: inline-flex; align-items: stretch; height: 100%; }
    .dos-shell-settings-action {
      position: relative;
      display: inline-flex; align-items: stretch; height: 100%;
    }
    .dos-shell-settings-action__trigger { display: inline-flex; align-items: stretch; height: 100%; }
    /* Same anchor override as the user-menu — see that block. */
    .dos-shell-settings-action__panel {
      inset-block-start: 100% !important;
      inset-inline-end: 0 !important;
      inset-inline-start: auto !important;
      top: auto !important;
      left: auto !important;
      min-inline-size: 13rem;
      z-index: var(--shell-z-overlay);
    }
  `],
})
export class DosShellSettingsActionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly state = inject(ShellStateService);
  @Input() label = '';
  @Input() icon = '';
  @Input() ariaLabel = '';
  @Input() action: RawShellAction | null = null;
  @Input() enabled: boolean | null = null;
  @Input() routeExists: boolean | null = null;
  @Input() menu: ShellAccountMenuEntry[] | null = null;

  readonly overlayId: ShellMenuId = 'settings';
  readonly menuId = nextMenuId('dos-shell-settings');

  hasMenu(): boolean {
    return Array.isArray(this.menu) && this.menu.length > 0;
  }

  isOpen(): boolean {
    return this.state.isMenuOpen(this.overlayId);
  }

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

  onTriggerClick(): void {
    if (this.enabled === false) return;
    if (this.hasMenu()) {
      this.state.toggleMenu(this.overlayId);
      return;
    }
    dispatchShellAction(this.router, this.action);
  }

  menuItems(): DosCarbonContextMenuItem[] {
    return (this.menu ?? []).map((entry) => ({
      id: entry.id,
      label: entry.label || entry.i18nKey || entry.id,
      disabled: entry.enabled === false,
      danger: !!entry.destructive,
      ariaLabel: entry.ariaLabel || entry.label || entry.i18nKey || null,
      data: { entry },
    }));
  }

  onMenuSelected(item: DosCarbonContextMenuItem): void {
    const entry = (item.data?.['entry'] as ShellAccountMenuEntry | undefined) ?? null;
    if (!entry) return;
    this.activate(entry);
  }

  activate(entry: ShellAccountMenuEntry): void {
    if (entry.enabled === false) return;
    this.state.closeMenuFor(this.overlayId);
    dispatchShellAction(this.router, entry.action ?? null);
  }
}

// ── Global quick actions (command palette + inbox) ───────────────────
@Component({
  selector: 'dos-shell-global-quick-actions',
  standalone: true,
  imports: [CommonModule, DosIconComponent, DosCarbonHeaderActionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasAnyControl()) {
    <div class="dos-shell-global-quick-actions"
         [attr.data-placement]="placement || null"
         [attr.data-renderer-key]="'shell.global-quick-actions'">
      @if (commandSearchAction && resolvedCommandAria()) {
        <dos-carbon-header-action
          class="dos-shell-global-quick-actions__btn"
          [description]="resolvedCommandTooltip()"
          [attr.aria-label]="resolvedCommandAria()"
          [attr.data-action-id]="'command'"
          (selected)="onCommandSearch()"
        >
          <dos-icon [name]="commandIcon" [size]="20" [ariaLabel]="resolvedCommandAria()"></dos-icon>
        </dos-carbon-header-action>
      }
      @if (inboxAction && resolvedInboxAria()) {
        <span class="dos-shell-global-quick-actions__btn-wrap"
              [class.dos-shell-global-quick-actions__inbox--badge]="inboxCount > 0"
              [attr.data-badge-count]="inboxCount > 0 ? inboxCount : null">
          <dos-carbon-header-action
            class="dos-shell-global-quick-actions__btn"
            [description]="resolvedInboxTooltip()"
            [attr.aria-label]="resolvedInboxAria()"
            [attr.data-action-id]="'inbox'"
            (selected)="onInbox()"
          >
            <dos-icon [name]="inboxIcon" [size]="20" [ariaLabel]="resolvedInboxAria()"></dos-icon>
          </dos-carbon-header-action>
          @if (inboxCount > 0) {
            <span class="dos-shell-global-quick-actions__badge" aria-hidden="true">
              {{ inboxCount > 99 ? '99+' : inboxCount }}
            </span>
          }
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
  @Input() commandIcon = 'search';
  @Input() inboxLabel = '';
  @Input() inboxAriaLabel = '';
  @Input() inboxAction: RawShellAction | null = null;
  @Input() inboxIcon = 'inbox';
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

// ── Sidebar nav (Carbon UIShell — module → group → item hierarchy) ───
//
// Doctrine: the resolver emits `modules[]`, `groups[]`, `items[]` with
// every `moduleCode` / `groupId` link. The renderer composes them into
// proper Carbon UIShell structure so the side nav is hierarchical, not
// a flat ul/li:
//
//   modules[]                → cds-sidenav-menu (collapsible per module)
//     groups[] (label)       → group divider + heading inside the menu
//       items[]              → cds-sidenav-item leaf entries
//
// Empty modules/groups arrays = flat fallback. `items` alone never
// renders a flat list when modules/groups are present — the FE never
// invents hierarchy that the resolver did not publish.
type SidebarHierarchyItem = ShellSidebarNavItem;
interface SidebarHierarchyGroup {
  groupId: string;
  label: string;
  items: SidebarHierarchyItem[];
}
interface SidebarHierarchyModule {
  moduleCode: string;
  label: string;
  groups: SidebarHierarchyGroup[];
}

function pickLabel(label: { i18nKey?: string; fallback?: string; label?: string } | null | undefined): string {
  if (!label) return '';
  return (label.label ?? label.fallback ?? label.i18nKey ?? '').trim();
}

@Component({
  selector: 'dos-shell-sidebar-nav',
  standalone: true,
  imports: [CommonModule, UIShellModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-sidenav
      class="dos-shell-sidebar-nav"
      [expanded]="true"
      [attr.aria-label]="ariaLabel || null"
      [attr.data-renderer-key]="'shell.sidebar-nav'">
      @if (hierarchy().length) {
        @for (mod of hierarchy(); track mod.moduleCode) {
          <cds-sidenav-menu
            [title]="mod.label"
            [expanded]="isModuleExpanded(mod)"
            [attr.data-module-code]="mod.moduleCode"
          >
            @for (grp of mod.groups; track grp.groupId) {
              @if (mod.groups.length > 1 && grp.label) {
                <li class="dos-shell-sidebar-nav__group-heading"
                    role="none"
                    [attr.data-group-id]="grp.groupId">{{ grp.label }}</li>
              }
              @for (item of grp.items; track item.id) {
                <cds-sidenav-item
                  [href]="item.action?.kind === 'navigate' ? item.action!.path : ''"
                  [title]="item.label"
                  [attr.data-nav-id]="item.id"
                  [attr.data-module-code]="item.moduleCode || null"
                  [attr.data-group-id]="item.groupId || null"
                  [class.dos-shell-sidebar-nav__item--active]="isActive(item)"
                  [attr.aria-current]="isActive(item) ? 'page' : null"
                  (navigation)="onNavigated($event, item)"
                >
                  @if (item.icon) {
                    <dos-icon class="dos-shell-sidebar-nav__icon"
                              [name]="item.icon"
                              [size]="16"
                              [ariaLabel]="null"></dos-icon>
                  }
                  <span class="dos-shell-sidebar-nav__label">{{ item.label }}</span>
                  @if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
                    <span class="dos-shell-sidebar-nav__badge"
                          [attr.aria-label]="badgeLabel || null">{{ item.badge }}</span>
                  }
                </cds-sidenav-item>
              }
            }
          </cds-sidenav-menu>
        }
      } @else if (items?.length) {
        @for (item of items; track item.id) {
          <cds-sidenav-item
            [href]="item.action?.kind === 'navigate' ? item.action!.path : ''"
            [title]="item.label"
            [attr.data-nav-id]="item.id"
            [class.dos-shell-sidebar-nav__item--active]="isActive(item)"
            [attr.aria-current]="isActive(item) ? 'page' : null"
            (navigation)="onNavigated($event, item)"
          >
            @if (item.icon) {
              <dos-icon class="dos-shell-sidebar-nav__icon"
                        [name]="item.icon"
                        [size]="16"
                        [ariaLabel]="null"></dos-icon>
            }
            <span class="dos-shell-sidebar-nav__label">{{ item.label }}</span>
            @if (item.badge !== undefined && item.badge !== null && item.badge !== '') {
              <span class="dos-shell-sidebar-nav__badge"
                    [attr.aria-label]="badgeLabel || null">{{ item.badge }}</span>
            }
          </cds-sidenav-item>
        }
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
    </cds-sidenav>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .dos-shell-sidebar-nav {
      display: block;
      padding: var(--cds-spacing-03) 0;
      height: 100%;
      background: var(--cds-background);
    }
    .cds--side-nav__items { list-style: none; padding: 0; margin: 0; }
    .dos-shell-sidebar-nav__group-heading {
      list-style: none;
      padding: var(--cds-spacing-03) var(--cds-spacing-05) var(--cds-spacing-02);
      font-size: var(--cds-label-01-font-size);
      letter-spacing: var(--cds-label-01-letter-spacing);
      text-transform: uppercase;
      color: var(--cds-text-helper);
    }
    .dos-shell-sidebar-nav__icon {
      margin-inline-end: var(--cds-spacing-03);
      color: currentColor;
      flex: 0 0 auto;
    }
    .dos-shell-sidebar-nav__label {
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
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
    :host ::ng-deep cds-sidenav-item .cds--side-nav__link {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
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
  private readonly state = inject(ShellStateService);

  // Signal-backed inputs — the resolver writes via property setters, the
  // hierarchy() computed reads via signal reads, so the renderer
  // re-renders cleanly when any of (items|modules|groups) change.
  private readonly _items   = signal<ShellSidebarNavItem[]>([]);
  private readonly _modules = signal<ShellSidebarNavModule[]>([]);
  private readonly _groups  = signal<ShellSidebarNavGroup[]>([]);

  @Input() set items(v: ShellSidebarNavItem[] | null) { this._items.set(v ?? []); }
  get items(): ShellSidebarNavItem[] { return this._items(); }

  @Input() set modules(v: ShellSidebarNavModule[] | null) { this._modules.set(v ?? []); }
  get modules(): ShellSidebarNavModule[] { return this._modules(); }

  @Input() set groups(v: ShellSidebarNavGroup[] | null) { this._groups.set(v ?? []); }
  get groups(): ShellSidebarNavGroup[] { return this._groups(); }

  @Input() emptyMessage = '';
  @Input() ariaLabel = '';
  @Input() badgeLabel = '';

  /**
   * Compose the resolver-emitted modules/groups/items into a stable
   * hierarchy. Inputs are signals via @Input writes; recomputation
   * happens whenever any of them change.
   */
  readonly hierarchy = computed<SidebarHierarchyModule[]>(() => {
    const items   = this._items();
    const modules = this._modules();
    const groups  = this._groups();
    if (modules.length === 0 || items.length === 0) return [];

    // Group items by `${moduleCode}:${groupId || ''}`
    const itemsByKey = new Map<string, ShellSidebarNavItem[]>();
    for (const it of items) {
      const moduleCode = (it.moduleCode ?? '').trim();
      const groupId    = (it.groupId    ?? '').trim();
      if (!moduleCode) continue;
      const key = `${moduleCode}:${groupId}`;
      if (!itemsByKey.has(key)) itemsByKey.set(key, []);
      itemsByKey.get(key)!.push(it);
    }

    // Sort groups by sortOrder per module.
    const groupsByModule = new Map<string, SidebarHierarchyGroup[]>();
    const sortedGroups = [...groups].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.groupId.localeCompare(b.groupId),
    );
    for (const g of sortedGroups) {
      const list = groupsByModule.get(g.moduleCode) ?? [];
      const groupItems = itemsByKey.get(`${g.moduleCode}:${g.groupId}`) ?? [];
      if (groupItems.length === 0) continue;
      list.push({ groupId: g.groupId, label: pickLabel(g.label), items: groupItems });
      groupsByModule.set(g.moduleCode, list);
    }
    // Catch-all bucket for ungrouped items (groupId='').
    for (const [key, its] of itemsByKey.entries()) {
      const [moduleCode, groupId] = key.split(':', 2);
      if (groupId) continue;
      const list = groupsByModule.get(moduleCode) ?? [];
      list.push({ groupId: '_ungrouped', label: '', items: its });
      groupsByModule.set(moduleCode, list);
    }

    return [...modules]
      .filter((m) => groupsByModule.has(m.moduleCode))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.moduleCode.localeCompare(b.moduleCode))
      .map((m) => ({
        moduleCode: m.moduleCode,
        label: pickLabel(m.label),
        groups: groupsByModule.get(m.moduleCode) ?? [],
      }));
  });

  /**
   * Active state delegates to ShellStateService — the single canonical
   * URL source for the entire shell. ShellStateService subscribes to
   * Router NavigationEnd, normalizes (trailing slash, query, hash),
   * and exposes one `isRouteActive(path)` matcher used here, in
   * dynamic nav resolvers, and in any future nav surface.
   */
  isActive(item: ShellSidebarNavItem): boolean {
    const action = item.action;
    if (!action || action.kind !== 'navigate' || !action.path) return false;
    return this.state.isRouteActive(action.path);
  }

  /** A module is auto-expanded when any of its leaf items is the active route. */
  isModuleExpanded(mod: SidebarHierarchyModule): boolean {
    for (const grp of mod.groups) {
      for (const it of grp.items) {
        if (this.isActive(it)) return true;
      }
    }
    return false;
  }

  onNavigated(_navPromise: Promise<boolean>, item: ShellSidebarNavItem): void {
    if (!item.action || item.action.kind !== 'navigate') return;
    void this.router.navigateByUrl(item.action.path);
  }
}

// ── Module cards (real Carbon cds-clickable-tile grid) ──────────────
@Component({
  selector: 'dos-shell-module-cards',
  standalone: true,
  imports: [CommonModule, TilesModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items?.length) {
      <section class="dos-shell-module-cards"
               [attr.aria-label]="ariaLabel || null"
               [attr.data-renderer-key]="'shell.module-cards'">
        <ul class="dos-shell-module-cards__grid">
          @for (item of items; track item.id) {
            <li class="dos-shell-module-cards__cell"
                [attr.data-module-id]="item.id">
              <cds-clickable-tile
                href="javascript:void(0)"
                (click)="onActivate($event, item)"
              >
                <strong class="dos-shell-module-cards__title">{{ item.title }}</strong>
                @if (item.productCode) {
                  <span class="dos-shell-module-cards__product">{{ item.productCode }}</span>
                }
              </cds-clickable-tile>
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
