import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TilesModule,
  NotificationModule,
  TagModule,
  LinkModule,
  GridModule,
} from 'carbon-components-angular';

import { AccessStore } from '@dos/access-store';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TilesModule,
    NotificationModule,
    TagModule,
    LinkModule,
    GridModule,
  ],
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Profile</h1>
        <p>Your signed-in identity and active tenant membership.</p>
      </header>

      @if (!access.loaded()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: 'Loading…', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      } @else if (!access.me()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'warning', title: 'No session data', subtitle: 'Could not load your profile.', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
        <p><a cdsLink href="/api/auth/oidc/start?mode=login">Sign in again</a>.</p>
      } @else {
        <div class="page__grid page__grid--3">
          <cds-tile>
            <p class="metric__label">Name</p>
            <strong class="metric__value">{{ userName() }}</strong>
          </cds-tile>
          <cds-tile>
            <p class="metric__label">Email</p>
            <strong class="metric__value">{{ userEmail() }}</strong>
          </cds-tile>
          <cds-tile>
            <p class="metric__label">User ID</p>
            <strong class="metric__value">{{ userId() }}</strong>
          </cds-tile>
        </div>

        <div class="page__grid page__grid--3">
          <cds-tile>
            <p class="metric__label">Tenant</p>
            <strong class="metric__value">{{ tenantName() }}</strong>
          </cds-tile>
          <cds-tile>
            <p class="metric__label">Tenant code</p>
            <strong class="metric__value">{{ tenantCode() }}</strong>
          </cds-tile>
          <cds-tile>
            <p class="metric__label">Role</p>
            <strong class="metric__value">{{ roleLabel() }}</strong>
          </cds-tile>
        </div>

        @if (otherMemberships().length > 0) {
          <h2 class="page__h2">Other memberships</h2>
          <div class="page__grid page__grid--2">
            @for (m of otherMemberships(); track m.tenantId) {
              <cds-tile>
                <p class="metric__label">{{ m.code || m.tenantId || '—' }}</p>
                <strong class="metric__value">
                  {{ (m.name || m.code || '—') + ' · ' + (m.roleCode || '—') + (m.isOwner ? ' (owner)' : '') }}
                </strong>
              </cds-tile>
            }
          </div>
        }

        <h2 class="page__h2">Permissions</h2>
        @if (access.permissions().length === 0) {
          <cds-tile>
            <p class="empty">No permissions assigned.</p>
          </cds-tile>
        } @else {
          <div class="page__chips" role="list">
            @for (p of access.permissions(); track p) {
              <cds-tag type="cool-gray" size="sm">{{ p }}</cds-tag>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [`
    .page {
      display: grid;
      gap: var(--cds-spacing-05, 1rem);
      padding: var(--cds-spacing-05, 1rem);
      max-width: 1100px;
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
    .page__grid { display: grid; gap: var(--cds-spacing-05, 1rem); }
    .page__grid--3 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .page__grid--2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
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
    .page__chips { display: flex; gap: var(--cds-spacing-02, .25rem); flex-wrap: wrap; }
    .empty { color: var(--cds-text-secondary); margin: 0; }
  `],
})
export class ProfileComponent implements OnInit {
  readonly access = inject(AccessStore);

  readonly userName = computed(() => this.access.me()?.user?.name || '—');
  readonly userEmail = computed(() => this.access.me()?.user?.email || '—');
  readonly userId = computed(() => this.access.me()?.user?.id || '—');
  readonly tenantName = computed(() => this.access.me()?.tenant?.name || '—');
  readonly tenantCode = computed(() => this.access.me()?.tenant?.code || '—');
  readonly roleLabel = computed(() => {
    const m = this.access.me()?.membership;
    if (!m) return '—';
    return m.isOwner ? `${m.roleCode || 'owner'} (owner)` : (m.roleCode || '—');
  });

  readonly otherMemberships = computed(() => {
    const me = this.access.me();
    if (!me?.memberships || !me.tenant?.id) return [];
    return me.memberships.filter((m) => m.tenantId !== me.tenant?.id);
  });

  ngOnInit(): void {
    void this.access.load();
  }
}
