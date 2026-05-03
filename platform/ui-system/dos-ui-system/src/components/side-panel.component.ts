import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosSidePanel — slide-in contextual panel (right or left edge). Thin
 * presentational wrapper; caller owns content via projection. Distinct
 * from DosSideDrawer (navigation drawer) and DosBottomSheet (mobile).
 */
@Component({
  selector: 'dos-side-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="dos-sp__backdrop" (click)="closed.emit()"></div>
      <aside class="dos-sp" role="complementary" [attr.data-edge]="edge"
             [attr.aria-label]="title">
        <header class="dos-sp__head">
          <h2 class="dos-sp__title">{{ title }}</h2>
          <button class="dos-sp__close" type="button" aria-label="Close" (click)="closed.emit()">×</button>
        </header>
        <div class="dos-sp__body">
          <ng-content></ng-content>
        </div>
      </aside>
    }
  `,
  styles: [`
    .dos-sp__backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 998; }
    .dos-sp { position: fixed; top: 0; bottom: 0; width: min(420px, 92vw);
      background: var(--dos-color-surface, #fff); box-shadow: -2px 0 16px rgba(0,0,0,.18);
      display: flex; flex-direction: column; z-index: 999; }
    .dos-sp[data-edge='right'] { right: 0; }
    .dos-sp[data-edge='left']  { left: 0; box-shadow: 2px 0 16px rgba(0,0,0,.18); }
    .dos-sp__head { display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.25rem; border-bottom: 1px solid var(--dos-color-border, #e0e0e0); }
    .dos-sp__title { margin: 0; font-size: 1rem; font-weight: 600; }
    .dos-sp__close { background: none; border: none; font-size: 1.5rem; cursor: pointer; line-height: 1; }
    .dos-sp__body { flex: 1; overflow: auto; padding: 1rem 1.25rem; }
  `],
})
export class DosSidePanelComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() edge: 'left' | 'right' = 'right';
  @Output() closed = new EventEmitter<void>();
}
