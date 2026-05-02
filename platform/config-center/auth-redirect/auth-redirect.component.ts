import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Canonical public login/register: browser redirect to Keycloak via auth-service OIDC.
 * Routes `/login` and `/register` use this component — not the email/password UI in `LoginComponent`.
 */
@Component({
  selector: 'app-auth-redirect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class AuthRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const mode = this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login';
    window.location.href = `/api/auth/oidc/start?mode=${mode}`;
  }
}
