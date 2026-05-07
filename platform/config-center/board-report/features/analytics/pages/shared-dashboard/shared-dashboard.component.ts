import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '../../../../core/interceptors/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '../../../../../shared/components/layouts/page-shell.component';
import { AiPanelComponent } from '../../../../../shared/ai-panel/ai-panel.component';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-shared-dashboard',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, AiPanelComponent,
        ToolbarModule, ButtonModule, InputTextModule,
        DropdownModule, TagModule, TooltipModule, ToastModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="th-large"
      [title]="i18n.translate('sharedDashboard.title')"
      [subtitle]="i18n.translate('sharedDashboard.subtitle')"
      [breadcrumbs]="['Dashboard', 'Shared Dashboards']"
      [loading]="!loaded">

      <p-toast />

      <!-- Toolbar -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('sharedDashboard.search')" [attr.aria-label]="i18n.translate('sharedDashboard.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
          <p-dropdown [options]="typeOptions" [(ngModel)]="selectedType"
                      optionLabel="label" optionValue="value"
                      (onChange)="filterItems()"
                      styleClass="ms-3" [style]="{'min-width':'160px'}" />
        </ng-template>
      </p-toolbar>

      <!-- Card Grid -->
      <div class="dashboard-grid" *ngIf="filteredItems.length > 0">
        <div class="dashboard-card" *ngFor="let d of filteredItems; trackBy: trackByCode">
          <div class="card-icon">
            <i class="pi" [ngClass]="getCardIcon(d.dashboard_type ?? d.type)"></i>
          </div>
          <div class="card-body">
            <h4 class="card-name">{{ d.name ?? d.title ?? d.dashboard_name ?? d.code ?? '-' }}</h4>
            <p-tag [value]="d.dashboard_type ?? d.type ?? 'standard'"
                   [severity]="getTypeSeverity(d.dashboard_type ?? d.type)" class="card-tag" />
            <p class="card-desc">{{ d.description ?? d.category ?? '-' }}</p>
            <div class="card-meta">
              <span *ngIf="d.role ?? d.bound_role">
                <i class="pi pi-user"></i> {{ d.role ?? d.bound_role }}
              </span>
              <span *ngIf="d.widget_count ?? d.widgets?.length">
                <i class="pi pi-th-large"></i> {{ d.widget_count ?? d.widgets?.length }} {{ i18n.translate('sharedDashboard.widgets') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="loaded && filteredItems.length === 0" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>{{ i18n.translate('sharedDashboard.noData') }}</p>
      </div>

    </app-page-shell>
    <app-ai-panel module="shared-dashboard" />
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .dashboard-card { background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-lg); padding: 20px; display: flex; gap: 16px; transition: box-shadow 200ms, border-color 200ms; cursor: default; }
    .dashboard-card:hover { border-color: var(--primary-color, var(--primary)); box-shadow: var(--shadow-md); }
    .card-icon { width: 48px; height: 48px; border-radius: var(--radius-lg); background: var(--surface-hover, var(--surface-ice)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-icon i { font-size: var(--font-size-xl); color: var(--primary-color, var(--primary)); }
    .card-body { flex: 1; min-width: 0; }
    .card-name { margin: 0 0 6px 0; font-size: var(--font-size-md); font-weight: 600; color: var(--text-heading, #111827); }
    .card-tag { margin-bottom: 8px; }
    .card-desc { margin: 0 0 8px 0; font-size: var(--font-size-sm); color: var(--text-muted); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .card-meta { display: flex; gap: 12px; font-size: var(--font-size-sm); color: var(--text-muted); }
    .card-meta i { font-size: var(--font-size-sm); margin-inline-end: 3px; }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
  `]
})
export class SharedDashboardComponent implements OnInit {
  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  searchTerm = '';
  selectedType = 'all';
  typeOptions: { label: string; value: string }[] = [{ label: 'All Types', value: 'all' }];

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
        this.items = list;
        const types = [...new Set(list.map((d: Record<string, any>) => d.dashboard_type ?? d.type).filter(Boolean))] as string[];
        this.typeOptions = [
          { label: 'All Types', value: 'all' },
          ...types.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))
        ];
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.selectedType !== 'all') {
      r = r.filter(d => (d.dashboard_type ?? d.type) === this.selectedType);
    }
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(d =>
        (d.name ?? d.title ?? d.dashboard_name ?? '').toLowerCase().includes(t) ||
        (d.description ?? '').toLowerCase().includes(t) ||
        (d.category ?? '').toLowerCase().includes(t)
      );
    }
    this.filteredItems = r;
  }

  trackByCode(index: number, item: Record<string, any>): string {
    return item.code ?? item.dashboard_code ?? index;
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

  getCardIcon(type: string): string {
    switch (type) {
      case 'analytics': return 'pi-chart-bar';
      case 'compliance': return 'pi-check-circle';
      case 'risk': return 'pi-exclamation-triangle';
      case 'executive': return 'pi-briefcase';
      default: return 'pi-th-large';
    }
  }
}
