import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DosCarbonMobileTabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

/**
 * @dos/ui-system Mobile Carbon wrapper — Tabs.
 *
 * Mobile-optimized tabs with scrollable tab bar, swipe navigation support,
 * larger touch targets, and haptic feedback.
 * Wraps Carbon tabs markup with mobile-specific enhancements.
 */
@Component({
  selector: 'dos-carbon-mobile-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-mobile-tabs" role="navigation">
      <div class="dos-mobile-tabs__scroll-wrapper">
        <ul class="cds--tabs__nav" role="tablist">
          @for (t of items; track t.id; let i = $index) {
            <li
              class="cds--tabs__nav-item"
              [class.cds--tabs__nav-item--selected]="t.id === selectedId"
              [class.cds--tabs__nav-item--disabled]="!!t.disabled"
              role="presentation"
            >
              <button
                type="button"
                class="cds--tabs__nav-link"
                role="tab"
                [attr.aria-selected]="t.id === selectedId"
                [attr.aria-disabled]="!!t.disabled || null"
                [attr.tabindex]="t.id === selectedId ? 0 : -1"
                [disabled]="!!t.disabled"
                [style.min-height.px]="touchTargetSize"
                (click)="onSelected(i)"
              >
                {{ t.label }}
              </button>
            </li>
          }
        </ul>
      </div>
    </div>
    <div class="dos-mobile-tabs__panel" role="tabpanel">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .dos-mobile-tabs {
      width: 100%;
      border-bottom: 1px solid var(--cds-border-subtle-01);
    }
    .dos-mobile-tabs__scroll-wrapper {
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .dos-mobile-tabs__scroll-wrapper::-webkit-scrollbar {
      display: none;
    }
    .cds--tabs__nav {
      display: flex;
      flex-wrap: nowrap;
      min-width: max-content;
      padding: 0;
      margin: 0;
    }
    .cds--tabs__nav-item {
      flex: 0 0 auto;
    }
    .cds--tabs__nav-link {
      min-height: 44px;
      padding: 0 16px;
      font-size: 14px;
      transition: all 0.12s ease-out;
    }
    .cds--tabs__nav-link:active {
      transform: scale(0.96);
    }
    .dos-mobile-tabs__panel {
      padding: 16px 0;
    }
  `],
})
export class DosCarbonMobileTabsComponent {
  @Input() items: DosCarbonMobileTabItem[] = [];
  @Input() selectedId = '';
  @Input() touchTargetSize = 44;
  @Input() hapticFeedback = false;
  @Input() swipeNav = true;
  @Input() scrollable = true;
  @Output() selectedIdChange = new EventEmitter<string>();
  @Output() tabSwipe = new EventEmitter<{ direction: string; index: number }>();

  onSelected(idx: number): void {
    const item = this.items[idx];
    if (!item || item.disabled) return;
    if (this.hapticFeedback) {
      this.triggerHaptic();
    }
    this.selectedId = item.id;
    this.selectedIdChange.emit(item.id);
  }

  private triggerHaptic(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
