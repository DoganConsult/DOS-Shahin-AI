import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inbox-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="inbox-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class InboxWidgetComponent {
  @Input() title = 'Inbox';
}
