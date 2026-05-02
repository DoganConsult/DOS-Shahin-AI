import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="policy-admin">
      <h2>Policy Administration</h2>
      <section><h3>Policy Type Configuration</h3></section>
      <section><h3>Review Cycle Settings</h3></section>
      <section><h3>Approval Workflow Rules</h3></section>
      <section><h3>Acknowledgement Policies</h3></section>
      <section><h3>Retirement Rules</h3></section>
    </div>
  `,
})
export class PolicyAdminComponent {}
