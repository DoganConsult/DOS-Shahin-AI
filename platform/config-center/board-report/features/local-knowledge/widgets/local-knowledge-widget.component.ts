import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-local-knowledge-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="local-knowledge-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class LocalKnowledgeWidgetComponent {
  @Input() title = 'Local Knowledge';
}
