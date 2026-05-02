import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/infrastructure';
import { environment } from '@env/environment';

interface DiagnosticsReport {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  expiryPipeline: { approachingExpiry30Days: number; approachingExpiry7Days: number; expiredNotClosed: number; issues: string[] };
  approvalHealth: { blockedApprovals: number; pendingOver7Days: number; averageApprovalDays: number; issues: string[] };
  compensatingControlHealth: { exceptionsWithoutCompensating: number; ineffectiveCompensatingControls: number; issues: string[] };
  staleExceptions: { noUpdateIn90Days: number; highRiskStale: number; issues: string[] };
  warnings: string[];
  errors: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-diagnostics',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .diag-page { min-height: 100vh; background: var(--surface-ground); padding: 24px 28px; }
    .page-title { font-size: var(--font-size-xl); font-weight: 600; margin: 0 0 20px; }
    .health-badge { display: inline-block; padding: 6px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: var(--font-size-base); margin-bottom: 20px; }
    .health-healthy { background: var(--green-50); color: var(--green-700); }
    .health-degraded { background: var(--yellow-50); color: var(--yellow-700); }
    .health-critical { background: var(--red-50); color: var(--red-700); }
    .diag-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .diag-card { background: var(--surface-card); border-radius: var(--radius-md); border: 1px solid var(--surface-border); padding: 16px; }
    .diag-card h3 { margin: 0 0 12px; font-size: var(--font-size-base); font-weight: 700; }
    .diag-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .issues-list { margin: 8px 0 0; padding: 0; list-style: none; }
    .issues-list li { font-size: var(--font-size-sm); color: var(--orange-600); padding: 2px 0; }
    .warning-list, .error-list { margin: 0 0 16px; padding: 0; list-style: none; }
    .warning-list li { font-size: var(--font-size-xs-plus); color: var(--yellow-700); padding: 4px 0; }
    .error-list li { font-size: var(--font-size-xs-plus); color: var(--red-700); font-weight: 600; padding: 4px 0; }
    @media (max-width: 768px) { .diag-grid { grid-template-columns: 1fr; } }
  `],
  template: `
    <div class="diag-page" [dir]="i18n.direction()">
      <h2 class="page-title">{{ i18n.translate('exception.diagnostics') }}</h2>

      @if (loading()) {
        <p>{{ i18n.translate('common.loading') }}...</p>
      } @else if (report()) {
        <span class="health-badge" [ngClass]="'health-' + report()!.overallHealth">{{ report()!.overallHealth | uppercase }}</span>

        @if (report()!.errors.length) {
          <ul class="error-list">@for (e of report()!.errors; track e) { <li>{{ e }}</li> }</ul>
        }
        @if (report()!.warnings.length) {
          <ul class="warning-list">@for (w of report()!.warnings; track w) { <li>{{ w }}</li> }</ul>
        }

        <div class="diag-grid">
          <div class="diag-card">
            <h3>Expiry Pipeline</h3>
            <div class="diag-row"><span>Expiring (30d)</span><span>{{ report()!.expiryPipeline.approachingExpiry30Days }}</span></div>
            <div class="diag-row"><span>Expiring (7d)</span><span>{{ report()!.expiryPipeline.approachingExpiry7Days }}</span></div>
            <div class="diag-row"><span>Expired not closed</span><span>{{ report()!.expiryPipeline.expiredNotClosed }}</span></div>
            @if (report()!.expiryPipeline.issues.length) {
              <ul class="issues-list">@for (i of report()!.expiryPipeline.issues; track i) { <li>{{ i }}</li> }</ul>
            }
          </div>
          <div class="diag-card">
            <h3>Approval Health</h3>
            <div class="diag-row"><span>Blocked</span><span>{{ report()!.approvalHealth.blockedApprovals }}</span></div>
            <div class="diag-row"><span>Pending 7d+</span><span>{{ report()!.approvalHealth.pendingOver7Days }}</span></div>
            <div class="diag-row"><span>Avg approval days</span><span>{{ report()!.approvalHealth.averageApprovalDays }}</span></div>
          </div>
          <div class="diag-card">
            <h3>Compensating Controls</h3>
            <div class="diag-row"><span>Without compensating</span><span>{{ report()!.compensatingControlHealth.exceptionsWithoutCompensating }}</span></div>
            <div class="diag-row"><span>Ineffective</span><span>{{ report()!.compensatingControlHealth.ineffectiveCompensatingControls }}</span></div>
          </div>
          <div class="diag-card">
            <h3>Stale Exceptions</h3>
            <div class="diag-row"><span>No update 90d+</span><span>{{ report()!.staleExceptions.noUpdateIn90Days }}</span></div>
            <div class="diag-row"><span>High-risk stale</span><span>{{ report()!.staleExceptions.highRiskStale }}</span></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ExceptionDiagnosticsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n = inject(I18nService);

  loading = signal(true);
  report = signal<DiagnosticsReport | null>(null);

  ngOnInit(): void {
    this.http.get<{ data: DiagnosticsReport }>(`${environment.apiUrl}/exception/diagnostics`)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: res => { this.report.set(res.data); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
  }
}
