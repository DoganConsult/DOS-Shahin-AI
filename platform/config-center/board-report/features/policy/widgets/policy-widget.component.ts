import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="policy-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class PolicyWidgetComponent {
  @Input() title = 'Policy';
}
