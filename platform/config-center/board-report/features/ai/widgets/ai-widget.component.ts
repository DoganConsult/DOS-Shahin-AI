import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="ai-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class AiWidgetComponent {
  @Input() title = 'AI';
}
