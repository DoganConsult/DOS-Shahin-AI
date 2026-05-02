import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  TilesModule,
  NotificationModule,
  LinkModule,
  RadioModule,
} from 'carbon-components-angular';

import { LocaleService, type SupportedLocale } from '../../shell/locale.service';

interface LocaleChoice {
  code: SupportedLocale;
  label: string;
  nativeLabel: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TilesModule,
    NotificationModule,
    LinkModule,
    RadioModule,
  ],
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Settings</h1>
        <p>Personal preferences for this device. Tenant-level settings live under Tenant Settings.</p>
      </header>

      <cds-inline-notification
        [notificationObj]="{ type: 'info', title: 'Per-browser preferences', subtitle: 'Stored in localStorage on this device. Once Foundation /me-prefs is wired, these will hydrate from your tenant user-prefs API.', lowContrast: true, showClose: false }"
      ></cds-inline-notification>

      <h2 class="page__h2">Language</h2>
      <p class="page__hint">Switches page direction (LTR/RTL) and language tag.</p>
      <fieldset class="cds-radio-group">
        <legend class="cds--visually-hidden">Language</legend>
        @for (choice of choices; track choice.code) {
          <label class="cds-radio">
            <input
              type="radio"
              name="locale"
              [checked]="locale.locale() === choice.code"
              (change)="locale.set(choice.code)"
            />
            <span class="cds-radio__body">
              <strong>{{ choice.label }}</strong>
              <span class="cds-radio__native">{{ choice.nativeLabel }}</span>
            </span>
          </label>
        }
      </fieldset>

      <h2 class="page__h2">Defaults</h2>
      <div class="page__grid page__grid--3">
        <cds-tile>
          <p class="metric__label">Timezone</p>
          <strong class="metric__value">Asia/Riyadh</strong>
        </cds-tile>
        <cds-tile>
          <p class="metric__label">Currency</p>
          <strong class="metric__value">SAR</strong>
        </cds-tile>
        <cds-tile>
          <p class="metric__label">Date format</p>
          <strong class="metric__value">yyyy-MM-dd</strong>
        </cds-tile>
      </div>

      <h2 class="page__h2">Notifications</h2>
      <cds-inline-notification
        [notificationObj]="{ type: 'info', title: 'Coming soon', subtitle: 'Email digests, in-app alerts, and weekly summary preferences will land here when notification-service is reachable from this workspace.', lowContrast: true, showClose: false }"
      ></cds-inline-notification>

      <h2 class="page__h2">Session</h2>
      <p>To sign out, use the account menu in the header, or
        <a cdsLink href="/api/auth/logout">click here to log out now</a>.
      </p>
      <p>Tenant-wide settings:
        <a cdsLink routerLink="/tenant-settings">Open Tenant Settings →</a>
      </p>
    </section>
  `,
  styles: [`
    .page {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      padding: var(--cds-spacing-05, 1rem);
      max-width: 900px;
      margin-inline: auto;
    }
    .page__head h1 {
      margin: 0 0 var(--cds-spacing-03, .5rem) 0;
      font-size: var(--cds-productive-heading-05-font-size, 2rem);
      font-weight: 300;
      color: var(--cds-text-primary);
    }
    .page__head p { margin: 0; color: var(--cds-text-secondary); }
    .page__h2 {
      margin: var(--cds-spacing-03, .5rem) 0 0 0;
      font-size: var(--cds-productive-heading-03-font-size, 1.125rem);
      font-weight: 600;
      color: var(--cds-text-primary);
    }
    .page__hint { margin: 0; color: var(--cds-text-secondary); font-size: var(--cds-body-01-font-size, .875rem); }
    .page__grid { display: grid; gap: var(--cds-spacing-05, 1rem); }
    .page__grid--3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .page p { margin: 0; }

    .cds-radio-group {
      border: 0; padding: 0; margin: 0;
      display: grid; gap: var(--cds-spacing-03, .5rem);
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .cds-radio {
      display: flex; align-items: center; gap: var(--cds-spacing-03, .5rem);
      padding: var(--cds-spacing-04, .75rem);
      background: var(--cds-layer-01); border: 1px solid var(--cds-border-subtle-01);
      border-radius: 4px; cursor: pointer;
    }
    .cds-radio:has(input:checked) {
      border-color: var(--cds-focus, #0f62fe);
      box-shadow: 0 0 0 1px var(--cds-focus, #0f62fe);
    }
    .cds-radio__body { display: flex; flex-direction: column; }
    .cds-radio__body strong { font-size: var(--cds-body-02-font-size, .9375rem); color: var(--cds-text-primary); }
    .cds-radio__native { font-size: var(--cds-label-01-font-size, .75rem); color: var(--cds-text-secondary); }

    .metric__label {
      margin: 0 0 var(--cds-spacing-02, .25rem) 0;
      font-size: var(--cds-label-01-font-size, .75rem);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--cds-text-secondary);
    }
    [dir='rtl'] .metric__label { letter-spacing: 0; text-transform: none; }
    .metric__value {
      display: block;
      font-size: var(--cds-productive-heading-03-font-size, 1.125rem);
      font-weight: 400;
      color: var(--cds-text-primary);
    }
  `],
})
export class SettingsComponent {
  readonly locale = inject(LocaleService);

  readonly choices: LocaleChoice[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ar', label: 'Arabic',  nativeLabel: 'العربية' },
  ];
}
