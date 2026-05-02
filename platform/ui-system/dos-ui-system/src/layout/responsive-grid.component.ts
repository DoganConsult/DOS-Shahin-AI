import { Component, ChangeDetectionStrategy, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-responsive-grid',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-grid" [class]="cls()">
      <ng-content></ng-content>
    </div>
  `,
})
export class DosResponsiveGridComponent {
  private _cols = signal<number>(2);
  @Input() set cols(v: number) {
    this._cols.set(Math.max(1, Math.min(4, v || 2)));
  }
  cls = computed(() => `dos-grid--cols-${this._cols()}`);
}
