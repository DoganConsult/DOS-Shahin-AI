import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { PolicyDiagnosticsContract } from '../contracts/policy.contracts';

@Component({
  selector: 'app-policy-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="policy-diagnostics">
      <h2>Policy Diagnostics</h2>
      <div *ngIf="loading">Loading diagnostics…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>
      <ng-container *ngIf="diag">
        <section>
          <h3>Health: {{ diag.healthy ? 'Healthy' : 'Degraded' }}</h3>
          <p>Total policies: {{ diag.totalPolicies }}</p>
          <p>Overdue reviews: <strong>{{ diag.overdueReviews }}</strong></p>
          <p>Drafts without owner: <strong>{{ diag.draftWithoutOwner }}</strong></p>
          <p>Expired without renewal: <strong>{{ diag.expiredWithoutRenewal }}</strong></p>
          <p>Unacknowledged: {{ diag.unacknowledgedCount }}</p>
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
export class PolicyDiagnosticsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  loading = false;
  error: string | null = null;
  diag: PolicyDiagnosticsContract | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.http.get<{ data: PolicyDiagnosticsContract }>('/api/policy/diagnostics').subscribe({
      next: (res) => { this.diag = res.data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
