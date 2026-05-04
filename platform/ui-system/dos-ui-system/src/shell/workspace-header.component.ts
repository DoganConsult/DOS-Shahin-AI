/**
 * Phase WS-2 + Carbon-Wiring — workspace.header wrapper.
 * Selector: dos-workspace-header
 * Carbon primitive: ui-shell (UIShellModule → cds-header + cds-hamburger + cds-header-global)
 * DB: dos.dynamic_ui_component_registry component_key='workspace.header' carbon_key='ui-shell'
 *
 * Token stack:
 *   --cds-*           (Carbon role tokens — @carbon/styles)
 *   --shell-*         (structural aliases — carbon-shell-tokens.scss)
 *   --brand-accent    (Shahin product accent — design-tokens.css)
 *   breathing-glow    (premium animation — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UIShellModule } from 'carbon-components-angular';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';
import { DosIconComponent } from '../components/icon.component';
import type { WorkspaceHeaderContext, WorkspaceHeaderAction } from './workspace-shell.contracts';

@Component({
  selector: 'dos-workspace-header',
  standalone: true,
  imports: [CommonModule, UIShellModule, DosCarbonTagComponent, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <cds-header
      [name]="resolvedBrand"
      [brand]="resolvedBrandShort"
      [attr.aria-label]="ariaLabel || resolvedBrand"
      data-testid="dos-workspace-header"
    >
      <!-- Hamburger sidenav toggle -->
      <cds-hamburger
        [active]="sideNavOpen"
        (selected)="sideNavToggled.emit(!sideNavOpen)"
      ></cds-hamburger>

      <!-- Brand logo slot -->
      <a class="dos-wh-brand" [attr.aria-label]="resolvedBrand" href="/">
        @if (logoUri) {
          <img class="dos-wh-logo"
               [src]="logoUri"
               [alt]="resolvedBrand"
               width="24" height="24" />
        }
        <span class="dos-wh-brand-name">{{ resolvedBrand }}</span>
        @if (tenantName) {
          <span class="dos-wh-tenant-sep" aria-hidden="true">/</span>
          <span class="dos-wh-tenant-name">{{ tenantName }}</span>
        }
      </a>

      <!-- Global action bar -->
      <cds-header-global>
        <!-- Command search trigger (desktop) -->
        @if (showCommandSearch) {
          <button type="button"
                  class="dos-wh-action"
                  [attr.aria-label]="commandSearchLabel"
                  (click)="commandSearchOpen.emit()">
            <dos-icon name="search" [size]="20" [ariaLabel]="commandSearchLabel"></dos-icon>
          </button>
        }

        <!-- Inbox / notifications -->
        @if (showInbox) {
          <button type="button"
                  class="dos-wh-action"
                  [class.dos-wh-action--badge]="inboxCount > 0"
                  [attr.aria-label]="inboxLabel"
                  [attr.data-badge-count]="inboxCount > 0 ? inboxCount : null"
                  (click)="inboxOpen.emit()">
            <dos-icon name="notification" [size]="20" [ariaLabel]="inboxLabel"></dos-icon>
            @if (inboxCount > 0) {
              <span class="dos-wh-badge" aria-hidden="true">
                {{ inboxCount > 99 ? '99+' : inboxCount }}
              </span>
            }
          </button>
        }

        <!-- Trailing actions from context -->
        @for (action of trailingActions; track action.id) {
          <button type="button"
                  class="dos-wh-action"
                  [attr.aria-label]="action.label.fallback ?? action.label.i18nKey"
                  [attr.data-action-id]="action.id"
                  (click)="actionClick.emit(action)">
            @if (action.icon) {
              <dos-icon [name]="action.icon" [size]="20"></dos-icon>
            }
            @if (action.badgeCount && action.badgeCount > 0) {
              <span class="dos-wh-badge" aria-hidden="true">{{ action.badgeCount }}</span>
            }
          </button>
        }

        <!-- User avatar / account menu trigger -->
        @if (userDisplayName) {
          <button type="button"
                  class="dos-wh-avatar"
                  [attr.aria-label]="userDisplayName"
                  [attr.data-testid]="'dos-workspace-header-avatar'"
                  (click)="avatarClick.emit()">
            @if (userAvatarUri) {
              <img [src]="userAvatarUri" [alt]="userDisplayName"
                   width="24" height="24" class="dos-wh-avatar__img" />
            } @else {
              <span class="dos-wh-avatar__initials" aria-hidden="true">
                {{ initials }}
              </span>
            }
          </button>
        }
      </cds-header-global>
    </cds-header>
  `,
  styles: [`
    :host { display: block; }

    /* ── Brand area ──────────────────────────────────── */
    .dos-wh-brand {
      display: inline-flex;
      align-items: center;
      gap: var(--cds-spacing-03, 0.5rem);
      padding-inline: var(--cds-spacing-05, 1rem);
      color: var(--cds-text-on-color, #fff);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      white-space: nowrap;
      min-width: 0;
    }

    .dos-wh-logo {
      flex: 0 0 auto;
      object-fit: contain;
      /* breathing-glow when agents are running — applied via host class */
      border-radius: 50%;
      transition: box-shadow 0.3s ease;
    }

    :host(.dos-wh--agents-running) .dos-wh-logo {
      animation: breathing-glow 2.4s ease-in-out infinite;
    }

    .dos-wh-brand-name {
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--cds-text-on-color, #fff);
    }

    .dos-wh-tenant-sep {
      color: var(--cds-text-on-color-disabled, rgba(255,255,255,0.4));
      font-weight: 300;
      padding-inline: var(--cds-spacing-02, 0.25rem);
    }

    .dos-wh-tenant-name {
      color: var(--cds-text-on-color-disabled, rgba(255,255,255,0.65));
      font-weight: 400;
      font-size: 0.8125rem;
      overflow: hidden;
      text-overflow: ellipsis;
      max-inline-size: 12rem;
    }

    /* ── Global action buttons ───────────────────────── */
    .dos-wh-action {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;           /* Carbon header height */
      background: none;
      border: none;
      cursor: pointer;
      color: var(--cds-text-on-color, #fff);
      transition: background 0.12s ease;
      flex: 0 0 auto;
    }

    .dos-wh-action:hover {
      background: var(--cds-layer-hover-inverse, rgba(255,255,255,0.08));
    }

    .dos-wh-action:focus-visible {
      outline: 2px solid var(--cds-focus, #fff);
      outline-offset: -2px;
    }

    /* Badge indicator on action button */
    .dos-wh-badge {
      position: absolute;
      inset-block-start: 0.375rem;
      inset-inline-end: 0.375rem;
      min-inline-size: 1rem;
      block-size: 1rem;
      padding-inline: 0.25rem;
      border-radius: 999px;
      font-size: 0.6875rem;
      font-weight: 700;
      line-height: 1rem;
      text-align: center;
      background: var(--cds-support-error, #da1e28);
      color: #fff;
      pointer-events: none;
      animation: scale-pop 0.2s ease-out both;
    }

    /* ── User avatar ─────────────────────────────────── */
    .dos-wh-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--cds-text-on-color, #fff);
      transition: background 0.12s ease;
    }

    .dos-wh-avatar:hover {
      background: var(--cds-layer-hover-inverse, rgba(255,255,255,0.08));
    }

    .dos-wh-avatar:focus-visible {
      outline: 2px solid var(--cds-focus, #fff);
      outline-offset: -2px;
    }

    .dos-wh-avatar__img {
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--cds-border-inverse, rgba(255,255,255,0.2));
    }

    .dos-wh-avatar__initials {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background: var(--brand-accent, var(--cds-button-primary, #0f62fe));
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1.5px solid rgba(255,255,255,0.2);
    }

    /* ── Keyframes (from design-tokens.css) ─────────── */
    @keyframes breathing-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(69,137,255,0.10); }
      50%      { box-shadow: 0 0 20px rgba(69,137,255,0.30); }
    }

    @keyframes scale-pop {
      0%   { transform: scale(0.85); opacity: 0; }
      60%  { transform: scale(1.04); }
      100% { transform: scale(1);   opacity: 1; }
    }
  `],
})
export class DosWorkspaceHeaderComponent {
  /** Full WorkspaceHeaderContext — optional; individual @Inputs also accepted */
  @Input() set context(v: WorkspaceHeaderContext | null | undefined) {
    if (!v) return;
    this.title = v.brand?.productName?.fallback ?? v.brand?.productName?.i18nKey ?? '';
    this.tenantName = v.tenantName?.fallback ?? v.tenantName?.i18nKey ?? '';
    this.logoUri = v.brand?.logoUri ?? null;
    this.userDisplayName = v.user?.displayName ?? '';
    this.userAvatarUri = v.user?.avatarUri ?? null;
    this.trailingActions = v.trailingActions ?? [];
  }

  @Input() title = 'Shahin-AI';
  @Input() tenantName = '';
  @Input() logoUri: string | null = null;
  @Input() userDisplayName = '';
  @Input() userAvatarUri: string | null = null;
  @Input() ariaLabel: string | null = null;
  @Input() sideNavOpen = false;
  @Input() showCommandSearch = true;
  @Input() showInbox = true;
  @Input() inboxCount = 0;
  @Input() commandSearchLabel = 'Search (Ctrl+K)';
  @Input() inboxLabel = 'Inbox';
  @Input() trailingActions: WorkspaceHeaderAction[] = [];

  @Output() sideNavToggled   = new EventEmitter<boolean>();
  @Output() commandSearchOpen = new EventEmitter<void>();
  @Output() inboxOpen        = new EventEmitter<void>();
  @Output() avatarClick      = new EventEmitter<void>();
  @Output() actionClick      = new EventEmitter<WorkspaceHeaderAction>();

  get resolvedBrand(): string {
    return this.title || 'Shahin-AI';
  }

  get resolvedBrandShort(): string {
    return this.title ? this.title.split(/\s/)[0] : 'SAI';
  }

  get initials(): string {
    return this.userDisplayName
      .split(' ')
      .slice(0, 2)
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase();
  }
}
