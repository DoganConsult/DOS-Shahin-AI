import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({ selector: 'app-reports-admin', standalone: true, imports: [CommonModule],
  template: `<div class="reports-admin"><h2>Reporting Administration</h2>
    <section><h3>Report Template Management</h3></section><section><h3>Schedule Configuration</h3></section>
    <section><h3>Distribution Channel Settings</h3></section><section><h3>Export Format Policies</h3></section>
    <section><h3>Retention Rules</h3></section></div>`,
})
export class ReportsAdminComponent {}
