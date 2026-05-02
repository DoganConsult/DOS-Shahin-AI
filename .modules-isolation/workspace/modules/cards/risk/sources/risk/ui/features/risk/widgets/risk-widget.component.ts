import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-risk-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="risk-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class RiskWidgetComponent {
  @Input() title = 'Risk';
}
