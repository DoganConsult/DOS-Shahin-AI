import { Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcOperationsService } from '@app/api';

export interface NextActionItem {
  label: string;
  labelAr: string;
  link: string;
  reason: string;
  priority: number;
}

/**
 * Dashboard wayfinding: "Do this next" — 1–5 suggested actions with links, driven by GET /api/dashboard/next-actions.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-next-actions-block',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="next-actions" *ngIf="actions.length > 0" [attr.dir]="i18n.direction()">
      <h3 class="next-actions-title"><i class="pi pi-list"></i> {{ title }}</h3>
      <ul class="next-actions-list">
        <li *ngFor="let a of actions" class="next-action-item">
          <a [routerLink]="a.link" class="next-action-link" [attr.title]="a.reason || null">
            <i class="pi pi-arrow-right"></i>
            <span class="next-action-text">
              <span class="next-action-label">{{ i18n.localize(a.label, a.labelAr) }}</span>
              <span class="next-action-reason" *ngIf="a.reason">{{ a.reason }}</span>
            </span>
          </a>
        </li>
      </ul>
    </div>
    <div class="next-actions empty" *ngIf="loaded && actions.length === 0">
      <span class="next-actions-all-set">{{ allSetText }}</span>
    </div>
  `,
  styles: [`
    .next-actions {
      background: var(--surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 20px;
    }
    .next-actions-title {
      font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading);
      margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
    }
    .next-actions-title .pi { color: var(--primary); }
    .next-actions-list { list-style: none; margin: 0; padding: 0; }
    .next-action-item { margin-bottom: 8px; }
    .next-action-item:last-child { margin-bottom: 0; }
    .next-action-link {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: var(--radius-sm);
      font-size: var(--font-size-sm); font-weight: 500; color: var(--primary);
      text-decoration: none; transition: all 200ms;
      border: 1px solid transparent;
    }
    .next-action-link:hover { background: var(--status-info-bg, #edf5ff); border-color: #bae6fd; }
    .next-action-link .pi { font-size: var(--font-size-sm); flex-shrink: 0; }
    .next-action-text { display: flex; flex-direction: column; gap: 2px; }
    .next-action-label { font-weight: 500; }
    .next-action-reason { font-size: var(--font-size-xs); font-weight: 400; color: var(--text-caption); }
    .next-actions.empty { padding: 12px; text-align: center; }
    .next-actions-all-set { font-size: var(--font-size-sm); color: var(--text-muted); }
  `],
})
export class NextActionsBlockComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  actions: NextActionItem[] = [];
  loaded = false;

  constructor(public i18n: I18nService) {}

  get title(): string {
    return this.i18n.translate('nextActions.title');
  }

  get allSetText(): string {
    return this.i18n.translate('nextActions.allSet');
  }

  ngOnInit(): void {
    this.operationsSvc.getNextActions().subscribe({
      next: (r: Record<string, unknown>) => {
        this.actions = (r['actions'] as NextActionItem[]) ?? [];
        this.loaded = true;
      },
      error: () => { this.loaded = true; this.actions = []; },
    });
  }

}
