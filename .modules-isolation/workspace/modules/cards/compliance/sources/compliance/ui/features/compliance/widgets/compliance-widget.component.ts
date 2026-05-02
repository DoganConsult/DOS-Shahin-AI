import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-compliance-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="compliance-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class ComplianceWidgetComponent {
  @Input() title = 'Compliance';
}
