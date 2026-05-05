import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-workspace-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="workspace-stub">
      <p class="workspace-stub__eyebrow">{{ eyebrow }}</p>
      <h1 class="workspace-stub__title">{{ title }}</h1>
      <p class="workspace-stub__description">{{ description }}</p>
    </section>
  `,
  styles: [`
    .workspace-stub {
      max-width: 1100px;
      width: 100%;
      margin-inline: auto;
      padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
      background: var(--cds-layer-01, #f4f4f4);
    }

    .workspace-stub__eyebrow {
      margin: 0 0 var(--cds-spacing-03, 0.5rem);
      color: var(--cds-text-secondary, #525252);
      font-size: var(--cds-label-01-font-size, 0.75rem);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .workspace-stub__title {
      margin: 0;
      color: var(--cds-text-primary, #161616);
      font-size: clamp(2rem, 4vw, 4rem);
      line-height: 1.05;
      font-weight: 400;
    }

    .workspace-stub__description {
      max-width: 68ch;
      margin: var(--cds-spacing-05, 1rem) 0 0;
      color: var(--cds-text-secondary, #525252);
      font-size: var(--cds-body-02-font-size, 1rem);
      line-height: 1.6;
    }
  `],
})
export class WorkspaceStubComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() description = '';
}
