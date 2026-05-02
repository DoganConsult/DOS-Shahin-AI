import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, TagModule, TilesModule } from 'carbon-components-angular';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-scoring',
    imports: [CommonModule, PageShellComponent, TilesModule, TagModule, ButtonModule],
    template: `
    <app-page-shell icon="chart-bar" [title]="'Scoring Engine'"
      [subtitle]="'Compliance scoring policies and weight management'"
      [breadcrumbs]="['Dashboard', 'Scoring']" [loading]="loading">
      <div class="scoring-grid">
        <cds-tile *ngFor="let p of policies" styleClass="scoring-card">
          <div class="scoring-header">
            <h3>{{ p.name }}</h3>
            <cds-tag [value]="p.is_default ? 'Default' : 'Custom'" [severity]="p.is_default ? 'success' : 'info'" />
          </div>
          <p class="scoring-desc">{{ p.description || 'Scoring policy' }}</p>
          <div class="weight-bars" *ngIf="p.weights">
            <div *ngFor="let w of getWeights(p.weights)" class="weight-row">
              <span class="weight-label">{{ w.key }}</span>
              <div class="weight-bar-bg"><div class="weight-bar" [style.width.%]="w.value"></div></div>
              <span class="weight-val">{{ w.value }}%</span>
            </div>
          </div>
        </cds-tile>
      </div>
      <div *ngIf="policies.length === 0 && !loading && !error" class="empty-state">
        <i class=" empty-icon"></i>
        <p>No scoring policies</p>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; ngOnInit()">Retry</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .scoring-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
    .scoring-header{display:flex;justify-content:space-between;align-items:center}
    .scoring-header h3{margin:0;font-size: var(--font-size-base);font-weight:700}
    .scoring-desc{font-size: var(--font-size-sm);color:var(--text-muted,var(--text-muted));margin:8px 0}
    .weight-bars{margin-top:12px}.weight-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
    .weight-label{font-size: var(--font-size-sm);font-weight:600;width:90px;text-transform:capitalize}
    .weight-bar-bg{flex:1;height:8px;background:var(--surface-ground,var(--surface-ice));border-radius:var(--radius-xs);overflow:hidden}
    .weight-bar{height:100%;background:var(--primary,#1e40af);border-radius:var(--radius-xs)}
    .weight-val{font-size: var(--font-size-sm);font-weight:600;width:36px;text-align:end}
    .empty-state{text-align:center;padding:48px;color:var(--text-muted)}
    .empty-icon{font-size:48px;display:block;margin-bottom:12px}
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class ScoringComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  loading = false; error = ''; policies: Record<string, any>[] = [];
  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}
  ngOnInit() {
    this.loading = true;
    this.error = '';
    this.complianceSvc.getScoringPolicies().subscribe({
      next: (d: Record<string, any>) => { this.policies = Array.isArray(d) ? d : d.policies || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }
  getWeights(w: Record<string, any>): { key: string; value: number }[] {
    return Object.entries(w || {}).map(([key, value]) => ({ key, value: value as number }));
  }

}
