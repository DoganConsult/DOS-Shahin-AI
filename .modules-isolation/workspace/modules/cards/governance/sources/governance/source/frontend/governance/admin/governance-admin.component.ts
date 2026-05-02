import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-governance-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="governance-admin">
      <h2>Governance Administration</h2>
      <section><h3>Body Management</h3></section>
      <section><h3>Committee Configuration</h3></section>
      <section><h3>RACI Templates</h3></section>
      <section><h3>Oversight Rules</h3></section>
    </div>
  `,
})
export class GovernanceAdminComponent {}
