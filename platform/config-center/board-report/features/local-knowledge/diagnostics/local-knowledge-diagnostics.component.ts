import { Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalKnowledgeApiService } from '@app/ai/local-knowledge-api.service';

@Component({
  selector: 'app-local-knowledge-diagnostics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="local-knowledge-diagnostics">
      <h2>Local Knowledge Diagnostics</h2>
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
export class LocalKnowledgeDiagnosticsComponent implements OnInit {
  private api = inject(LocalKnowledgeApiService);
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
