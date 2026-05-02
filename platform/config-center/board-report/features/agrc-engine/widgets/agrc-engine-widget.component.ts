import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-agrc-engine-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="agrc-engine-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class AgrcEngineWidgetComponent {
  @Input() title = 'AGRC Engine';
}
