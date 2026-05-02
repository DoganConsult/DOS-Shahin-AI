import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcRiskService } from '@app/grc/services/grc-risk.service';

interface VendorRiskSnapshotVendor {
  risk_tier?: string;
}

interface VendorRiskSnapshotResponse {
  vendors?: VendorRiskSnapshotVendor[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-vendor-risk',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vendor-snap">
      <div class="tier-row" *ngFor="let t of tiers">
        <span class="tier-badge" [style.background]="t.color">{{ t.label }}</span>
        <span class="tier-count">{{ t.count }}</span>
      </div>
      <div class="total">{{ i18n.translate('common.all') }}: {{ total }}</div>
    </div>
  `,
  styles: [`
    .tier-row {
      display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; margin-bottom: 4px;
      border-radius: var(--radius-sm, 8px);
      background: var(--glass-icon-bg, rgba(14,165,233,0.03));
      border: 1px solid var(--border-subtle, var(--border-subtle));
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      transition: all 200ms;
    }
    .tier-row:hover { border-color: var(--glass-icon-border, rgba(14,165,233,0.18)); }
    .tier-badge {
      padding: 3px 12px; border-radius: var(--radius-pill, 99px); color: #fff; font-size: var(--font-size-sm); font-weight: 700;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.20);
    }
    .tier-count { font-size: var(--font-size-lg); font-weight: var(--font-black, 800); color: var(--text-heading); }
    .total { text-align: center; margin-top: 10px; font-size: var(--font-size-sm); color: var(--text-muted); font-weight: 600; }
  `],
})
export class VendorRiskSnapshotWidget implements OnInit {
  tiers: { label: string; count: number; color: string }[] = [];
  total = 0;

  constructor(public i18n: I18nService, private riskSvc: GrcRiskService) {}

  ngOnInit(): void {
    this.riskSvc.getVendors().subscribe({
      next: (r: VendorRiskSnapshotResponse) => {
        const vendors = r.vendors ?? [];
        this.total = vendors.length;
        const critical = vendors.filter((v) => v.risk_tier === 'critical').length;
        const high = vendors.filter((v) => v.risk_tier === 'high').length;
        const medium = vendors.filter((v) => v.risk_tier === 'medium').length;
        const low = vendors.filter((v) => v.risk_tier === 'low').length;
        this.tiers = [
          { label: 'Critical', count: critical, color: 'var(--error)' },
          { label: 'High', count: high, color: '#f97316' },
          { label: 'Medium', count: medium, color: '#eab308' },
          { label: 'Low', count: low, color: '#22c55e' },
        ];
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
