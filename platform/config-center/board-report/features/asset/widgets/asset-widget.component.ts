import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-asset-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="asset-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class AssetWidgetComponent {
  @Input() title = 'Asset';
}
