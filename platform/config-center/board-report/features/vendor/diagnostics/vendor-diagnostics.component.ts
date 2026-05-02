import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { VendorDiagnosticsContract } from '../contracts/vendor.contracts';

@Component({
  selector: 'app-vendor-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vendor-diagnostics">
      <h2>Vendor Diagnostics</h2>
      <div *ngIf="loading">Loading diagnostics…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>
      <ng-container *ngIf="diag">
        <section>
          <h3>Health: {{ diag.healthy ? 'Healthy' : 'Degraded' }}</h3>
          <p>Total vendors: {{ diag.totalVendors }}</p>
          <p>Expired contracts: <strong>{{ diag.expiredContracts }}</strong></p>
          <p>Overdue assessments: <strong>{{ diag.overdueAssessments }}</strong></p>
          <p>Critical tier: {{ diag.criticalTierVendors }}</p>
          <p>Stale onboarding: {{ diag.staleOnboarding }}</p>
        </section>
        <section *ngIf="diag.checks?.length">
          <h3>Checks</h3>
          <ul>
            <li *ngFor="let c of diag.checks" [class.passed]="c.passed" [class.failed]="!c.passed">
              <strong>{{ c.name }}</strong>: {{ c.passed ? 'PASS' : 'FAIL' }}
              <span *ngIf="c.detail"> — {{ c.detail }}</span>
            </li>
          </ul>
        </section>
      </ng-container>
    </div>
  `,
})
export class VendorDiagnosticsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  loading = false;
  error: string | null = null;
  diag: VendorDiagnosticsContract | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.http.get<{ data: VendorDiagnosticsContract }>('/api/vendor/diagnostics').subscribe({
      next: (res) => { this.diag = res.data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
