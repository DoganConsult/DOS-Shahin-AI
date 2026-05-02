import { Component, inject, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import type { RiskDiagnosticsContract } from '../contracts/risk.contracts';

@Component({
  selector: 'app-risk-diagnostics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="risk-diagnostics">
      <h2>Risk Diagnostics</h2>

      <div *ngIf="loading">Loading diagnostics…</div>
      <div *ngIf="error" class="error" role="alert">{{ error }}</div>

      <ng-container *ngIf="diag">
        <section>
          <h3>Scoring Health</h3>
          <p>Models: {{ diag.scoringHealth.modelsCount }}</p>
          <p>Risks without score: <strong>{{ diag.scoringHealth.risksWithoutScore }}</strong></p>
          <p>Stale scores: <strong>{{ diag.scoringHealth.staleScores }}</strong></p>
        </section>

        <section>
          <h3>KRI Health</h3>
          <p>Total KRIs: {{ diag.kriHealth.totalKris }}</p>
          <p>Breached: <strong>{{ diag.kriHealth.breachedCount }}</strong></p>
          <p>Stale collection: {{ diag.kriHealth.staleCollectionCount }}</p>
          <p>Missing linked risk: {{ diag.kriHealth.missingLinkedRisk }}</p>
        </section>

        <section>
          <h3>Treatment Health</h3>
          <p>Total: {{ diag.treatmentHealth.totalTreatments }}</p>
          <p>Overdue: <strong>{{ diag.treatmentHealth.overdueCount }}</strong></p>
          <p>Pending validation: {{ diag.treatmentHealth.pendingValidationCount }}</p>
          <p>No owner: {{ diag.treatmentHealth.noOwnerCount }}</p>
        </section>

        <section>
          <h3>Approval Health</h3>
          <p>Blocked: {{ diag.approvalHealth.blockedApprovals }}</p>
          <p>Delegated: {{ diag.approvalHealth.delegatedCount }}</p>
          <p>Escalated: {{ diag.approvalHealth.escalatedCount }}</p>
        </section>

        <section *ngIf="diag.warnings.length || diag.errors.length">
          <h3>Issues</h3>
          <ul *ngIf="diag.errors.length"><li *ngFor="let e of diag.errors" class="error">{{ e }}</li></ul>
          <ul *ngIf="diag.warnings.length"><li *ngFor="let w of diag.warnings" class="warning">{{ w }}</li></ul>
        </section>
      </ng-container>
    </div>
  `,
})
export class RiskDiagnosticsComponent implements OnInit, OnChanges {
  @Input() tenantId: string | null = null;
  private readonly http = inject(HttpClient);
  loading = false;
  error: string | null = null;
  diag: RiskDiagnosticsContract | null = null;

  ngOnInit(): void { this.loadDiagnostics(); }
  ngOnChanges(): void { this.loadDiagnostics(); }

  loadDiagnostics(): void {
    this.loading = true;
    this.error = null;
    this.diag = null;
    this.http.get<{ data: RiskDiagnosticsContract }>('/api/risk/diagnostics').subscribe({
      next: (res) => { this.diag = res.data; this.loading = false; },
      error: (err) => { this.error = err?.error?.message ?? 'Diagnostics failed'; this.loading = false; },
    });
  }
}
