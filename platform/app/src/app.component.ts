import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<router-outlet />`,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class AppComponent {
  private readonly router = inject(Router);
  constructor() {
    this.router.events.subscribe((e) => {
      if (e instanceof NavigationEnd) {
        // eslint-disable-next-line no-console
        console.info('[platform-app] ROUTE_MATCHED', e.urlAfterRedirects);
      }
    });
  }
}
