import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-loading-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-loading-state" role="status" aria-live="polite">
      {{ label }}
    </div>
  `,
})
export class DosLoadingStateComponent {
  @Input() label = 'Loading…';
}
