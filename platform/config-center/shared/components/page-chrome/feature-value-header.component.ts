import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-feature-value-header',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="feature-value-header"></div>`,
})
export class FeatureValueHeaderComponent {
  @Input() featureId = '';
  @Input() route = '';
}
