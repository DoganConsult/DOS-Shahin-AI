import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-export-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="btn btn-outline-primary btn-sm">
      {{ label || 'Export' }}
    </button>
  `,
})
export class ExportButtonComponent {
  @Input() module = '';
  @Input() label = 'Export';
  @Input() data: unknown[] = [];
}
