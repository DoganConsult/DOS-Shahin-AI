import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '../../../../../shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '../../../../../shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../../../../shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-sharing',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule,
        InputTextModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="share-alt"
      [title]="i18n.translate('dashboardSharing.title')"
      [subtitle]="i18n.translate('dashboardSharing.subtitle')"
      [breadcrumbs]="['Dashboard', 'Dashboard Sharing']"
      [loading]="!loaded">

      <p-toast />

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('common.search')" [attr.aria-label]="i18n.translate('common.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('dashboardSharing.export')" icon="pi pi-download"
                    severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <!-- Dashboard Table -->
      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 15"
               [rows]="15" styleClass="p-datatable-striped p-datatable-gridlines">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('common.name') }}</th>
            <th>{{ i18n.translate('dashboardSharing.type') }}</th>
            <th>{{ i18n.translate('dashboardSharing.visibility') }}</th>
            <th>{{ i18n.translate('dashboardSharing.role') }}</th>
            <th style="width:100px">{{ i18n.translate('common.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td><strong>{{ d.name ?? d.title ?? d.dashboard_name ?? d.code ?? '-' }}</strong></td>
            <td>
              <p-tag [value]="d.dashboard_type ?? d.type ?? 'standard'" [severity]="getTypeSeverity(d.dashboard_type ?? d.type)" />
            </td>
            <td>
              <app-status-badge [status]="d.visibility ?? 'private'" />
              <p-tag [value]="d.visibility ?? 'private'" [severity]="d.visibility === 'shared' ? 'success' : 'info'" styleClass="ms-1" />
            </td>
            <td>{{ d.role_binding ?? d.role ?? d.bound_role ?? 'all' }}</td>
            <td>
              <div class="action-btns">
                <button class="icon-btn" (click)="toggleShare(d)"
                        [pTooltip]="d._shared ? i18n.translate('dashboardSharing.unshare') : i18n.translate('dashboardSharing.share')">
                  <i class="pi" [class.pi-share-alt]="!d._shared" [class.pi-lock]="d._shared"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-msg">{{ i18n.translate('dashboardSharing.noDashboards') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && items.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('dashboardSharing.noDashboardsAvailable') }}</p>
      </div>

    </app-page-shell>
    <app-ai-panel module="dashboard-sharing" />
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
  `]
})
export class DashboardSharingComponent implements OnInit {
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.apiclientSvc.get('/agrc-os/dashboards/catalog').pipe(catchError(() => of({ dashboards: [] }))).subscribe({
      next: (res: Record<string, any>) => {
        const list = res?.dashboards ?? res?.catalog ?? (Array.isArray(res) ? res : []);
        this.items = list.map((d: Record<string, any>) => ({
          ...d,
          _shared: d.shared || d.visibility === 'shared',
        }));
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(d =>
        (d.name ?? d.title ?? d.dashboard_name ?? '').toLowerCase().includes(t) ||
        (d.dashboard_type ?? d.type ?? '').toLowerCase().includes(t) ||
        (d.role_binding ?? d.role ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  toggleShare(d: Record<string, any>): void {
    d._shared = !d._shared;
    this.msg.add({
      severity: 'info',
      summary: d._shared ? 'Shared' : 'Unshared',
      detail: `${d.name ?? d.title ?? 'Dashboard'} ${d._shared ? 'shared' : 'set to private'}`,
      life: 3000,
    });
  }

  getTypeSeverity(type: string): string {
    switch (type) {
      case 'analytics': return 'info';
      case 'compliance': return 'success';
      case 'risk': return 'warning';
      case 'executive': return 'danger';
      default: return 'info';
    }
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = ['name', 'type', 'visibility', 'role'];
    const csv = [headers.join(','), ...this.filteredItems.map(d =>
      [
        `"${(d.name ?? d.title ?? d.dashboard_name ?? '').replace(/"/g, '""')}"`,
        `"${d.dashboard_type ?? d.type ?? 'standard'}"`,
        `"${d.visibility ?? 'private'}"`,
        `"${d.role_binding ?? d.role ?? 'all'}"`,
      ].join(',')
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dashboard-sharing-export.csv'; a.click();
  }
}
