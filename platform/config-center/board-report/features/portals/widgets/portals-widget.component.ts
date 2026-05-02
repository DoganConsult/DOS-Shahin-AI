import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portals-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="portals-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class PortalsWidgetComponent {
  @Input() title = 'Portals';
}
