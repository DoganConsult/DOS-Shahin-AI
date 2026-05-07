/**
 * Phase WS-2 — workspace.mobile-nav wrapper.
 * Selector: dos-mobile-bottom-nav
 * Carbon primitive: side-nav (mobile, ≤480px); replaces dos-workspace-sidebar.
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DosIconComponent } from '../components/icon.component';

export interface DosBottomNavItem {
  id: string;
  label: string;
  icon?: string;
  badgeCount?: number;
  active?: boolean;
}

@Component({
  selector: 'dos-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, DosIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="dos-bottom-nav" [attr.dir]="dir" [attr.aria-label]="ariaLabel || null">
      @for (item of items; track item.id) {
        <button
          type="button"
          class="dos-bottom-nav__item"
          [class.dos-bottom-nav__item--active]="item.active"
          [attr.aria-current]="item.active ? 'page' : null"
          [attr.data-nav-id]="item.id"
          [style.min-height.px]="touchTargetSize"
          (click)="handleSelect(item)"
        >
          @if (item.icon) {
            <dos-icon class="dos-bottom-nav__icon"
                      [name]="item.icon"
                      [size]="iconSize"></dos-icon>
          }
          <span class="dos-bottom-nav__label">{{ item.label }}</span>
          @if (item.badgeCount && item.badgeCount > 0) {
            <span class="dos-bottom-nav__badge">{{ item.badgeCount }}</span>
          }
        </button>
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .dos-bottom-nav {
      display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
      align-items: stretch; min-height: var(--cds-spacing-14);
      background: var(--cds-layer-01);
    }
    .dos-bottom-nav__item {
      display: flex; flex-direction: column; gap: .125rem;
      align-items: center; justify-content: center;
      border: 0; background: transparent; cursor: pointer; padding: .5rem .25rem;
      color: var(--cds-text-secondary); position: relative;
      border-block-start: 2px solid transparent;
      transition: color .12s, border-color .12s, background .12s;
    }
    .dos-bottom-nav__item:active {
      transform: scale(0.96);
    }
    .dos-bottom-nav__item:hover { background: var(--cds-layer-hover); }
    .dos-bottom-nav__item--active {
      color: var(--cds-link-primary);
      border-block-start-color: var(--cds-link-primary);
    }
    .dos-bottom-nav__icon { color: currentColor; }
    .dos-bottom-nav__label { font-size: .6875rem; line-height: 1; }
    .dos-bottom-nav__badge {
      position: absolute; top: .25rem; inset-inline-end: 25%;
      min-width: 1rem; padding: 0 .25rem; border-radius: 999px;
      font-size: .625rem; line-height: 1rem; text-align: center;
      background: var(--cds-support-error); color: var(--cds-text-on-color);
    }
  `],
})
export class DosMobileBottomNavComponent {
  @Input() items: DosBottomNavItem[] = [];
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() ariaLabel: string | null = null;
  @Input() maxItems = 5;
  @Input() touchEnabled = true;
  @Input() touchTargetSize = 44;
  @Input() iconSize = 22;
  @Input() hapticFeedback = true;
  @Output() select = new EventEmitter<DosBottomNavItem>();
  @Output() itemSwipe = new EventEmitter<{ itemId: string; direction: string }>();

  handleSelect(item: DosBottomNavItem): void {
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.select.emit(item);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
