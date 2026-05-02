import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Public login/register: browser-level redirect to Keycloak via auth-service OIDC.
 *
 * Routes `/login` and `/register` resolve to this component. ngOnInit reads the
 * `mode` from route data and navigates the window to `/api/auth/oidc/start`,
 * which the gateway proxies to auth-service. auth-service (platform/dauth)
 * builds the Keycloak authorize URL with PKCE and returns a 302.
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
