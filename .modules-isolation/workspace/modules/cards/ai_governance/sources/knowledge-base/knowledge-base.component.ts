import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { StorageService } from '@app/infrastructure';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('knowledgeBase.title') }}</h2>
        <p class="text-muted">{{ i18n.translate('knowledgeBase.subtitle') }}</p>
      </header>
      <div class="page-body">
        @if (error()) {
          <div class="card card-error">
            <p>{{ i18n.translate('knowledgeBase.loadError') }}</p>
            <button type="button" class="retry-btn" (click)="load()">{{ i18n.translate('knowledgeBase.retry') }}</button>
          </div>
        } @else if (loading()) {
          <div class="card"><p>{{ i18n.translate('knowledgeBase.loading') }}</p></div>
        } @else {
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('knowledgeBase.overview') }}</h3>
            <p>{{ i18n.translate('knowledgeBase.policiesApproved') }}: {{ summary().policies?.approved ?? 0 }} / {{ summary().policies?.total ?? 0 }}, {{ i18n.translate('knowledgeBase.controlsEffective') }}: {{ summary().controls?.effective ?? 0 }} / {{ summary().controls?.total ?? 0 }}</p>
          </div>
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('knowledgeBase.policies') }}</h3>
            @if (policies().length === 0) { <p class="text-muted">{{ i18n.translate('knowledgeBase.noPolicies') }}</p> }
            @else {
              <ul class="list">
                @for (p of policies(); track p.id) {
                  <li><strong>{{ p.name ?? p.title ?? p.code }}</strong> {{ p.status ? ' · ' + p.status : '' }}</li>
                }
              </ul>
            }
          </div>
          <div class="card">
            <h3 class="card-title">{{ i18n.translate('knowledgeBase.controlsSummary') }}</h3>
            <p>{{ i18n.translate('knowledgeBase.totalControls') }}: {{ controlsCount() }}</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`.page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; } .page-header { margin-bottom: 24px; } .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); } .text-muted { color: var(--text-muted); margin-top: 4px; } .page-body { display: grid; gap: 16px; } .card-title { margin: 0 0 12px 0; font-size: var(--font-size-lg); } .list { list-style: none; padding: 0; margin: 0; } .list li { padding: 8px 0; border-bottom: 1px solid var(--surface-border); } .card-error { border-color: var(--red-200,var(--status-danger-bg, #fff1f1)); background: var(--red-50,var(--status-danger-bg, #fff1f1)); } .retry-btn { margin-top: 8px; padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--primary); background: var(--primary); color: white; cursor: pointer; font-size: var(--font-size-base); } .retry-btn:hover { opacity: 0.9; }`]
})
export class KnowledgeBaseComponent implements OnInit {
    private complianceSvc = inject(GrcComplianceService);
    private governanceSvc = inject(GrcGovernanceService);
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  private _storage = inject(StorageService);
  loading = signal(true);
  error = signal(false);
  summary = signal<{ policies?: { approved: number; total: number }; controls?: { effective: number; total: number } }>({});
  policies = signal<GrcRecord[]>([]);
  controlsCount = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set(false);
    this.loading.set(true);
    const workspaceId = this._storage.get('grc_active_workspace') || '';
    forkJoin({
      home: this.operationsSvc.getHomeOverview(workspaceId),
      policies: this.governanceSvc.getGovernancePolicies(),
      controls: this.complianceSvc.getControls()
    }).subscribe({
      next: ({ home, policies: p, controls: c }) => {
        const pl = Array.isArray(p) ? p : (p?.policies ?? p?.data ?? []);
        const approvedCount = pl.filter((x: Record<string, any>) => (x.status || '').toLowerCase() === 'approved').length;
        const obj = c as unknown as { controls?: Record<string, any>[]; data?: Record<string, any>[] } | undefined;
        const arr = Array.isArray(c) ? c : (obj?.controls ?? obj?.data ?? []);
        const effectiveCount = arr.filter((x: Record<string, any>) => (x.status || '').toLowerCase() === 'effective' || x.effective === true).length;
        const totalPolicies = (home?.summary?.totalPolicies ?? pl.length) as number;
        const totalControls = (home?.summary?.totalControls ?? arr.length) as number;
        this.summary.set({
          policies: { approved: approvedCount, total: totalPolicies },
          controls: { effective: effectiveCount, total: totalControls }
        });
        this.policies.set(pl.slice(0, 20));
        this.controlsCount.set(arr.length);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }
}
