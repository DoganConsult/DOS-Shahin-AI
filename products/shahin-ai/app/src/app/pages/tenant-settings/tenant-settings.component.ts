import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  TilesModule,
  NotificationModule,
  ButtonModule,
  TagModule,
  LinkModule,
} from 'carbon-components-angular';

import { AccessStore } from '@dos/access-store';

interface SettingsSection {
  key: string;
  title: string;
  summary: string;
  status: 'placeholder' | 'coming-soon';
  route?: string;
  icon: string;
  tone: 'blue' | 'purple' | 'cyan' | 'teal' | 'green' | 'magenta' | 'gray';
}

const SECTIONS: ReadonlyArray<SettingsSection> = [
  { key: 'workspace',    title: 'Workspace',                 summary: 'Display name, hosts, timezone, default locale, brand colors.',   status: 'placeholder', icon: '◈',  tone: 'blue'    },
  { key: 'entitlements', title: 'Modules & Entitlements',    summary: 'Which modules are enabled for this tenant; plan tier; seat counts.', status: 'placeholder', icon: '⊞', tone: 'cyan'    },
  { key: 'sso',          title: 'SSO & Identity Provider',   summary: 'Keycloak realm binding, IdP claims mapping, MFA policy.',         status: 'placeholder', icon: '⌬',  tone: 'purple'  },
  { key: 'email',        title: 'Email & Integrations',      summary: 'Outbound SMTP, transactional sender, integration webhooks.',      status: 'placeholder', icon: '✉',  tone: 'teal'    },
  { key: 'risk',         title: 'Risk Model',                summary: 'Heatmap dimensions, scoring weights, treatment thresholds.',     status: 'coming-soon', icon: '⚠',  tone: 'magenta' },
  { key: 'raci',         title: 'RACI & Authority Matrix',   summary: 'Default RACI assignments, owner approvers, segregation-of-duty.',status: 'coming-soon', icon: '◉',  tone: 'green'   },
  { key: 'cadence',      title: 'Cadence Overrides',         summary: 'Review cycles, attestation calendars, evidence schedules.',      status: 'coming-soon', icon: '◷',  tone: 'gray'    },
  { key: 'history',      title: 'Configuration History',     summary: 'Audit trail of tenant-config changes (who, when, what).',        status: 'coming-soon', icon: '↺',  tone: 'gray'    },
];

@Component({
  selector: 'app-tenant-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    TilesModule,
    NotificationModule,
    ButtonModule,
    TagModule,
    LinkModule,
  ],
  template: `
    <section class="ts-page" data-density="cozy">

      <header class="ts-hero">
        <p class="ts-eyebrow">{{ tenantLabel() }} · administration</p>
        <h1 class="ts-title">Tenant Settings</h1>
        <p class="ts-subtitle">{{ descriptionText() }}</p>
      </header>

      @if (!access.loaded()) {
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: 'Loading tenant configuration', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
      } @else {
        <cds-inline-notification
          [notificationObj]="{ type: 'info', title: 'Service status', subtitle: 'Tenant configuration service is not yet wired. Sections below will activate as their APIs come online.', lowContrast: true, showClose: false }"
        ></cds-inline-notification>
        <p class="ts-link-row">
          <a cdsLink routerLink="/tenant-profile">View read-only tenant profile →</a>
        </p>

        <section class="ts-section">
          <header class="ts-section__head">
            <p class="ts-eyebrow ts-eyebrow--small">configuration</p>
            <h2>Sections</h2>
          </header>

          <div class="ts-grid">
            @for (s of sections; track s.key) {
              <cds-tile class="ts-card" [class.ts-card--soon]="s.status === 'coming-soon'">
                <header class="ts-card__head">
                  <span class="ts-icon" aria-hidden="true">{{ s.icon }}</span>
                  <cds-tag [type]="s.tone" size="sm">
                    {{ s.status === 'coming-soon' ? 'COMING SOON' : 'PLACEHOLDER' }}
                  </cds-tag>
                </header>
                <h3 class="ts-card__title">{{ s.title }}</h3>
                <p class="ts-card__summary">{{ s.summary }}</p>
                <footer class="ts-card__cta">
                  <button
                    cdsButton
                    [ngClass]="s.status === 'coming-soon' ? 'cds--btn--ghost' : 'cds--btn--primary'"
                    size="md"
                    [disabled]="s.status === 'coming-soon'"
                    (click)="open(s)"
                  >
                    {{ s.status === 'coming-soon' ? '⌛ Locked' : 'Open →' }}
                  </button>
                </footer>
              </cds-tile>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: [`
    .ts-page {
      padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem);
      max-width: 1280px;
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06, 1.5rem);
      color: var(--cds-text-primary);
      background: var(--cds-background, #fff);
    }

    .ts-hero {
      padding: var(--cds-spacing-07, 2rem) var(--cds-spacing-06, 1.5rem);
      border-radius: 8px;
      background: var(--cds-layer-01, #f4f4f4);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    }
    .ts-eyebrow {
      margin: 0 0 var(--cds-spacing-03, .5rem) 0;
      font-size: var(--cds-label-01-font-size, .75rem);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--cds-text-secondary);
    }
    [dir='rtl'] .ts-eyebrow { letter-spacing: 0; text-transform: none; }
    .ts-eyebrow--small { font-size: .6875rem; }
    .ts-title {
      margin: 0;
      font-size: var(--cds-display-01-font-size, 2.25rem);
      font-weight: 300;
      color: var(--cds-text-primary);
    }
    .ts-subtitle {
      margin: var(--cds-spacing-03, .5rem) 0 0 0;
      color: var(--cds-text-secondary);
      max-width: 60ch;
    }
    .ts-link-row { margin: 0; }

    .ts-section { display: flex; flex-direction: column; gap: var(--cds-spacing-04, .75rem); }
    .ts-section__head { display: flex; flex-direction: column; gap: 4px; }
    .ts-section__head h2 {
      margin: 0;
      font-size: var(--cds-productive-heading-04-font-size, 1.5rem);
      font-weight: 400;
      color: var(--cds-text-primary);
    }

    .ts-grid {
      display: grid;
      gap: var(--cds-spacing-04, .75rem);
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .ts-card { min-height: 200px; display: flex; flex-direction: column; gap: var(--cds-spacing-03, .5rem); }
    .ts-card--soon { opacity: 0.92; }

    .ts-card__head {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--cds-spacing-03, .5rem); margin-bottom: var(--cds-spacing-03, .5rem);
    }
    .ts-icon {
      width: 40px; height: 40px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 4px;
      font-size: 1.5rem; font-weight: 300; line-height: 1;
      color: var(--cds-link-primary, #0f62fe);
      background: var(--cds-layer-02, #fff);
      border: 1px solid var(--cds-border-subtle-01, #e0e0e0);
    }
    .ts-card__title {
      margin: 0;
      font-size: var(--cds-productive-heading-03-font-size, 1.125rem);
      font-weight: 600;
      color: var(--cds-text-primary);
    }
    .ts-card__summary {
      margin: 0;
      font-size: var(--cds-body-01-font-size, .875rem);
      color: var(--cds-text-secondary);
      line-height: 1.4;
    }
    .ts-card__cta { display: flex; width: 100%; justify-content: flex-end; margin-top: auto; }
  `],
})
export class TenantSettingsComponent implements OnInit {
  readonly access = inject(AccessStore);
  private readonly router = inject(Router);
  readonly sections = SECTIONS;

  readonly tenantLabel = computed(() => {
    const t = this.access.me()?.tenant;
    return t?.name || t?.code || 'tenant';
  });

  descriptionText(): string {
    const t = this.access.me()?.tenant;
    const name = t?.name || t?.code || 'this tenant';
    return `Workspace-wide configuration for ${name}. Tenant owner / admin only.`;
  }

  open(s: SettingsSection): void {
    if (s.status === 'coming-soon') return;
    if (s.route) this.router.navigate([s.route]);
  }

  ngOnInit(): void {
    void this.access.load();
  }
}
