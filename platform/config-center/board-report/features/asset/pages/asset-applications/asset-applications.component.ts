import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AssetApiService, ApplicationDto } from '../../services/asset-api.service';
import { GrcDataTableComponent, StatusBadgeComponent } from '@app/shared/components';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-asset-applications',
    imports: [CommonModule, FormsModule, GrcDataTableComponent, StatusBadgeComponent],
    styles: [`
    .page { padding: 24px 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .title-row { display: flex; align-items: center; gap: 14px; }
    .icon-wrap { width: 48px; height: 48px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; background: var(--blue-50); }
    .icon-wrap i { font-size: var(--font-size-2xl); color: var(--blue-500); }
    h1 { margin: 0; font-size: var(--font-size-2xl); font-weight: 600; }
    .subtitle { margin: 2px 0 0; font-size: var(--font-size-base); color: var(--text-color-secondary); }
    .search-input { padding: 8px 14px; border: 1px solid var(--surface-border); border-radius: var(--radius); font-size: var(--font-size-base); min-width: 240px; }
    .btn { padding: 8px 18px; border-radius: var(--radius); border: none; font-size: var(--font-size-base); cursor: pointer; font-weight: 500; }
    .btn-primary { background: var(--primary-500); color: var(--primary-color-text); }
    .app-table { width: 100%; border-collapse: collapse; background: var(--surface-card); border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--surface-border); }
    .app-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary); text-transform: uppercase; background: var(--surface-50); border-bottom: 1px solid var(--surface-border); }
    .app-table td { padding: 12px 16px; font-size: var(--font-size-xs-plus); border-bottom: 1px solid var(--surface-50); }
    .app-table tr:hover td { background: var(--surface-50); }
  `],
    template: `
    <div class="page" [dir]="i18n.direction()">
      <header class="page-header">
        <div class="title-row">
          <div class="icon-wrap"><i class="pi pi-code"></i></div>
          <div><h1>Application Register</h1><p class="subtitle">Software and system inventory</p></div>
        </div>
        <button class="btn btn-primary" (click)="createApp()"><i class="pi pi-plus"></i> Add Application</button>
      </header>

      <grc-data-table
        title="Applications"
        [totalRecords]="total()"
        [loading]="loading()"
        [showExport]="true"
        exportFilename="applications"
        emptyMessage="No applications registered.">
        <div tableToolbar>
          <input class="search-input" placeholder="Search applications..." [ngModel]="search()" (ngModelChange)="search.set($event); load()">
        </div>
        <table class="app-table">
          <thead><tr><th>Name</th><th>Type</th><th>Vendor</th><th>Environment</th><th>Hosting</th><th>Criticality</th><th>Status</th></tr></thead>
          <tbody>
            @for (app of apps(); track app.applicationId) {
              <tr>
                <td><strong>{{ app.name }}</strong></td>
                <td>{{ app.appType }}</td>
                <td>{{ app.vendor || '—' }}</td>
                <td>{{ app.environment }}</td>
                <td>{{ app.hostingType }}</td>
                <td><app-status-badge [status]="app.criticality" /></td>
                <td><app-status-badge [status]="app.status" /></td>
              </tr>
            }
          </tbody>
        </table>
      </grc-data-table>
    </div>
  `
})
export class AssetApplicationsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(AssetApiService);
  i18n = inject(I18nService);

  loading = signal(true);
  apps = signal<ApplicationDto[]>([]);
  total = signal(0);
  search = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.listApplications({ search: this.search() || undefined }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.apps.set(res.data || []); this.total.set(res.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createApp(): void {
    const name = prompt('Application name:');
    if (!name?.trim()) return;
    this.api.createApplication({ name } as Partial<ApplicationDto>).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
