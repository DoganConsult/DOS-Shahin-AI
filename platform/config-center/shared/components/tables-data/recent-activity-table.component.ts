import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ActivityRowVM } from '../../models/module-overview.vm';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-recent-activity-table',
    imports: [CommonModule, AppDatePipe, RouterLink, TableModule, TagModule, TooltipModule],
    template: `
    <div class="rat-root">
      <div class="rat-header">
        <span class="rat-title">
          <i class="pi pi-history" aria-hidden="true"></i>
          {{ isAr ? titleAr : titleEn }}
        </span>
        <a class="rat-view-all" *ngIf="viewAllRoute" [routerLink]="viewAllRoute">
          {{ isAr ? 'عرض الكل' : 'View all' }}
          <i class="pi pi-arrow-right" aria-hidden="true"></i>
        </a>
      </div>

      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
        *ngIf="rows.length > 0"
        [value]="rows"
        [rows]="pageSize"
        [paginator]="rows.length > pageSize"
        styleClass="p-datatable-sm p-datatable-striped"
        [tableStyle]="{'min-width': '100%'}">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ isAr ? 'الوقت' : 'Time' }}</th>
            <th>{{ isAr ? 'المستخدم' : 'User' }}</th>
            <th>{{ isAr ? 'الإجراء' : 'Action' }}</th>
            <th>{{ isAr ? 'النوع' : 'Entity' }}</th>
            <th *ngIf="showEntity">{{ isAr ? 'العنصر' : 'Item' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr tabindex="0" role="button" (keyup.enter)="row.route && rowClick.emit(row)" [class.clickable-row]="!!row.route" (click)="row.route && rowClick.emit(row)">
            <td class="rat-time">{{ row.timestamp | appDate:'short' }}</td>
            <td class="rat-actor">{{ row.actorLabel || '—' }}</td>
            <td>
              <p-tag
                [value]="row.action"
                [severity]="actionSeverity(row.action)"
                [rounded]="true" />
            </td>
            <td>
              <span class="rat-entity-type">{{ row.entityType || '—' }}</span>
            </td>
            <td *ngIf="showEntity">
              <span class="rat-entity-label" [pTooltip]="row.entityLabel" tooltipPosition="top">
                {{ row.entityLabel | slice:0:30 }}{{ (row.entityLabel?.length || 0) > 30 ? '…' : '' }}
              </span>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div class="rat-empty" *ngIf="rows.length === 0">
        <i class="pi pi-check-circle" aria-hidden="true"></i>
        <span>{{ isAr ? 'لا يوجد نشاط حديث' : 'No recent activity' }}</span>
      </div>
    </div>
  `,
    styles: [`
    .rat-root {
      background: var(--surface-card, #fff);
      border: 1px solid var(--border-subtle, var(--border-subtle));
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .rat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border-subtle, var(--surface-ice));
    }

    .rat-title {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: var(--font-size-sm);
      font-weight: 700;
      color: var(--text-heading, var(--text-heading));
    }
    .rat-title .pi { color: var(--primary-600, #2563eb); }

    .rat-view-all {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--primary-600, #2563eb);
      text-decoration: none;
    }
    .rat-view-all:hover { text-decoration: underline; }
    .rat-view-all .pi { font-size: var(--font-size-xs); }
    [dir="rtl"] .rat-view-all .pi { transform: scaleX(-1); }

    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: var(--surface-50, var(--surface-ice)); }

    .rat-time { font-size: var(--font-size-xs); color: var(--text-muted, var(--text-muted)); white-space: nowrap; }
    .rat-actor { font-size: var(--font-size-sm); font-weight: 500; }
    .rat-entity-type { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .rat-entity-label { font-size: var(--font-size-sm); }

    .rat-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 36px 20px;
      color: var(--text-muted, var(--text-muted));
      font-size: var(--font-size-sm);
    }
    .rat-empty .pi { font-size: var(--font-size-2xl); color: var(--success); }
  `]
})
export class RecentActivityTableComponent {
  @Input() rows: ActivityRowVM[] = [];
  @Input() titleEn = 'Recent Activity';
  @Input() titleAr = 'النشاط الأخير';
  @Input() isAr = false;
  @Input() pageSize = 6;
  @Input() viewAllRoute: string | null = null;
  @Input() showEntity = false;
  @Output() rowClick = new EventEmitter<ActivityRowVM>();

  actionSeverity(action: string): 'success' | 'danger' | 'info' | 'warning' {
    const map: Record<string, 'success' | 'danger' | 'info' | 'warning'> = {
      create: 'success', add: 'success', approve: 'success', complete: 'success',
      delete: 'danger', remove: 'danger', reject: 'danger', expire: 'danger',
      update: 'info', edit: 'info', modify: 'info',
      review: 'warning', flag: 'warning', escalate: 'warning',
    };
    return map[action?.toLowerCase()] ?? 'info';
  }
}
