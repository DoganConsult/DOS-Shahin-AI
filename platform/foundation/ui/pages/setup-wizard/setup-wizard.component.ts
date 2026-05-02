import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Setup Wizard redirect — the real implementation lives at /journey/setup-wizard.
 * This component redirects users who land on /setup-wizard to the correct route.
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-setup-wizard',
    imports: [CommonModule],
    template: `<p style="padding:24px;color:var(--text-muted)">Redirecting to setup wizard...</p>`
})
export class SetupWizardPageComponent implements OnInit {
  constructor(private router: Router) {}
  ngOnInit(): void {
    this.router.navigate(['/journey', 'setup']);
  }
}
