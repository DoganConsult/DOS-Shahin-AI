import { Component, Input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'evidence-dashboard-widget',
    imports: [CommonModule],
    template: `
    <div class="edw">
      <div class="edw-header">
        <i class="pi pi-chart-bar edw-icon"></i>
        <h3>Evidence Dashboard</h3>
      </div>

      <div class="edw-metrics">
        <div class="edw-metric edw-sla" [class.ok]="slaStatus === 'On Time'" [class.warn]="slaStatus !== 'On Time'">
          <span class="edw-mv">{{ slaStatus || '—' }}</span>
          <span class="edw-ml">SLA Status</span>
        </div>
        <div class="edw-metric">
          <span class="edw-mv">{{ freshness }}</span>
          <span class="edw-ml">Freshness (days)</span>
        </div>
        <div class="edw-metric">
          <span class="edw-mv edw-cv">{{ coverage }}%</span>
          <div class="edw-bar"><div class="edw-bar-fill" [style.width.%]="coverage"></div></div>
          <span class="edw-ml">Coverage</span>
        </div>
      </div>

      <div class="edw-row-metrics">
        <div class="edw-rm" [class.edw-danger]="overdue > 0">
          <span class="edw-rv">{{ overdue }}</span>
          <span class="edw-rl">Overdue</span>
        </div>
        <div class="edw-rm" [class.edw-info]="pending > 0">
          <span class="edw-rv">{{ pending }}</span>
          <span class="edw-rl">Pending</span>
        </div>
      </div>

      <div class="edw-fw" *ngIf="frameworkSummary.length > 0">
        <h4>Framework Coverage</h4>
        <div class="edw-fw-list">
          <div class="edw-fw-row" *ngFor="let fw of frameworkSummary">
            <div class="edw-fw-left">
              <span class="edw-fw-code">{{ fw.framework_code }}</span>
              <div class="edw-fw-bar-wrap">
                <div class="edw-fw-bar" [style.width.%]="getPercent(fw)"></div>
              </div>
            </div>
            <div class="edw-fw-right">
              <span class="edw-fw-stat"><b>{{ fw.control_count }}</b> controls</span>
              <span class="edw-fw-dot">·</span>
              <span class="edw-fw-stat"><b>{{ fw.requirement_count }}</b> requirements</span>
              <span class="edw-fw-dot">·</span>
              <span class="edw-fw-stat edw-mandatory"><b>{{ fw.mandatory_count }}</b> mandatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .edw { padding:16px; border:1px solid var(--border-subtle); border-radius:var(--radius-lg); min-width:300px; flex:1.5; background:#fff; }
    .edw-header { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .edw-header h3 { font-size: var(--font-size-md); font-weight:700; color:var(--text-heading); margin:0; }
    .edw-icon { font-size: var(--font-size-lg); color:var(--primary); background:var(--blue-50, #edf5ff); width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:var(--radius); }
    .edw-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:12px; }
    .edw-metric { text-align:center; padding:12px 8px; background:var(--surface-ice); border-radius:var(--radius); display:flex; flex-direction:column; align-items:center; gap:4px; }
    .edw-mv { font-size: var(--font-size-2xl); font-weight:800; color:var(--text-heading); }
    .edw-cv { color:var(--primary); }
    .edw-ml { font-size: var(--font-size-xs); color:var(--text-muted); text-transform:uppercase; letter-spacing:.4px; }
    .edw-sla.ok .edw-mv { color:var(--success); }
    .edw-sla.warn .edw-mv { color:var(--warning); }
    .edw-bar { width:100%; height:6px; background:var(--border-subtle); border-radius:var(--radius-xs); overflow:hidden; }
    .edw-bar-fill { height:100%; background:linear-gradient(90deg,var(--primary),#818cf8); border-radius:var(--radius-xs); transition:width 0.6s ease; }
    .edw-row-metrics { display:flex; gap:12px; margin-bottom:16px; }
    .edw-rm { flex:1; text-align:center; padding:10px; background:var(--surface-ice); border-radius:var(--radius); border:1px solid var(--border-subtle); }
    .edw-rv { font-size: var(--font-size-xl); font-weight:700; color:var(--text-muted); display:block; }
    .edw-rl { font-size: var(--font-size-xs); color:var(--text-muted); }
    .edw-danger .edw-rv { color:var(--error); }
    .edw-danger { border-color:var(--status-danger-bg, #fff1f1); background:var(--status-danger-bg, #fff1f1); }
    .edw-info .edw-rv { color:var(--primary); }
    .edw-info { border-color:#bfdbfe; background:#eff6ff; }
    .edw-fw h4 { font-size: var(--font-size-sm); font-weight:700; color:#475569; margin:0 0 10px; padding-top:12px; border-top:1px solid var(--border-subtle); }
    .edw-fw-list { display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto; }
    .edw-fw-row { display:flex; align-items:center; gap:10px; padding:6px 0; }
    .edw-fw-left { display:flex; align-items:center; gap:8px; min-width:160px; }
    .edw-fw-code { font-size: var(--font-size-xs); font-weight:700; color:var(--text-heading); text-transform:uppercase; min-width:80px; }
    .edw-fw-bar-wrap { flex:1; height:4px; background:var(--border-subtle); border-radius:var(--radius-xs); min-width:40px; }
    .edw-fw-bar { height:100%; background:var(--primary); border-radius:var(--radius-xs); }
    .edw-fw-right { display:flex; align-items:center; gap:4px; font-size: var(--font-size-xs); color:var(--text-muted); flex-wrap:wrap; }
    .edw-fw-right b { color:var(--text-heading); }
    .edw-fw-dot { color:#cbd5e1; }
    .edw-mandatory b { color:var(--warning); }
  `]
})
export class EvidenceDashboardWidgetComponent implements OnInit {
  @Input() coverage: number = 0;
  @Input() freshness: number = 0;
  @Input() slaStatus: string = '';
  @Input() pending: number = 0;
  @Input() overdue: number = 0;
  frameworkSummary: Record<string, any>[] = [];
  private maxReq = 1;

  constructor(private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.complianceSvc.getEvidenceRequirementsSummary().subscribe({
      next: (res: Record<string, any>) => {
        this.frameworkSummary = res.frameworks || [];
        this.maxReq = Math.max(...this.frameworkSummary.map((f: Record<string, any>) => f.requirement_count || 1), 1);
      },
      error: () => { this.frameworkSummary = []; }
    });
  }

  getPercent(fw: Record<string, any>): number {
    return Math.round(((fw.requirement_count || 0) / this.maxReq) * 100);
  }

}
