import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-process-tasks',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="process-tasks-page">
      <h2>Process Tasks</h2>
    </section>
  `,
})
export class ProcessTasksComponent {}
