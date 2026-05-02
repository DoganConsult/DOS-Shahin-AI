import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portals-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="portals-admin">
      <h2>Portals Administration</h2>
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
export class PortalsAdminComponent {}
