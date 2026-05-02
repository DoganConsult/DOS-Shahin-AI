import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AiEnhancedApiService } from '@app/core/services/api-clients/ai/ai-enhanced-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * AI OS decision detail — drill-down from decisions list.
 * Shows a single decision by ID (metadata, outcome, context, explainability).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-decision-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageShellComponent,
    ButtonModule,
    CardModule,
    TagModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './decision-detail.component.html',
  styleUrls: [],
})
export class DecisionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  i18n = inject(I18nService);
  private api = inject(AiEnhancedApiService);

  loading = signal(true);
  error = signal<string | null>(null);
  correlationId = signal<string | null>(null);
  decision = signal<GrcRecord | null>(null);
  decisionId = signal<string>('');
  explainChain = signal<{ decision: GrcRecord; relatedDecisions: GrcRecord[]; signals: GrcRecord[] } | null>(null);

  ngOnInit(): void {
    const decisionId = this.route.snapshot.paramMap.get('decisionId');
    if (!decisionId) {
      this.error.set('Missing decision ID');
      this.loading.set(false);
      return;
    }
    this.decisionId.set(decisionId);
    this.load();
  }

  load(): void {
    const decisionId = this.decisionId();
    if (!decisionId) return;
    this.loading.set(true);
    this.error.set(null);
    this.correlationId.set(null);
    this.decision.set(null);
    this.explainChain.set(null);
    this.api
      .getDecisionById(decisionId)
      .pipe(
        catchError((err) => {
          this.error.set(err?.message || err?.error?.message || err?.error?.error || 'Failed to load decision');
          this.correlationId.set(err?.error?.correlationId ?? err?.error?.correlation_id ?? null);
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.decision.set(data);
        this.loading.set(false);
        if (data) {
          this.api
            .getDecisionExplain(decisionId)
            .pipe(catchError(() => of({ decision: data, relatedDecisions: [], signals: [] })))
            .subscribe((chain) => this.explainChain.set(chain));
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/ai-os-dashboard', 'decisions']);
  }

  formatTime(ts: string | number | undefined): string {
    if (!ts) return '—';
    try {
      const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  /** Outcome may be object (e.g. { action: 'allow' }) or string. */
  getOutcomeLabel(d: GrcRecord): string {
    if (!d) return '—';
    const o = d.outcome ?? d.result;
    if (o == null) return '—';
    if (typeof o === 'string') return o;
    return o.action ?? o.result ?? o.decision ?? JSON.stringify(o);
  }
}
