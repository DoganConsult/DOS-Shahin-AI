import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-risk-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-admin">
      <h2>Risk Administration</h2>

      <section>
        <h3>Scoring Model Configuration</h3>
        <div *ngIf="loading">Loading…</div>
        <div *ngIf="!loading && models.length">
          <table>
            <thead><tr><th>Model</th><th>Status</th><th>Risks Covered</th></tr></thead>
            <tbody>
              <tr *ngFor="let m of models">
                <td>{{ m.name }}</td>
                <td>{{ m.status }}</td>
                <td>{{ m.riskCount }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section><h3>Risk Category Management</h3></section>
      <section><h3>Appetite Threshold Configuration</h3></section>
      <section><h3>KRI Collection Policies</h3></section>
      <section><h3>Treatment Strategy Rules</h3></section>
    </div>
  `,
})
export class RiskAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  loading = false;
  models: any[] = [];

  ngOnInit(): void {
    this.loading = true;
    this.http.get<{ data: any[] }>('/api/risk/admin/scoring-models').subscribe({
      next: (res) => { this.models = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
