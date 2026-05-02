import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  selector: 'app-lifecycle-stage-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `<section class="lifecycle-stage"><h2>Lifecycle Stage</h2><p>Stage view for workspace lifecycle management.</p></section>`,
})
export class LifecycleStagePageComponent {
  private route = inject(ActivatedRoute);
}
