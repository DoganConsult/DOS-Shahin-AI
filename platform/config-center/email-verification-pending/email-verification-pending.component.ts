import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DosLanguageSwitcherComponent } from '@dos/ui-system';
import { StorageService } from '@app/infrastructure';
import { WebSocketService } from '@app/websocket';

@Component({
  selector: 'app-email-verification-pending',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule, CardModule, DosLanguageSwitcherComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pending-page">
      <div class="auth-top-bar">
        <a routerLink="/">Home</a>
        <dos-language-switcher variant="light" />
      </div>
      <div class="pending-card">
        <i class="pi pi-envelope" style="font-size:48px;color:var(--primary)"></i>
        <h2>Email verification pending</h2>
        <p>We've sent a verification link to your inbox.</p>
        <p *ngIf="email">Email: <strong>{{ email }}</strong></p>
        <div class="actions">
          <p-button label="Go to login" icon="pi pi-sign-in" routerLink="/login"></p-button>
          <p-button label="Back to register" icon="pi pi-user-plus" severity="secondary" routerLink="/register"></p-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pending-page { min-height: 100vh; display:flex; align-items:center; justify-content:center; background: var(--surface-sunken); position:relative; }
    .auth-top-bar { position:absolute; top:1rem; right:1rem; display:flex; align-items:center; gap:1rem; }
    .auth-top-bar a { color: var(--text-muted); text-decoration:none; }
    .pending-card { max-width: 460px; width:100%; background: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); padding: 2rem; text-align:center; }
    .actions { display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap; margin-top:1rem; }
  `],
})
export class EmailVerificationPendingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);
  private ws = inject(WebSocketService);
  readonly email = this.route.snapshot.queryParamMap.get('email');

  ngOnInit(): void {
    // Ensure public verification-pending page doesn't keep stale authenticated session side effects.
    this.ws.disconnect();
    this.storage.remove('grc_token');
    this.storage.remove('grc_refreshToken');
    this.storage.remove('grc_role');
    this.storage.remove('grc_tenantId');
  }
}

