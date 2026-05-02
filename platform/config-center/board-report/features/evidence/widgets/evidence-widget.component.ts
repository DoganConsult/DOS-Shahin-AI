import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-evidence-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="evidence-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class EvidenceWidgetComponent {
  @Input() title = 'Evidence';
}
