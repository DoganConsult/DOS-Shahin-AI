import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RemediationApiService } from '../services/remediation-api.service';

@Component({
  selector: 'app-remediation-diagnostics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="remediation-diagnostics">
      <h2>Remediation Diagnostics</h2>
      @if (loading()) {
        <p>Running diagnostics…</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <section><h3>Health Checks</h3></section>
        <section><h3>Pipeline Status</h3></section>
        <section><h3>Error Log</h3></section>
      }
    </div>
  `,
})
export class RemediationDiagnosticsComponent implements OnInit {
  private api = inject(RemediationApiService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  error = signal<string | null>(null);
  checks = signal<Record<string, unknown>>({});

  ngOnInit(): void {
    this.api.getDiagnostics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.checks.set(data); this.loading.set(false); },
        error: e => { this.error.set(e?.message ?? 'Diagnostics failed'); this.loading.set(false); },
      });
  }
}
