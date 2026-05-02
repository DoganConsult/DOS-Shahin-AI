import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-governance-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="governance-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class GovernanceWidgetComponent {
  @Input() title = 'Governance';
}
