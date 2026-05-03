import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TilesModule, NotificationModule, LinkModule } from 'carbon-components-angular';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';
import { WorkspaceResolverService } from '../../shell/workspace-resolver.service';

@Component({
  selector: 'app-workspace-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TilesModule, NotificationModule, LinkModule],
  template: `
    <section class="ws-stub" [attr.dir]="cfg.direction()">
      <header class="ws-stub__head">
        <p class="ws-stub__eyebrow">{{ eyebrowText() }}</p>
        <h1>{{ title }}</h1>
        <p class="ws-stub__sub">{{ description }}</p>
      </header>

      <cds-tile>
        <p class="ws-stub__msg">{{ wiringMsg() }}</p>
        <cds-inline-notification
          [notificationObj]="{
            type: 'info',
            title: emptyMsg(),
            lowContrast: true,
            showClose: false
          }"
        ></cds-inline-notification>
        <a cdsLink [routerLink]="homeRoutePath()" class="ws-stub__back"
          >← {{ backMsg() }}</a
        >
      </cds-tile>
    </section>
  `,
  styles: [`
    .ws-stub { padding: var(--cds-spacing-07,2rem) var(--cds-spacing-06,1.5rem); max-width: 68.75rem; margin-inline: auto; display: flex; flex-direction: column; gap: var(--cds-spacing-06,1.5rem); }
    .ws-stub__head { display: flex; flex-direction: column; gap: var(--cds-spacing-03,.25rem); }
    .ws-stub__eyebrow { margin: 0; font-size: var(--cds-label-01-font-size,.75rem); letter-spacing: .16em; text-transform: uppercase; color: var(--cds-text-secondary); }
    .ws-stub__head h1 { margin: 0; font-size: var(--cds-productive-heading-05-font-size,2rem); font-weight: 300; color: var(--cds-text-primary); }
    .ws-stub__sub { margin: 0; color: var(--cds-text-secondary); }
    .ws-stub__msg { margin: 0 0 var(--cds-spacing-04,.75rem) 0; font-size: var(--cds-body-02-font-size,.9375rem); color: var(--cds-text-primary); }
    .ws-stub__back { display: inline-block; margin-top: var(--cds-spacing-04,.75rem); }
  `],
})
export class WorkspaceStubComponent {
  /** When non-empty, shown as eyebrow instead of resolving `eyebrowKey` (e.g. DNA contextual copy). */
  @Input() eyebrow: string | null | undefined;

  /** i18n key via WorkspaceResolverService; default matches workspace nav eyebrow. */
  @Input() eyebrowKey = 'workspace.eyebrow';

  @Input() title = '';
  @Input() description = '';
  readonly cfg = inject(WorkspaceShellConfigService);
  private readonly resolver = inject(WorkspaceResolverService);

  readonly eyebrowText = computed(() => {
    const literal = this.eyebrow;
    if (literal != null && String(literal).trim() !== '') {
      return String(literal).trim();
    }
    return this.resolver.string(this.eyebrowKey);
  });

  readonly wiringMsg = computed(() => this.resolver.string('workspace.stub.wiring'));

  readonly emptyMsg = computed(() => this.resolver.string('workspace.stub.empty'));

  readonly backMsg = computed(() => this.resolver.string('workspace.stub.back'));

  readonly homeRoutePath = computed(() => {
    const raw =
      this.resolver.shellChromeString('shell.header.home_route') ??
      '/workspace-home';
    return raw.startsWith('/') ? raw : `/${raw}`;
  });
}
