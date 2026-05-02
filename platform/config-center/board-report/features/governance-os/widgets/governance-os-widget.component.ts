import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-governance-os-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="governance-os-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class GovernanceOsWidgetComponent {
  @Input() title = 'Governance OS';
}
