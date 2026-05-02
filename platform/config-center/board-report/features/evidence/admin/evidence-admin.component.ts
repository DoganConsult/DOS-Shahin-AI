import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-evidence-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="evidence-admin">
      <h2>Evidence Administration</h2>
      <section><h3>Collection Configuration</h3></section>
      <section><h3>Retention Policies</h3></section>
      <section><h3>Freshness Rules</h3></section>
    </div>
  `,
})
export class EvidenceAdminComponent {}
