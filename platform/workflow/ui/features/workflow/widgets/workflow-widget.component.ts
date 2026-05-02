import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-widget">
      <h4>{{ title }}</h4>
      <ng-content></ng-content>
    </div>
  `,
})
export class WorkflowWidgetComponent {
  @Input() title = 'Workflow';
}
