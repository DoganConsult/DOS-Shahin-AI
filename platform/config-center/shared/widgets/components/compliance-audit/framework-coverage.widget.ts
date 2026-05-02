import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devError } from '@app/runtime/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

interface FrameworkCoverageItem {
  name?: string;
  frameworkId?: string;
  completionPercent?: number;
}

interface FrameworkCoverageResponse {
  frameworks?: FrameworkCoverageItem[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-widget-framework-coverage',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="coverage">
      <div *ngFor="let f of frameworks" class="fw-row">
        <div class="fw-name">{{ f.name }}</div>
        <div class="fw-bar">
          <div class="fw-fill" [style.width.%]="f.pct" [style.background]="f.pct >= 70 ? 'var(--success)' : f.pct >= 40 ? '#eab308' : 'var(--error)'"></div>
        </div>
        <span class="fw-pct">{{ f.pct }}%</span>
      </div>
      <div *ngIf="frameworks.length === 0" style="text-align:center;color:var(--text-muted);font-size: var(--font-size-sm)">{{ i18n.translate('common.noData') }}</div>
    </div>
  `,
  styles: [`
    .fw-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .fw-name { font-size: var(--font-size-sm); width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--text-body); }
    .fw-bar {
      flex: 1; height: 10px; border-radius: var(--radius-sm); overflow: hidden;
      background: var(--glass-icon-bg, rgba(14,165,233,0.06));
      border: 1px solid var(--glass-icon-border, rgba(14,165,233,0.12));
      backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    }
    .fw-fill { height: 100%; border-radius: var(--radius-sm); transition: width 600ms cubic-bezier(0.4,0,0.2,1); box-shadow: inset 0 1px 0 rgba(255,255,255,0.25); }
    .fw-pct { font-size: var(--font-size-sm); font-weight: var(--font-black, 800); width: 36px; text-align: end; color: var(--text-heading); }
  `],
})
export class FrameworkCoverageWidget implements OnInit {
  frameworks: { name: string; pct: number }[] = [];

  constructor(public i18n: I18nService, private operationsSvc: GrcOperationsService) {}

  ngOnInit(): void {
    this.operationsSvc.getDashboard().subscribe({
      next: (d: FrameworkCoverageResponse) => {
        this.frameworks = (d.frameworks ?? []).slice(0, 8).map((f) => ({
          name: f.name ?? f.frameworkId ?? '',
          pct: f.completionPercent ?? 0,
        }));
      },
      error: (e: unknown) => devError("[API]", e)
    });
  }

}
