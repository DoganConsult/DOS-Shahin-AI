import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-member-lifecycle-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<div class="member-lifecycle-panel"><h3>Member Lifecycle</h3></div>`,
})
export class MemberLifecyclePanelComponent {}
