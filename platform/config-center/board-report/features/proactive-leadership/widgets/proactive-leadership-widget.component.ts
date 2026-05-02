import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-proactive-leadership-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="proactive-leadership-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class ProactiveLeadershipWidgetComponent {
  @Input() title = 'Proactive Leadership';
}
