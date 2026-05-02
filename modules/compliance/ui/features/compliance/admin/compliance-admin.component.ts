import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-compliance-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="compliance-admin">
      <h2>Compliance Administration</h2>
      <section><h3>Framework Management</h3></section>
      <section><h3>Obligation Configuration</h3></section>
      <section><h3>Attestation Campaigns</h3></section>
      <section><h3>Scoring Configuration</h3></section>
    </div>
  `,
})
export class ComplianceAdminComponent {}
