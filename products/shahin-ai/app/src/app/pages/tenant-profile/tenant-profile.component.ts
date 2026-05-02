import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  TilesModule,
  NotificationModule,
  ButtonModule,
  LinkModule,
} from 'carbon-components-angular';

import { AccessStore } from '@dos/access-store';

@Component({
  selector: 'app-tenant-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TilesModule,
    NotificationModule,
    ButtonModule,
    LinkModule,
  ],
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Tenant Profile</h1>
        <p>Identity and entitlement summary for the active workspace.</p>
      </header>

      @if (deniedTenantAdmin()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'warning', title: 'Tenant Settings is restricted', subtitle: 'You do not have admin or owner permission for this tenant. Contact your tenant owner to make changes.', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      }

      @if (!access.loaded()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: 'Loading…', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      } @else if (!tenant()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'warning', title: 'No tenant in scope', subtitle: 'Your account is not currently linked to a tenant.', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
        <p><a cdsLink href="/api/auth/oidc/start?mode=login">Sign in again</a> if this is unexpected.</p>
      } @else {
        <h2 class="page__h2">Identity</h2>
        <div class="page__grid page__grid--4">
          <cds-tile><p class="metric__label">Tenant</p><strong class="metric__value">{{ tenant()?.name || '—' }}</strong></cds-tile>
          <cds-tile><p class="metric__label">Tenant code</p><strong class="metric__value">{{ tenant()?.code || '—' }}</strong></cds-tile>
          <cds-tile><p class="metric__label">Tenant ID</p><strong class="metric__value">{{ tenant()?.id || '—' }}</strong></cds-tile>
          <cds-tile><p class="metric__label">Status</p><strong class="metric__value">{{ tenant()?.status || '—' }}</strong></cds-tile>
        </div>

        <h2 class="page__h2">Your role</h2>
        <div class="page__grid page__grid--3">
          <cds-tile><p class="metric__label">Role</p><strong class="metric__value">{{ roleLabel() }}</strong></cds-tile>
          <cds-tile><p class="metric__label">Owner</p><strong class="metric__value">{{ isOwner() }}</strong></cds-tile>
          <cds-tile><p class="metric__label">Admin</p><strong class="metric__value">{{ isAdmin() }}</strong></cds-tile>
        </div>

        @if (access.isTenantAdmin()) {
          <p class="page__cta">
            <button cdsButton class="cds--btn--primary" size="md" routerLink="/tenant-settings">
              Open Tenant Settings →
            </button>
          </p>
        } @else {
          <p class="page__hint">Tenant Settings is owner/admin only.</p>
        }

        <h2 class="page__h2">Enabled modules</h2>
        @if (access.modules().length === 0) {
          <cds-tile><p class="empty">No modules enabled for this tenant.</p></cds-tile>
        } @else {
          <div class="page__grid page__grid--3">
            @for (m of access.modules(); track m) {
              <cds-clickable-tile>
                <p class="metric__label">Module</p>
                <strong class="metric__value">{{ m }}</strong>
                <p class="metric__desc">Visible because this tenant is entitled to use this module.</p>
                <p class="metric__cta">View →</p>
              </cds-clickable-tile>
            }
          </div>
        }

        <h2 class="page__h2">Workspace defaults</h2>
        <div class="page__grid page__grid--4">
          <cds-tile><p class="metric__label">Default locale</p><strong class="metric__value">en</strong></cds-tile>
          <cds-tile><p class="metric__label">Default timezone</p><strong class="metric__value">Asia/Riyadh</strong></cds-tile>
          <cds-tile><p class="metric__label">Currency</p><strong class="metric__value">SAR</strong></cds-tile>
          <cds-tile><p class="metric__label">Date format</p><strong class="metric__value">yyyy-MM-dd</strong></cds-tile>
        </div>
      }
    </section>
  `,
  styles: [`
    .page {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      padding: var(--cds-spacing-05, 1rem);
      max-width: 1280px;
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
    .page__cta { margin: 0; }
    .page__grid { display: grid; gap: var(--cds-spacing-05, 1rem); }
    .page__grid--3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .page__grid--4 { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }

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
    .metric__desc {
      display: block; margin: var(--cds-spacing-03, .5rem) 0 0 0;
      font-size: var(--cds-body-01-font-size, .875rem);
      color: var(--cds-text-secondary);
    }
    .metric__cta {
      display: block; margin: var(--cds-spacing-03, .5rem) 0 0 0;
      font-size: var(--cds-label-01-font-size, .75rem);
      font-weight: 600;
      color: var(--cds-link-primary, #0f62fe);
    }
    .empty { color: var(--cds-text-secondary); margin: 0; }
  `],
})
export class TenantProfileComponent implements OnInit {
  readonly access = inject(AccessStore);
  private readonly route = inject(ActivatedRoute);

  readonly tenant = computed(() => this.access.me()?.tenant ?? null);
  readonly roleLabel = computed(() => this.access.me()?.membership?.roleCode || '—');
  readonly isOwner = computed(() => (this.access.me()?.membership?.isOwner ? 'Yes' : 'No'));
  readonly isAdmin = computed(() => (this.access.isTenantAdmin() ? 'Yes' : 'No'));

  readonly deniedTenantAdmin = computed(
    () => this.route.snapshot.queryParamMap.get('denied') === 'tenant-admin',
  );

  ngOnInit(): void {
    void this.access.load();
  }
}
