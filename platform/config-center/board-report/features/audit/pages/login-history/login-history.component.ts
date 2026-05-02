import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '../../../../../shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '../../../../../shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '../../../../../shared/ai-panel/ai-panel.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { GrcOperationsService } from '@app/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    PageShellComponent, StatusBadgeComponent, AiPanelComponent,
    TableModule, TagModule, ToolbarModule, ButtonModule,
    InputTextModule, DropdownModule, TooltipModule, ToastModule, AppDatePipe,],
  providers: [MessageService],
  template: `
    <app-page-shell
      icon="history"
      [title]="i18n.translate('loginHistory.title')"
      [subtitle]="i18n.translate('loginHistory.subtitle')"
      [breadcrumbs]="['Dashboard', 'Login History']"
      [loading]="!loaded">

      <p-toast />

      <!-- KPI Row -->
      <div class="kpi-row">
        <div class="kpi-card">
          <span class="kpi-value">{{ items.length }}</span>
          <span class="kpi-label">{{ i18n.translate('loginHistory.totalEvents') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-value">{{ authEventCount }}</span>
          <span class="kpi-label">{{ i18n.translate('loginHistory.authEvents') }}</span>
        </div>
      </div>

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('common.search')" [attr.aria-label]="i18n.translate('common.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
          <p-dropdown [options]="moduleOptions" [(ngModel)]="selectedModule"
                      optionLabel="label" optionValue="value"
                      (onChange)="filterItems()"
                      styleClass="ms-3" [style]="{'min-width':'160px'}" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18n.translate('common.export')" icon="pi pi-download"
                    severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </p-toolbar>

      <!-- Audit Trail Table -->
      <p-table aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 15"
               [rows]="15" styleClass="p-datatable-striped p-datatable-gridlines">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('loginHistory.time') }}</th>
            <th>{{ i18n.translate('loginHistory.action') }}</th>
            <th>{{ i18n.translate('loginHistory.entityType') }}</th>
            <th>{{ i18n.translate('loginHistory.user') }}</th>
            <th>{{ i18n.translate('loginHistory.ipAddress') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td>{{ (e.timestamp ?? e.created_at) | appDate:'short' }}</td>
            <td><app-status-badge [status]="e.action ?? e.event_type ?? 'view'" /></td>
            <td>{{ e.entity_type ?? e.module ?? '-' }}</td>
            <td>{{ e.user_email ?? e.performed_by ?? e.user_id ?? '-' }}</td>
            <td>{{ e.ip_address ?? e.ip ?? '-' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="5" class="empty-msg">{{ i18n.translate('loginHistory.noEntries') }}</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && items.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('loginHistory.noAuditTrail') }}</p>
      </div>

    </app-page-shell>
    <app-ai-panel module="login-history" />
  `,
  styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: var(--space-md); }
    .kpi-card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 20px; text-align: center; }
    .kpi-value { display: block; font-size: var(--font-size-3xl); font-weight: 600; color: var(--primary-color, var(--primary)); }
    .kpi-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted); margin-top: 4px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: 48px; margin-bottom: var(--space-md); display: block; }
  `]
})
export class LoginHistoryComponent implements OnInit {
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  authEventCount = 0;

  searchTerm = '';
  selectedModule = 'all';
  moduleOptions = [
    { label: 'All', value: 'all' },
    { label: 'Auth', value: 'auth' },
    { label: 'System', value: 'system' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private operationsSvc: GrcOperationsService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.operationsSvc.getAuditTrail().pipe(catchError(() => of({ entries: [] }))).subscribe({
      next: (res: Record<string, any>) => {
        const list = res?.entries ?? res?.activities ?? (Array.isArray(res) ? res : []);
        this.items = list;
        this.authEventCount = list.filter((e: any) =>
          (e.entity_type ?? e.module ?? '').toLowerCase().includes('auth') ||
          (e.action ?? '').toLowerCase().includes('login') ||
          (e.action ?? '').toLowerCase().includes('logout')
        ).length;
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.selectedModule === 'auth') {
      r = r.filter(e =>
        (e.entity_type ?? e.module ?? '').toLowerCase().includes('auth') ||
        (e.action ?? '').toLowerCase().includes('login') ||
        (e.action ?? '').toLowerCase().includes('logout')
      );
    } else if (this.selectedModule === 'system') {
      r = r.filter(e =>
        !(e.entity_type ?? e.module ?? '').toLowerCase().includes('auth') &&
        !(e.action ?? '').toLowerCase().includes('login') &&
        !(e.action ?? '').toLowerCase().includes('logout')
      );
    }
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(e =>
        (e.action ?? e.event_type ?? '').toLowerCase().includes(t) ||
        (e.entity_type ?? e.module ?? '').toLowerCase().includes(t) ||
        (e.user_email ?? e.performed_by ?? '').toLowerCase().includes(t) ||
        (e.ip_address ?? e.ip ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'login-history-export.csv'; a.click();
  }
}
