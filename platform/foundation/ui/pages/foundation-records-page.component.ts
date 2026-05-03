import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import {
  ButtonModule,
  DialogModule,
  DropdownModule,
  ModalModule,
  NotificationModule,
  PaginationModule,
  SearchModule,
  TableHeaderItem,
  TableItem,
  TableModel,
  TableModule,
  TagModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';

type RecordEntity =
  | 'organizations'
  | 'businessUnits'
  | 'departments'
  | 'teams'
  | 'users'
  | 'roles'
  | 'positions'
  | 'locations'
  | 'committees'
  | 'delegations';

interface RecordEntityOption {
  key: RecordEntity;
  content: string;
  selected?: boolean;
}

interface StatusFilterOption {
  content: string;
  selected?: boolean;
}

@Component({
  selector: 'app-foundation-records-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    PaginationModule,
    SearchModule,
    ButtonModule,
    DialogModule,
    ModalModule,
    DropdownModule,
    TagModule,
    NotificationModule,
  ],
  template: `
    <section class="foundation-page">
      <header class="foundation-page__header">
        <div>
          <p class="foundation-page__eyebrow">Foundation</p>
          <h1 class="foundation-page__title">Records</h1>
          <p class="foundation-page__subtitle">
            Unified record view for organizations, business units, departments, teams, users, roles, positions, locations, committees, and delegations.
          </p>
        </div>
        <cds-tag type="blue">{{ totalRows() }} records</cds-tag>
      </header>

      @if (error()) {
        <cds-notification
          [notificationObj]="{ type: 'warning', title: 'Foundation records are partially available', message: error()! }">
        </cds-notification>
      }

      <cds-table-toolbar>
        <cds-table-toolbar-search [expandable]="true" (valueChange)="onSearch($event)"></cds-table-toolbar-search>
        <cds-table-toolbar-actions>
          <cds-dropdown
            label="Entity"
            placeholder="Select entity"
            (selected)="onEntitySelected($event)">
            <cds-dropdown-list [items]="entityItems()"></cds-dropdown-list>
          </cds-dropdown>
          <cds-dropdown
            label="Statuses"
            placeholder="Filter statuses"
            type="multi"
            (selected)="onStatusesSelected($event)">
            <cds-dropdown-list [items]="statusItems()"></cds-dropdown-list>
          </cds-dropdown>
          <button cdsButton="primary" size="sm" [disabled]="true">Create</button>
        </cds-table-toolbar-actions>
      </cds-table-toolbar>

      @if (loading()) {
        <cds-notification
          [notificationObj]="{ type: 'info', title: 'Loading records', message: 'Foundation is querying the selected record surface.' }">
        </cds-notification>
      } @else if (model.data.length === 0) {
        <cds-notification
          [notificationObj]="{ type: 'info', title: 'No records found', message: 'Adjust the entity filter or search terms.' }">
        </cds-notification>
      } @else {
        <cds-table [model]="model" [showSelectionColumn]="false" size="md"></cds-table>
        <div class="foundation-page__table-actions">
          <ibm-overflow-menu [flip]="true" description="Record actions">
            <ibm-overflow-menu-option (selected)="openSelectedRow()">
              View selected row
            </ibm-overflow-menu-option>
            <ibm-overflow-menu-option (selected)="openEntityRoute()">
              Open legacy entity page
            </ibm-overflow-menu-option>
          </ibm-overflow-menu>
        </div>
        <cds-pagination [model]="model" (selectPage)="onPage($event)"></cds-pagination>
      }

      @if (selectedRow()) {
        <cds-modal [open]="true" size="lg" (overlaySelected)="selectedRow.set(null)">
          <cds-modal-header [showCloseButton]="true" (closeSelect)="selectedRow.set(null)">
            <h3 cdsModalHeaderHeading>{{ entityLabel() }} record</h3>
          </cds-modal-header>
          <section cdsModalContent>
            <pre class="foundation-page__pre">{{ selectedRow() | json }}</pre>
          </section>
        </cds-modal>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .foundation-page {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06);
      padding: var(--cds-spacing-06);
      background: var(--cds-background);
      min-height: 100%;
    }
    .foundation-page__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--cds-spacing-05);
      flex-wrap: wrap;
    }
    .foundation-page__eyebrow {
      margin: 0 0 var(--cds-spacing-02);
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .foundation-page__title {
      margin: 0;
      font-size: var(--cds-heading-05-font-size, 2rem);
    }
    .foundation-page__subtitle {
      margin: var(--cds-spacing-03) 0 0;
      color: var(--cds-text-secondary);
      max-width: 72ch;
    }
    .foundation-page__table-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: calc(-1 * var(--cds-spacing-04));
    }
    .foundation-page__pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--cds-layer-01);
      padding: var(--cds-spacing-04);
    }
  `],
})
export class FoundationRecordsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(FoundationApiService);

  readonly entity = signal<RecordEntity>('users');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly activeStatuses = signal<string[]>([]);
  readonly selectedRow = signal<Record<string, unknown> | null>(null);
  readonly totalRows = signal(0);
  readonly entityItems = signal<RecordEntityOption[]>([
    { key: 'organizations', content: 'Organizations' },
    { key: 'businessUnits', content: 'Business units' },
    { key: 'departments', content: 'Departments' },
    { key: 'teams', content: 'Teams' },
    { key: 'users', content: 'Users', selected: true },
    { key: 'roles', content: 'Roles' },
    { key: 'positions', content: 'Positions' },
    { key: 'locations', content: 'Locations' },
    { key: 'committees', content: 'Committees' },
    { key: 'delegations', content: 'Delegations' },
  ]);
  readonly statusItems = signal<StatusFilterOption[]>([
    { content: 'active' },
    { content: 'inactive' },
    { content: 'pending' },
    { content: 'draft' },
    { content: 'approved' },
  ]);
  readonly entityLabel = signal('Users');
  readonly model = new TableModel();

  constructor() {
    this.model.pageLength = 12;
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value.trim().toLowerCase());
    this.load();
  }

  onEntitySelected(event: { item: RecordEntityOption | RecordEntityOption[] | null }): void {
    const item = Array.isArray(event?.item) ? event.item[0] : event?.item;
    if (!item) return;
    this.entity.set(item.key);
    this.entityLabel.set(item.content);
    this.entityItems.update(items => items.map(entry => ({ ...entry, selected: entry.key === item.key })));
    this.load();
  }

  onStatusesSelected(event: { item: StatusFilterOption | StatusFilterOption[] | null }): void {
    const items = Array.isArray(event?.item) ? event.item : event?.item ? [event.item] : [];
    this.activeStatuses.set(items.map(item => item.content.toLowerCase()));
    this.statusItems.update(options => options.map(option => ({
      ...option,
      selected: this.activeStatuses().includes(option.content.toLowerCase()),
    })));
    this.load();
  }

  onPage(page: number): void {
    this.model.currentPage = page;
  }

  openSelectedRow(): void {
    const first = this.model.data[0];
    if (!first) return;
    const row: Record<string, unknown> = {};
    this.model.header.forEach((header, index) => {
      row[String(header.data)] = first[index]?.data ?? '';
    });
    this.selectedRow.set(row);
  }

  openEntityRoute(): void {
    const routes: Record<RecordEntity, string> = {
      organizations: '/foundation/organization',
      businessUnits: '/foundation/business-units',
      departments: '/foundation/departments',
      teams: '/foundation/teams',
      users: '/foundation/users',
      roles: '/foundation/roles',
      positions: '/foundation/positions',
      locations: '/foundation/locations',
      committees: '/foundation/committees',
      delegations: '/foundation/delegations',
    };
    window.location.assign(routes[this.entity()]);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.readEntity()
      .pipe(
        catchError((err: unknown) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          return of([] as Record<string, unknown>[]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(rows => {
        const filtered = rows.filter(row => this.matchesSearch(row) && this.matchesStatus(row));
        this.totalRows.set(filtered.length);
        const preview = filtered.slice(0, this.model.pageLength);
        const columns = this.resolveColumns(preview);
        this.model.header = columns.map(column => new TableHeaderItem({ data: column }));
        this.model.data = preview.map(row => columns.map(column => new TableItem({ data: this.cellValue(row[column]) })));
        this.model.totalDataLength = filtered.length;
        this.loading.set(false);
      });
  }

  private readEntity() {
    switch (this.entity()) {
      case 'organizations':
        return this.api.getOrganizations().pipe(pickRows('organizations'));
      case 'businessUnits':
        return this.api.getBusinessUnits().pipe(pickRows('businessUnits'));
      case 'departments':
        return this.api.getDepartments().pipe(pickRows('departments', 'rows'));
      case 'teams':
        return this.api.getTeams().pipe(pickRows('teams'));
      case 'roles':
        return this.api.getFoundationRoles().pipe(pickRows('roles'));
      case 'positions':
        return this.api.getPositions().pipe(pickRows('positions'));
      case 'locations':
        return this.api.getLocations({ pageSize: 100 }).pipe(pickRows('data'));
      case 'committees':
        return this.api.getCommittees().pipe(pickRows('committees'));
      case 'delegations':
        return this.api.getDelegations().pipe(pickRows('delegations'));
      case 'users':
      default:
        return this.api.getUsers({ limit: 100 }).pipe(pickRows('users'));
    }
  }

  private resolveColumns(rows: Record<string, unknown>[]): string[] {
    const fallback = ['id'];
    const first = rows[0];
    if (!first) return fallback;
    return Object.keys(first).slice(0, 6);
  }

  private matchesSearch(row: Record<string, unknown>): boolean {
    const query = this.search();
    if (!query) return true;
    return Object.values(row).some(value => String(value ?? '').toLowerCase().includes(query));
  }

  private matchesStatus(row: Record<string, unknown>): boolean {
    const filters = this.activeStatuses();
    if (filters.length === 0) return true;
    const candidate = String(row['status'] ?? row['state'] ?? '').toLowerCase();
    return candidate ? filters.includes(candidate) : true;
  }

  private cellValue(value: unknown): string {
    if (Array.isArray(value)) return value.join(', ');
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

function pickRows<T extends object = Record<string, unknown>>(...keys: string[]) {
  return map((source: T) => {
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) return value as Record<string, unknown>[];
    }
    return [] as Record<string, unknown>[];
  });
}