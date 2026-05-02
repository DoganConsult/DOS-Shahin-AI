import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-builder',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="workflow-builder-page">
      <h2>Workflow Builder</h2>
    </section>
  `,
})
export class WorkflowBuilderComponent {}
