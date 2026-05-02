import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vendor-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vendor-admin">
      <h2>Vendor Administration</h2>
      <section><h3>Risk Tier Classification Rules</h3></section>
      <section><h3>Assessment Frequency Policies</h3></section>
      <section><h3>Due Diligence Templates</h3></section>
      <section><h3>Contract Renewal Policies</h3></section>
      <section><h3>Offboarding Checklist Configuration</h3></section>
    </div>
  `,
})
export class VendorAdminComponent {}
