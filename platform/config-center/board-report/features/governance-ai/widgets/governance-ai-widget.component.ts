import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-governance-ai-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="governance-ai-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class GovernanceAiWidgetComponent {
  @Input() title = 'Governance AI';
}
