/**
 * Phase WS-2 + Carbon-Wiring — workspace.quick-create wrapper (FAB).
 * Selector: dos-quick-create
 * Carbon primitive: button (ButtonModule → cds-button)
 * Runtime: componentKey=workspace.quick-create (carbon=button) — DB schema reference removed (resolved by UI-OS service).
 *
 * Token stack:
 *   --cds-button-*   (Carbon button tokens)
 *   --shell-z-sticky (z-index for FAB)
 *   scale-pop        (FAB open animation — design-tokens.css)
 */
import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'carbon-components-angular';
import { DosIconComponent } from '../components/icon.component';
import type { QuickCreateAction } from './workspace-shell.contracts';
import { sanitizeAccessibleText } from './shell-accessible-text';

@Component({
  selector: 'dos-quick-create',
  standalone: true,
  imports: [CommonModule, ButtonModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (fabChrome()) {
    <div class="dos-quick-create"
         [class.dos-quick-create--mobile]="mobileMode"
         [class.dos-quick-create--open]="menuOpen()"
         data-testid="dos-quick-create">

      <!-- Desktop FAB: cds-button primary iconOnly (carbon_key=button) -->
      @if (!mobileMode) {
        <button
          cdsButton="primary"
          size="md"
          type="button"
          class="dos-quick-create__fab"
          [attr.aria-label]="fabLabelAttr()"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()">
          <dos-icon name="add" [size]="20" [ariaLabel]="fabIconAriaLabel()"></dos-icon>
        </button>
      }

      <!-- Ghost action menu (shown when FAB is open) -->
      @if (menuOpen() && actions.length && menuLabelChrome()) {
        <ul class="dos-quick-create__menu"
            role="menu"
            [attr.aria-label]="menuLabelAttr()"
            [class.dos-quick-create__menu--rtl]="dir === 'rtl'">
          @for (action of actions; track action.id) {
            <li role="none">
              <button
                cdsButton="ghost"
                size="sm"
                type="button"
                role="menuitem"
                class="dos-quick-create__action"
                [attr.data-action-id]="action.id"
                [attr.aria-label]="action.label?.fallback ?? action.label?.i18nKey ?? ''"
                (click)="onAction(action)">
                @if (action.icon) {
                  <dos-icon [name]="action.icon" [size]="16" class="dos-quick-create__action-icon"></dos-icon>
                }
                <span class="dos-quick-create__action-label">
                  {{ action.label?.fallback ?? action.label?.i18nKey ?? '' }}
                </span>
                @if (action.hotkey) {
                  <kbd class="dos-quick-create__hotkey">{{ action.hotkey }}</kbd>
                }
              </button>
            </li>
          }
        </ul>
      }

      <!-- Mobile: full-width sticky bottom cds-button primary -->
      @if (mobileMode) {
        <button
          cdsButton="primary"
          size="lg"
          type="button"
          class="dos-quick-create__mobile-btn"
          [attr.aria-label]="fabLabelAttr()"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()">
          <dos-icon name="add" [size]="20" [ariaLabel]="fabIconAriaLabel()"></dos-icon>
          <span>{{ fabLabel }}</span>
        </button>

        @if (menuOpen() && actions.length && menuLabelChrome()) {
          <div class="dos-quick-create__mobile-menu" role="menu" [attr.aria-label]="menuLabelAttr()">
            @for (action of actions; track action.id) {
              <button
                cdsButton="ghost"
                size="md"
                type="button"
                role="menuitem"
                class="dos-quick-create__action dos-quick-create__action--mobile"
                [attr.data-action-id]="action.id"
                (click)="onAction(action)">
                @if (action.icon) {
                  <dos-icon [name]="action.icon" [size]="16"></dos-icon>
                }
                <span>{{ action.label?.fallback ?? action.label?.i18nKey ?? '' }}</span>
              </button>
            }
          </div>
        }
      }
    </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── FAB (desktop) ────────────────────────────────── */
    .dos-quick-create {
      position: relative;
      display: inline-block;
    }

    .dos-quick-create__fab {
      /* Carbon cds-button handles sizing; we override shape to circle */
      border-radius: 50% !important;
      width: 3rem;
      height: 3rem;
      padding: 0 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-premium-md));
      transition: box-shadow 0.2s, transform 0.15s;
    }

    .dos-quick-create__fab:hover {
      transform: scale(1.06);
      box-shadow: var(--shadow-premium-lg));
    }

    .dos-quick-create--open .dos-quick-create__fab {
      transform: rotate(45deg);
    }

    /* ── Ghost action menu (desktop) ────────────────── */
    .dos-quick-create__menu {
      position: absolute;
      inset-block-end: calc(100% + var(--cds-spacing-03));
      inset-inline-end: 0;
      min-inline-size: 16rem;
      background: var(--cds-layer);
      border: 1px solid var(--cds-border-subtle-01);
      box-shadow: var(--shadow-premium-lg));
      list-style: none;
      margin: 0;
      padding: var(--cds-spacing-02) 0;
      z-index: var(--shell-z-dropdown);
      animation: scale-pop 0.18s ease-out both;
    }

    .dos-quick-create__menu--rtl {
      inset-inline-end: auto;
      inset-inline-start: 0;
    }

    .dos-quick-create__action {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      /* Carbon ghost button handles base styles */
    }

    .dos-quick-create__action-icon { flex: 0 0 auto; }

    .dos-quick-create__action-label {
      flex: 1;
      text-align: start;
    }

    .dos-quick-create__hotkey {
      font-size: 0.625rem;
      font-family: var(--cds-code-01-font-family);
      color: var(--cds-text-secondary);
      background: var(--cds-layer-02);
      border: 1px solid var(--cds-border-subtle);
      border-radius: 3px;
      padding: var(--cds-spacing-01) var(--cds-spacing-02);
      white-space: nowrap;
      margin-inline-start: auto;
    }

    /* ── Mobile sticky bottom ────────────────────────── */
    .dos-quick-create--mobile {
      position: fixed;
      inset-block-end: calc(var(--shell-mobile-bottom-padding) + env(safe-area-inset-bottom, 0px));
      inset-inline: 0;
      padding-inline: var(--cds-spacing-05);
      z-index: var(--shell-z-sticky);
    }

    .dos-quick-create__mobile-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--cds-spacing-03);
    }

    .dos-quick-create__mobile-menu {
      position: fixed;
      inset-block-end: calc(var(--shell-mobile-bottom-padding)) + var(--cds-spacing-09) + env(safe-area-inset-bottom, 0px));
      inset-inline: var(--cds-spacing-05);
      background: var(--cds-layer);
      border: 1px solid var(--cds-border-subtle-01);
      box-shadow: var(--shadow-premium-lg));
      padding: var(--cds-spacing-03) 0;
      z-index: var(--shell-z-dropdown);
      animation: premium-fade-up 0.18s ease-out both;
    }

    .dos-quick-create__action--mobile {
      width: 100%;
      justify-content: flex-start;
      padding-inline: var(--cds-spacing-05);
    }

    /* ── Keyframes ─────────────────────────────────────── */
    @keyframes scale-pop {
      0%   { transform: scale(0.85); opacity: 0; }
      60%  { transform: scale(1.03); }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes premium-fade-up {
      0%   { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class DosQuickCreateComponent {
  @Input() actions: QuickCreateAction[] = [];
  @Input() mobileMode = false;
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() fabLabel = '';
  @Input() menuLabel = '';

  menuOpen = signal(false);

  @Output() create = new EventEmitter<QuickCreateAction>();

  fabChrome(): boolean {
    return sanitizeAccessibleText(this.fabLabel).length > 0;
  }

  fabLabelAttr(): string | null {
    const s = sanitizeAccessibleText(this.fabLabel);
    return s.length ? s : null;
  }

  fabIconAriaLabel(): string | null {
    const s = sanitizeAccessibleText(this.fabLabel);
    return s.length ? s : null;
  }

  menuLabelChrome(): boolean {
    return sanitizeAccessibleText(this.menuLabel).length > 0;
  }

  menuLabelAttr(): string | null {
    const s = sanitizeAccessibleText(this.menuLabel);
    return s.length ? s : null;
  }

  toggleMenu(): void {
    if (!this.fabChrome()) return;
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }
    if (!this.actions.length) return;
    if (!this.menuLabelChrome()) return;
    this.menuOpen.set(true);
  }

  onAction(action: QuickCreateAction): void {
    this.create.emit(action);
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const host = ev.target as HTMLElement;
    if (!host.closest('dos-quick-create')) this.menuOpen.set(false);
  }
}
