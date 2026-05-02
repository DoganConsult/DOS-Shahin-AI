/**
 * Control Mapping Tab — AGRC-OS Controls Module
 * Shows linked risks, obligations, and policies with counts.
 * Future: add/remove buttons for linking entities.
 */
import { Component, Input, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import type { ControlDetailDto } from '../../../services/controls-api.types';
import { ControlProcessCycleService, LinkedItems } from '../../../services/control-process-cycle.service';

@Component({
    selector: 'app-control-mapping-tab',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TableModule, EmptyStateComponent, SkeletonLoaderComponent],
    template: `
    @if (!control) {
      <app-empty-state
        [title]="i18n.isAr() ? 'لا توجد بيانات' : 'No data available'"
        [variant]="'default'" />
    } @else {
      <div class="mapping-content" [dir]="i18n.direction()">

        <!-- Summary Cards -->
        <div class="mapping-summary">
          <div class="mapping-card">
            <span class="card-count">{{ control.mappedRiskCount ?? 0 }}</span>
            <span class="card-label">{{ i18n.isAr() ? 'المخاطر المرتبطة' : 'Linked Risks' }}</span>
          </div>
          <div class="mapping-card">
            <span class="card-count">{{ control.mappedObligationCount ?? 0 }}</span>
            <span class="card-label">{{ i18n.isAr() ? 'الالتزامات المرتبطة' : 'Linked Obligations' }}</span>
          </div>
          <div class="mapping-card">
            <span class="card-count">{{ control.mappedPolicyCount ?? 0 }}</span>
            <span class="card-label">{{ i18n.isAr() ? 'السياسات المرتبطة' : 'Linked Policies' }}</span>
          </div>
        </div>

        <!-- Linked Risks Table -->
        @if (loadingLinks()) {
          <app-skeleton-loader [variant]="'list'" [count]="3" />
        } @else {
          @if (linkedItems()?.risks?.length) {
            <h4 class="table-heading">{{ i18n.isAr() ? 'المخاطر' : 'Risks' }}</h4>
            <p-table [value]="linkedItems()!.risks" [rows]="10" [paginator]="linkedItems()!.risks.length > 10"
                     styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isAr() ? 'المعرف' : 'ID' }}</th>
                  <th>{{ i18n.isAr() ? 'العنوان' : 'Title' }}</th>
                  <th>{{ i18n.isAr() ? 'الدرجة' : 'Score' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-risk>
                <tr>
                  <td>{{ risk.id }}</td>
                  <td>{{ risk.title || '--' }}</td>
                  <td>{{ risk.score ?? '--' }}</td>
                  <td>{{ risk.taskStatus || '--' }}</td>
                </tr>
              </ng-template>
            </p-table>
          }

          <!-- Linked Evidence -->
          @if (linkedItems()?.evidence?.length) {
            <h4 class="table-heading" style="margin-top: 24px;">{{ i18n.isAr() ? 'الأدلة' : 'Evidence' }}</h4>
            <p-table [value]="linkedItems()!.evidence" [rows]="10" [paginator]="linkedItems()!.evidence.length > 10"
                     styleClass="p-datatable-sm p-datatable-striped">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.isAr() ? 'المعرف' : 'ID' }}</th>
                  <th>{{ i18n.isAr() ? 'العنوان' : 'Title' }}</th>
                  <th>{{ i18n.isAr() ? 'التكرار' : 'Frequency' }}</th>
                  <th>{{ i18n.isAr() ? 'الحالة' : 'Status' }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-ev>
                <tr>
                  <td>{{ ev.id }}</td>
                  <td>{{ ev.title || '--' }}</td>
                  <td>{{ ev.frequency || '--' }}</td>
                  <td>{{ ev.taskStatus || '--' }}</td>
                </tr>
              </ng-template>
            </p-table>
          }

          <!-- Empty state if no linked items at all -->
          @if (!linkedItems()?.risks?.length && !linkedItems()?.evidence?.length && !linkedItems()?.gaps?.length) {
            <app-empty-state
              [title]="i18n.isAr() ? 'لا توجد عناصر مرتبطة' : 'No linked items'"
              [description]="i18n.isAr() ? 'قم بربط المخاطر والالتزامات والسياسات بهذا الضابط.' : 'Link risks, obligations, and policies to this control.'"
              [variant]="'default'" />
          }
        }

      </div>
    }
  `,
    styles: [`
    .mapping-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .mapping-card {
      flex: 1;
      min-width: 140px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius, 6px);
      text-align: center;
      background: var(--bg-0);
    }

    .card-count {
      display: block;
      font-size: var(--font-size-2xl, 24px);
      font-weight: 700;
      color: var(--primary);
    }

    .card-label {
      display: block;
      font-size: var(--font-size-xs, 11px);
      color: var(--text-muted);
      margin-top: 4px;
    }

    .table-heading {
      margin: 0 0 12px;
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-body);
    }
  `]
})
export class ControlMappingTabComponent implements OnInit {
  @Input() control: ControlDetailDto | null = null;

  i18n = inject(I18nService);
  private processCycleService = inject(ControlProcessCycleService);

  loadingLinks = signal(false);
  linkedItems = signal<LinkedItems | null>(null);

  ngOnInit(): void {
    if (this.control?.id) {
      this.loadingLinks.set(true);
      this.processCycleService.getLinkedItems(this.control.id).subscribe({
        next: (items) => {
          this.linkedItems.set(items);
          this.loadingLinks.set(false);
        },
        error: () => {
          this.loadingLinks.set(false);
        },
      });
    }
  }
}
