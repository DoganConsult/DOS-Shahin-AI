import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'carbon-components-angular/button';
import { InputModule } from 'carbon-components-angular/input';
import { NotificationModule } from 'carbon-components-angular/notification';
import { PlatformAdminApiService } from './platform-admin-api.service';

@Component({
  selector: 'app-platform-admin-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonModule, InputModule, NotificationModule],
  template: `
    <main class="cds--content" style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f4f4f4">
      <section style="background:#fff;padding:2rem;width:420px;max-width:90vw;border:1px solid #e0e0e0">
        <h1 class="cds--type-productive-heading-04" style="margin:0 0 .25rem">DOS Master · Platform Admin</h1>
        <p class="cds--type-body-long-01" style="color:#525252;margin:0 0 1.5rem">
          Internal validation workspace. Sign in with your provisioned platform-admin email.
        </p>
        <cds-text-label>
          Email
          <input cdsText
                 type="email"
                 placeholder="name@example.com"
                 [(ngModel)]="email"
                 (keyup.enter)="signIn()"
                 [disabled]="busy()"
                 data-testid="platform-admin-email" />
        </cds-text-label>
        <div style="margin-top:1.5rem;display:flex;gap:.5rem">
          <button cdsButton="primary"
                  (click)="signIn()"
                  [disabled]="busy() || !email.trim()"
                  data-testid="platform-admin-signin">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </div>
        @if (error(); as err) {
          <div style="margin-top:1.5rem">
            <cds-notification
              [notificationObj]="{ type: 'error', title: 'Sign-in failed', message: err, lowContrast: true, showClose: false }">
            </cds-notification>
          </div>
        }
      </section>
    </main>
  `,
})
export class PlatformAdminLoginComponent {
  private api = inject(PlatformAdminApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  busy = signal(false);
  error = signal<string | null>(null);

  async signIn(): Promise<void> {
    if (!this.email.trim()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.api.login(this.email.trim().toLowerCase());
      const ret = this.route.snapshot.queryParamMap.get('returnTo') || '/platform-admin/dos-master';
      await this.router.navigateByUrl(ret);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
