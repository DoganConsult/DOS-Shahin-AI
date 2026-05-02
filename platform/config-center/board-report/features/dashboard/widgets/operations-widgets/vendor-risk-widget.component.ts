import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetsApiService } from '@app/core/platform/widgets/widgets-api.service';
import { WidgetShellComponent } from '@app/dashboard';
import { firstValueFrom } from 'rxjs';

interface VendorRiskData {
  totalVendors: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  pendingAssessments: number;
  topRisks: { vendor: string; riskLevel: 'critical' | 'high' | 'medium' | 'low'; lastAssessed: string }[];
}

@Component({
  selector: 'app-vendor-risk-widget',
  standalone: true,
  imports: [CommonModule, WidgetShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-widget-shell [title]="title()" [fetchedAt]="fetchedAt()">
      <div class="vr-kpis">
        <div class="vr-kpi">
          <span class="vr-kpi-value">{{ data()?.totalVendors ?? 0 }}</span>
          <span class="vr-kpi-label">Total</span>
        </div>
        <div class="vr-kpi vr-high">
          <span class="vr-kpi-value">{{ data()?.highRisk ?? 0 }}</span>
          <span class="vr-kpi-label">High Risk</span>
        </div>
        <div class="vr-kpi vr-med">
          <span class="vr-kpi-value">{{ data()?.mediumRisk ?? 0 }}</span>
          <span class="vr-kpi-label">Medium</span>
        </div>
        <div class="vr-kpi vr-low">
          <span class="vr-kpi-value">{{ data()?.lowRisk ?? 0 }}</span>
          <span class="vr-kpi-label">Low</span>
        </div>
        <div class="vr-kpi vr-pending">
          <span class="vr-kpi-value">{{ data()?.pendingAssessments ?? 0 }}</span>
          <span class="vr-kpi-label">Pending</span>
        </div>
      </div>

      <div class="vr-list" *ngIf="data()?.topRisks?.length">
        <div *ngFor="let v of data()!.topRisks" class="vr-row">
          <span class="vr-vendor">{{ v.vendor }}</span>
          <span class="vr-badge" [attr.data-level]="v.riskLevel">{{ v.riskLevel }}</span>
          <span class="vr-date">{{ v.lastAssessed | date:'mediumDate' }}</span>
        </div>
      </div>

      <div *ngIf="!data()?.topRisks?.length" class="vr-empty">
        No vendor risk data available
      </div>
    </app-widget-shell>
  `,
  styles: [`
    .vr-kpis { display: flex; gap: 8px; margin-bottom: 12px; }
    .vr-kpi { flex: 1; text-align: center; padding: 8px 4px; border-radius: var(--radius); background: var(--surface-100, #f3f4f6); }
    .vr-kpi-value { display: block; font-size: var(--font-size-lg); font-weight: 700; color: var(--text-heading, #0f172a); }
    .vr-kpi-label { font-size: var(--font-size-nano); color: var(--text-muted, #6b7280); text-transform: uppercase; letter-spacing: .3px; }
    .vr-high .vr-kpi-value { color: #dc2626; }
    .vr-med .vr-kpi-value { color: #d97706; }
    .vr-low .vr-kpi-value { color: #16a34a; }
    .vr-pending .vr-kpi-value { color: #2563eb; }
    .vr-list { display: flex; flex-direction: column; gap: 4px; }
    .vr-row { display: flex; align-items: center; gap: 8px; font-size: var(--font-size-sm); padding: 4px 0; border-bottom: 1px solid var(--surface-50, #f9fafb); }
    .vr-vendor { flex: 1; font-weight: 500; }
    .vr-badge { padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-nano); font-weight: 700; text-transform: uppercase; }
    .vr-badge[data-level="critical"] { background: #fee2e2; color: #991b1b; }
    .vr-badge[data-level="high"] { background: #ffedd5; color: #9a3412; }
    .vr-badge[data-level="medium"] { background: #fef9c3; color: #854d0e; }
    .vr-badge[data-level="low"] { background: #dcfce7; color: #166534; }
    .vr-date { font-size: var(--font-size-xs); color: var(--text-muted, #6b7280); }
    .vr-empty { text-align: center; padding: 16px; color: var(--text-muted, #6b7280); font-size: var(--font-size-sm); }
  `]
})
export class VendorRiskWidgetComponent implements OnInit {
  @Input() config: Record<string, unknown> = {};
  private api = inject(WidgetsApiService);

  readonly title = signal('Vendor Risk');
  readonly fetchedAt = signal<string | null>(null);
  readonly data = signal<VendorRiskData | null>(null);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getWidget('vendor-risk'));
      if (!res) return;
      this.title.set(res.title);
      this.fetchedAt.set(res.fetchedAt);
      this.data.set(res.payload);
    } catch { /* leave defaults */ }
  }
}
