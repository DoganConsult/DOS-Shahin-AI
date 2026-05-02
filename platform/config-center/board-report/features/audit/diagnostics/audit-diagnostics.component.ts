import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { AuditDiagnosticsContract } from '../contracts/audit.contracts';

@Component({
  selector: 'app-audit-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-diagnostics">
      <h2>Audit Diagnostics</h2>
      <div *ngIf="loading">Loading diagnostics…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>
      <ng-container *ngIf="diag">
        <section>
          <h3>Health: {{ diag.healthy ? 'Healthy' : 'Degraded' }}</h3>
          <p>Total engagements: {{ diag.totalEngagements }}</p>
          <p>Overdue engagements: <strong>{{ diag.overdueEngagements }}</strong></p>
          <p>Open findings: <strong>{{ diag.openFindings }}</strong></p>
          <p>Repeat findings: <strong>{{ diag.repeatFindings }}</strong></p>
          <p>Stale fieldwork: {{ diag.staleFieldwork }}</p>
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
export class AuditDiagnosticsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  loading = false;
  error: string | null = null;
  diag: AuditDiagnosticsContract | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.http.get<{ data: AuditDiagnosticsContract }>('/api/audit/diagnostics').subscribe({
      next: (res) => { this.diag = res.data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
