import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ButtonModule, DialogModule, PaginationModule, SearchModule, TableModule,
} from 'carbon-components-angular';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';
import { moduleApi, modulePerms, withScope } from './module-api';

interface RecordRow { id: string; [k: string]: unknown; }
interface RecordsDto { items?: RecordRow[]; total?: number; }

@Component({
  selector: 'app-module-records-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule, PaginationModule, SearchModule, ButtonModule, DialogModule],
  template: `
    <h1 class="cds--type-productive-heading-04">{{ moduleCode() }} — Records</h1>
    <cds-table-toolbar>
      <cds-table-toolbar-search [expandable]="true" (valueChange)="onSearch($event)"></cds-table-toolbar-search>
      <cds-table-toolbar-actions>
        <button *ngIf="canCreate()" cdsButton="primary" size="sm">New</button>
      </cds-table-toolbar-actions>
    </cds-table-toolbar>
    <cds-table [model]="model" [showSelectionColumn]="false" size="md"></cds-table>
    <cds-pagination
      [model]="model"
      (selectPage)="onPage($event)">
    </cds-pagination>
  `,
})
export class ModuleRecordsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  readonly moduleCode = signal<string>(this.route.snapshot.data['moduleCode'] || 'unknown');
  readonly model = new TableModel();
  readonly query = signal('');
  readonly canCreate = (): boolean => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.create);
  };

  constructor() {
    this.model.pageLength = 25;
    void this.load(1);
  }

  onSearch(q: string): void { this.query.set(q); void this.load(1); }
  onPage(p: number): void { void this.load(p); }

  private async load(page: number): Promise<void> {
    const api = moduleApi(this.moduleCode());
    if (!api) return;
    const url = new URL(api.records, window.location.origin);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(this.model.pageLength));
    if (this.query()) url.searchParams.set('q', this.query());
    const tenantId = this.access.tenantId();
    if (tenantId) url.searchParams.set('tenantId', tenantId);
    const res = await firstValueFrom(
      this.http.get<RecordsDto>(url.pathname + url.search, { withCredentials: true }),
    );
    const items = res?.items ?? [];
    const cols = items[0] ? Object.keys(items[0]).slice(0, 6) : ['id'];
    this.model.header = cols.map(c => new TableHeaderItem({ data: c }));
    this.model.data = items.map(r => cols.map(c => new TableItem({ data: String(r[c] ?? '') })));
    this.model.totalDataLength = res?.total ?? items.length;
    this.model.currentPage = page;
  }
}
