import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TilesModule, NotificationModule, LinkModule } from 'carbon-components-angular';
import { WorkspaceShellConfigService } from '../../shell/workspace-shell-config.service';

const I18N: Record<'en'|'ar', Record<string,string>> = {
  en: { back: 'Back to command center', wiring: 'This surface is wired and ready. Backend data feed is being connected.', empty: 'No items yet.' },
  ar: { back: 'العودة إلى مركز القيادة', wiring: 'هذا السطح جاهز. يجري ربط مصدر البيانات.', empty: 'لا توجد عناصر بعد.' },
};

@Component({
  selector: 'app-workspace-stub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, TilesModule, NotificationModule, LinkModule],
  template: `
    <section class="ws-stub" [attr.dir]="cfg.direction()">
      <header class="ws-stub__head">
        <p class="ws-stub__eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p class="ws-stub__sub">{{ description }}</p>
      </header>

      <cds-tile>
        <p class="ws-stub__msg">{{ t().wiring }}</p>
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: t().empty, lowContrast: true, showClose: false }"
        ></cds-inline-notification>
        <a cdsLink routerLink="/workspace-home" class="ws-stub__back">← {{ t().back }}</a>
      </cds-tile>
    </section>
  `,
  styles: [`
    .ws-stub { padding: var(--cds-spacing-07,2rem) var(--cds-spacing-06,1.5rem); max-width: 1100px; margin-inline: auto; display: flex; flex-direction: column; gap: var(--cds-spacing-06,1.5rem); }
    .ws-stub__head { display: flex; flex-direction: column; gap: var(--cds-spacing-03,.25rem); }
    .ws-stub__eyebrow { margin: 0; font-size: var(--cds-label-01-font-size,.75rem); letter-spacing: .16em; text-transform: uppercase; color: var(--cds-text-secondary); }
    .ws-stub__head h1 { margin: 0; font-size: var(--cds-productive-heading-05-font-size,2rem); font-weight: 300; color: var(--cds-text-primary); }
    .ws-stub__sub { margin: 0; color: var(--cds-text-secondary); }
    .ws-stub__msg { margin: 0 0 var(--cds-spacing-04,.75rem) 0; font-size: var(--cds-body-02-font-size,.9375rem); color: var(--cds-text-primary); }
    .ws-stub__back { display: inline-block; margin-top: var(--cds-spacing-04,.75rem); }
  `],
})
export class WorkspaceStubComponent {
  @Input() eyebrow = 'workspace';
  @Input() title = '';
  @Input() description = '';
  readonly cfg = inject(WorkspaceShellConfigService);
  readonly t = computed(() => I18N[this.cfg.locale()]);
}
