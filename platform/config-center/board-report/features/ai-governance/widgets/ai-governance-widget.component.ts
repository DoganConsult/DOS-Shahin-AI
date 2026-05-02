import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-governance-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="ai-governance-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class AiGovernanceWidgetComponent {
  @Input() title = 'AI Governance';
}
