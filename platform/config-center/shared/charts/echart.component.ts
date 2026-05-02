import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-echart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="echart-shell" [style.height]="height"></div>
  `,
})
export class EChartComponent {
  @Input() options: unknown;
  @Input() height = '260px';
}
