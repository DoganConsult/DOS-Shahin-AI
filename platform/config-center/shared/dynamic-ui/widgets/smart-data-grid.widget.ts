import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'dos-dynamic-smart-data-grid-widget',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
    </section>
  `,
})
export class SmartDataGridWidgetComponent {
  @Input() config?: Record<string, unknown>;

  get title(): string {
    return typeof this.config?.['title'] === 'string' ? (this.config['title'] as string) : 'Smart Data Grid';
  }

  get message(): string {
    return typeof this.config?.['message'] === 'string'
      ? (this.config['message'] as string)
      : 'Smart data grid not configured for this route.';
  }
}

