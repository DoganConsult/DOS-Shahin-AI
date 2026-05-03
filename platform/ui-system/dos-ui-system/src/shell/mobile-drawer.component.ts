import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Mobile drawer — full-height slide-in overlay menu for the mobile shell.
 * RTL-safe: slides from logical inset-start (left in LTR, right in RTL).
 */
@Component({
  selector: 'dos-mobile-drawer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-mobile-drawer__scrim"
           (click)="closed.emit()"
           aria-hidden="true"></div>
      <aside class="dos-mobile-drawer"
             [attr.dir]="dir"
             role="dialog"
             aria-modal="true"
             [attr.aria-label]="title">
        <header class="dos-mobile-drawer__header">
          <strong>{{ title }}</strong>
          <button type="button"
                  class="dos-mobile-drawer__close"
                  (click)="closed.emit()"
                  [attr.aria-label]="closeLabel || null">×</button>
        </header>
        <div class="dos-mobile-drawer__body"><ng-content></ng-content></div>
      </aside>
    }
  `,
  styles: [`
    :host { display: contents; }
    .dos-mobile-drawer__scrim {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 90;
      animation: dos-drawer-fade .15s ease-out;
    }
    .dos-mobile-drawer {
      position: fixed; inset-block: 0; inset-inline-start: 0;
      width: min(86vw, 320px); max-width: 100vw;
      background: var(--cds-layer-01, #f4f4f4);
      box-shadow: 0 0 24px rgba(0,0,0,0.15);
      z-index: 100; display: flex; flex-direction: column;
      animation: dos-drawer-slide .18s ease-out;
    }
    .dos-mobile-drawer__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--cds-spacing-04, .75rem) var(--cds-spacing-05, 1rem);
      border-block-end: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      background: var(--cds-layer-02, #fff);
    }
    .dos-mobile-drawer__close {
      width: 2rem; height: 2rem; border: 0; background: transparent;
      font-size: 1.5rem; line-height: 1; cursor: pointer;
      color: var(--cds-text-primary, #161616); border-radius: 2px;
    }
    .dos-mobile-drawer__close:hover { background: var(--cds-layer-hover, #e8e8e8); }
    .dos-mobile-drawer__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
    @keyframes dos-drawer-fade  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes dos-drawer-slide { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    [dir="rtl"].dos-mobile-drawer { animation-name: dos-drawer-slide-rtl; }
    @keyframes dos-drawer-slide-rtl { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `],
})
export class DosMobileDrawerComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() dir: 'ltr' | 'rtl' = 'ltr';
  @Input() closeLabel: string | null = null;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.closed.emit();
  }
}
