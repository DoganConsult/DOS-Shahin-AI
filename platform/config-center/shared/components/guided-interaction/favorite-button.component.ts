import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-favorite-button',
  standalone: true,
  imports: [CommonModule],
  template: `<button type="button" class="favorite-btn"></button>`,
})
export class FavoriteButtonComponent {
  @Input() entityType = '';
  @Input() entityId = '';
  @Input() entityTitle = '';
}
