import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-provisioning-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="provisioning-admin">
      <h2>Provisioning Administration</h2>
      <section class="admin-section">
        <h3>Settings</h3>
      </section>
      <section class="admin-section">
        <h3>Runtime Controls</h3>
      </section>
      <section class="admin-section">
        <h3>Runbook &amp; Diagnostics</h3>
      </section>
    </div>
  `,
})
export class ProvisioningAdminComponent {}
