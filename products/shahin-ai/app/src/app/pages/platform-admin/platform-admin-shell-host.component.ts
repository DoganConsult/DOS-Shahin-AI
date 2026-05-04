import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UIShellModule } from 'carbon-components-angular/ui-shell';
import { ButtonModule } from 'carbon-components-angular/button';
import { PlatformAdminApiService } from './platform-admin-api.service';

export interface NavEntry { path: string; label: string }

export const PLATFORM_ADMIN_NAV: NavEntry[] = [
  { path: '/platform-admin/dos-master',                 label: 'Overview' },
  { path: '/platform-admin/dos-master/milestones',      label: 'Milestones (M1–M14)' },
  { path: '/platform-admin/dos-master/services',        label: 'Services 4007–4017' },
  { path: '/platform-admin/dos-master/doctrine',        label: 'Doctrine 11/11' },
  { path: '/platform-admin/dos-master/controlled-ddl',  label: 'Controlled DDL' },
  { path: '/platform-admin/dos-master/ppd',             label: 'PPD Rollouts R0–R5' },
  { path: '/platform-admin/dos-master/compensation',    label: 'Compensation' },
  { path: '/platform-admin/dos-master/auto-evaluator',  label: 'Auto Evaluator' },
  { path: '/platform-admin/dos-master/controlled-write',label: 'Controlled Writes' },
  { path: '/platform-admin/dos-master/rollout-ledger',  label: 'Rollout Ledger' },
  { path: '/platform-admin/dos-master/ci-guards',       label: 'CI Guards' },
  { path: '/platform-admin/dos-master/evidence',        label: 'Evidence Pack' },
];

@Component({
  selector: 'app-platform-admin-shell-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, UIShellModule, ButtonModule],
  template: `
    <cds-header brand="DOS Master" name="Platform Admin Workspace">
      <cds-header-global>
        <span style="color:#c6c6c6;font-size:.75rem;margin-right:1rem;align-self:center"
              data-testid="platform-admin-who">
          {{ api.who()?.user?.email || '…' }}
        </span>
        <cds-header-action description="Sign out"
                          (selected)="signOut()"
                          data-testid="platform-admin-signout">
          Sign out
        </cds-header-action>
      </cds-header-global>
    </cds-header>

    <cds-sidenav [expanded]="true"
                 ariaLabel="Platform Admin navigation"
                 style="margin-top:48px"
                 data-testid="platform-admin-sidenav">
      @for (item of nav; track item.path) {
        <cds-sidenav-item [route]="[item.path]"
                          [useRouter]="true"
                          [active]="isActive(item.path)"
                          [attr.data-nav-path]="item.path">
          {{ item.label }}
        </cds-sidenav-item>
      }
    </cds-sidenav>

    <main class="cds--content"
          style="margin-top:48px;margin-inline-start:16rem;padding:2rem;min-height:calc(100vh - 48px);background:#f4f4f4"
          data-testid="platform-admin-main">
      <router-outlet />
    </main>
  `,
})
export class PlatformAdminShellHostComponent implements OnInit {
  api = inject(PlatformAdminApiService);
  private router = inject(Router);
  readonly nav = PLATFORM_ADMIN_NAV;
  url = signal<string>('');

  isActive(path: string): boolean {
    const u = this.url();
    if (path === '/platform-admin/dos-master') return u === path;
    return u === path || u.startsWith(path + '/');
  }

  async ngOnInit(): Promise<void> {
    this.url.set(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.url.set(e.urlAfterRedirects));
    if (!this.api.who()) {
      await this.api.whoami();
    }
  }

  async signOut(): Promise<void> {
    this.api.logout();
    await this.router.navigateByUrl('/platform-admin/login');
  }
}
