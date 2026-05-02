import { Component, ChangeDetectionStrategy, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FoundationApiService } from '../services/foundation-api.service';

import { FoundationPageShellComponent } from '../components/foundation-page-shell.component';
interface ReadinessCheck {
  key: string;
  label: string;
  value: string | number;
  status: 'pass' | 'warn' | 'fail';
}

@Component({
  selector: 'app-foundation-operations-readiness',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FoundationPageShellComponent],
  template: `
    <foundation-page-shell [route]="'/foundation/operations-readiness'" [titleKey]="'foundation.nav.operationsReadiness'" [showRail]="true">
    <section class="foundation-page p-4">
      <h2 class="text-xl font-semibold mb-4">Operations Readiness</h2>

      @if (loading()) {
        <div class="flex items-center gap-2"><i class="pi pi-spin pi-spinner"></i> Checking readiness…</div>
      } @else if (error()) {
        <div class="p-4 bg-red-50 text-red-700 rounded">{{ error() }}</div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (check of checks(); track check.key) {
            <div class="p-4 border rounded flex items-start gap-3"
                 [ngClass]="{
                   'border-green-300 bg-green-50': check.status === 'pass',
                   'border-yellow-300 bg-yellow-50': check.status === 'warn',
                   'border-red-300 bg-red-50': check.status === 'fail'
                 }">
              <span class="text-lg mt-0.5"
                    [ngClass]="{
                      'text-green-600': check.status === 'pass',
                      'text-yellow-600': check.status === 'warn',
                      'text-red-600': check.status === 'fail'
                    }">
                {{ check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗' }}
              </span>
              <div>
                <p class="font-medium text-sm">{{ check.label }}</p>
                <p class="text-xs text-surface-500 mt-0.5">{{ check.value }}</p>
              </div>
            </div>
          }
        </div>

        @if (checks().length === 0) {
          <p class="text-surface-400 mt-4">No readiness data available.</p>
        }
      }
    </section>
  
    </foundation-page-shell>
  `,
})
export class FoundationOperationsReadinessComponent implements OnInit {
  private readonly api = inject(FoundationApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly checks = signal<ReadinessCheck[]>([]);

  ngOnInit(): void {
    this.api.getHealthConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        this.checks.set(this.mapToChecks(res));
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(FoundationApiService.formatLoadError(err));
        this.loading.set(false);
      },
    });
  }

  private mapToChecks(data: Record<string, unknown>): ReadinessCheck[] {
    if (!data || typeof data !== 'object') return [];

    const checks: ReadinessCheck[] = [];
    const healthData = (data as any).data ?? data;

    const rules: Array<{ key: string; label: string; passFn: (v: unknown) => 'pass' | 'warn' | 'fail' }> = [
      { key: 'totalNodes', label: 'Organization Nodes', passFn: (v) => Number(v) > 0 ? 'pass' : 'warn' },
      { key: 'activeUsers', label: 'Active Users', passFn: (v) => Number(v) > 0 ? 'pass' : 'warn' },
      { key: 'orphanedNodes', label: 'Orphaned Nodes', passFn: (v) => Number(v) === 0 ? 'pass' : Number(v) < 5 ? 'warn' : 'fail' },
      { key: 'orphanedUsers', label: 'Orphaned Users', passFn: (v) => Number(v) === 0 ? 'pass' : Number(v) < 5 ? 'warn' : 'fail' },
      { key: 'roleCount', label: 'Configured Roles', passFn: (v) => Number(v) > 0 ? 'pass' : 'warn' },
      { key: 'sodConflicts', label: 'SoD Conflicts', passFn: (v) => Number(v) === 0 ? 'pass' : 'fail' },
      { key: 'maxDepth', label: 'Hierarchy Depth', passFn: (v) => Number(v) > 0 && Number(v) <= 10 ? 'pass' : Number(v) > 10 ? 'warn' : 'warn' },
    ];

    for (const rule of rules) {
      const val = healthData[rule.key];
      if (val !== undefined) {
        checks.push({ key: rule.key, label: rule.label, value: String(val), status: rule.passFn(val) });
      }
    }

    for (const [k, v] of Object.entries(healthData)) {
      if (!rules.some(r => r.key === k) && k !== 'success') {
        checks.push({ key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), value: String(v), status: 'pass' });
      }
    }

    return checks;
  }
}
