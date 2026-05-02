/** TODO(dos-foundation): Replace stub with full implementation. */
import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
@Component({
  standalone: true,
  imports: [],
  selector: 'app-vendor-profile-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p style="padding:24px;color:var(--text-muted)">Vendor Profile tab — stub (rebuild pending)</p>',
})
export class VendorProfileTabComponent {
  @Input() vendor: any;
}
