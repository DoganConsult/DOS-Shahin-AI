import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { BootstrapStore } from '../../../../core/services/platform/bootstrap.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-home-redirect',
  standalone: true,
  template: `<div style="padding: 48px; text-align: center; color: #94a3b8;">Loading workspace…</div>`,
})
export class AppHomeRedirectComponent implements OnInit {
  private router = inject(Router);
  private store = inject(BootstrapStore);

  async ngOnInit(): Promise<void> {
    // DB-driven landing route only (dos.tenant_landing_config via UI-OS).
    // null/'/' = operator has not seeded; render empty/no-op (NO FRONTEND
    // INVENTION per AGENTS.md). Do not fabricate a fallback route.
    const landing = this.store.landingPage();
    if (landing && landing !== '/') {
      await this.router.navigateByUrl(landing);
    }
  }
}
