import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vendor-widget',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="vendor-widget"><h4>{{ title }}</h4><ng-content></ng-content></div>`,
})
export class VendorWidgetComponent {
  @Input() title = 'Vendor';
}
