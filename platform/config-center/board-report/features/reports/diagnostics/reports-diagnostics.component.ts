import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { ReportDiagnosticsContract } from '../contracts/reports.contracts';

@Component({
  selector: 'app-reports-diagnostics', standalone: true, imports: [CommonModule],
  template: `
    <div class="reports-diagnostics">
      <h2>Reporting Diagnostics</h2>
      <div *ngIf="loading">Loading…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>
      <ng-container *ngIf="diag">
        <section><h3>Health: {{ diag.healthy ? 'Healthy' : 'Degraded' }}</h3>
          <p>Total reports: {{ diag.totalReports }}</p><p>Failed generations: <strong>{{ diag.failedGenerations }}</strong></p>
          <p>Stale schedules: <strong>{{ diag.staleSchedules }}</strong></p><p>Pending distributions: {{ diag.pendingDistributions }}</p>
        </section>
        <section *ngIf="diag.checks?.length"><h3>Checks</h3>
          <ul><li *ngFor="let c of diag.checks"><strong>{{ c.name }}</strong>: {{ c.passed ? 'PASS' : 'FAIL' }}<span *ngIf="c.detail"> — {{ c.detail }}</span></li></ul>
        </section>
      </ng-container>
    </div>
  `,
})
export class ReportsDiagnosticsComponent implements OnInit {
  private readonly http = inject(HttpClient); loading = false; error: string | null = null; diag: ReportDiagnosticsContract | null = null;
  ngOnInit(): void {
    this.loading = true;
    this.http.get<{ data: ReportDiagnosticsContract }>('/api/reports/diagnostics').subscribe({
      next: (res) => { this.diag = res.data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
