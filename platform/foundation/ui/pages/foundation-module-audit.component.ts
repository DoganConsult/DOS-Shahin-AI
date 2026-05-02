/**
 * Foundation Module — Page 5: Audit (Module-Scoped Audit Log)
 *
 * Phase-1 enrollment. Read-only. Carbon DataTable + Search + DatePicker + Modal.
 * Layout: Breadcrumb → Filters → KPI Tiles (3) → Audit DataTable → Row Modal.
 * Permission gate: foundation.audit.read.
 */
import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  BreadcrumbModule, TilesModule, TagModule, GridModule,
  SkeletonModule, NotificationModule, IconModule, ButtonModule,
  SearchModule, ModalModule, TooltipModule,
} from 'carbon-components-angular';
import { HttpClient } from '@angular/common/http';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

interface AuditEvent {
  id: string; time: string; actor: string; action: string;
  entity: string; ip: string; outcome: string; payload?: any;
}

@Component({
  selector: 'app-foundation-module-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    BreadcrumbModule, TilesModule, TagModule, GridModule,
    SkeletonModule, NotificationModule, IconModule, ButtonModule,
    SearchModule, ModalModule, TooltipModule,
  ],
  template: `
    <!-- Breadcrumb -->
    <cds-breadcrumb>
      <cds-breadcrumb-item [href]="'/workspace-home'">{{ i18n.tr('breadcrumb.workspace', 'Workspace') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item [href]="'/foundation'">{{ i18n.tr('foundation.name', 'Foundation') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item>{{ i18n.tr('foundation.audit.title', 'Audit') }}</cds-breadcrumb-item>
    </cds-breadcrumb>

    <!-- Filters -->
    <div class="fa-filters">
      <cds-search
        [placeholder]="i18n.tr('foundation.audit.searchPlaceholder', 'Search events...')"
        size="sm"
        (valueChange)="searchTerm = $event; load()">
      </cds-search>
      <div class="cds--select cds--select--sm cds--select--inline">
        <select class="cds--select-input" [(ngModel)]="eventTypeFilter" (change)="load()">
          <option value="">{{ i18n.tr('foundation.audit.allEvents', 'All events') }}</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
        </select>
      </div>
    </div>

    @if (loading()) {
      <cds-skeleton-text [lines]="6"></cds-skeleton-text>
    } @else {

      <!-- KPI Tiles (3) -->
      <div cdsGrid class="fa-kpis">
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-tile class="fa-kpi">
            <span class="fa-kpi-value">{{ totalEvents() }}</span>
            <span class="fa-kpi-label">{{ i18n.tr('foundation.audit.totalEvents', 'Total Events (30d)') }}</span>
          </cds-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-tile class="fa-kpi">
            <span class="fa-kpi-value">{{ uniqueActors() }}</span>
            <span class="fa-kpi-label">{{ i18n.tr('foundation.audit.uniqueActors', 'Unique Actors (30d)') }}</span>
          </cds-tile>
        </div>
        <div cdsCol [columnNumbers]="{lg: 5, md: 4, sm: 4}">
          <cds-tile class="fa-kpi">
            <span class="fa-kpi-value">{{ topAction() }}</span>
            <span class="fa-kpi-label">{{ i18n.tr('foundation.audit.topAction', 'Most Common Action') }}</span>
          </cds-tile>
        </div>
      </div>

      <!-- Audit DataTable -->
      @if (events().length === 0) {
        <cds-tile>
          <cds-notification
            [notificationObj]="{ type: 'info', title: i18n.tr('foundation.audit.empty', 'No audit events'), message: '' }"
            [showClose]="false">
          </cds-notification>
        </cds-tile>
      } @else {
        <table class="cds--data-table cds--data-table--sort">
          <thead><tr>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.time', 'Time') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.actor', 'Actor') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.action', 'Action') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.entity', 'Entity') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.ip', 'IP') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.audit.col.outcome', 'Outcome') }}</th>
          </tr></thead>
          <tbody>
            @for (evt of events(); track evt.id) {
              <tr class="cds--data-table--clickable" (click)="openDetail(evt)">
                <td>{{ evt.time }}</td>
                <td>{{ evt.actor }}</td>
                <td>{{ evt.action }}</td>
                <td>{{ evt.entity }}</td>
                <td>{{ evt.ip }}</td>
                <td><cds-tag [type]="evt.outcome === 'success' ? 'green' : 'red'" size="sm">{{ evt.outcome }}</cds-tag></td>
              </tr>
            }
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="fa-pagination">
          <span>{{ events().length }} {{ i18n.tr('foundation.audit.of', 'of') }} {{ totalEvents() }} {{ i18n.tr('foundation.audit.events', 'events') }}</span>
          <div class="fa-pagination-controls">
            <button cdsButton="ghost" size="sm" [disabled]="page <= 1" (click)="page = page - 1; load()">
              <svg cdsIcon="chevron--left" size="16"></svg>
            </button>
            <span>{{ page }}</span>
            <button cdsButton="ghost" size="sm" (click)="page = page + 1; load()">
              <svg cdsIcon="chevron--right" size="16"></svg>
            </button>
          </div>
        </div>
      }

      <!-- Export stub -->
      <div class="fa-export">
        <cds-tooltip [description]="i18n.tr('foundation.audit.exportDisabled', 'Available in Phase 3')">
          <button cdsButton="tertiary" size="sm" [disabled]="true">
            <svg cdsIcon="download" size="16"></svg>
            {{ i18n.tr('foundation.audit.export', 'Export') }}
          </button>
        </cds-tooltip>
      </div>

    }

    <!-- Detail Modal -->
    @if (selectedEvent()) {
      <cds-modal [open]="!!selectedEvent()" (overlaySelected)="selectedEvent.set(null)" size="lg">
        <cds-modal-header [showCloseButton]="true" (closeSelect)="selectedEvent.set(null)">
          <h3 cdsModalHeaderHeading>{{ i18n.tr('foundation.audit.eventDetail', 'Event Detail') }}</h3>
        </cds-modal-header>
        <section cdsModalContent>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">ID</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.id }}</div>
              </div>
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">Time</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.time }}</div>
              </div>
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">Actor</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.actor }}</div>
              </div>
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">Action</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.action }}</div>
              </div>
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">Entity</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.entity }}</div>
              </div>
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fa-key">Outcome</div>
                <div class="cds--structured-list-td">{{ selectedEvent()!.outcome }}</div>
              </div>
            </div>
          </section>
          <pre class="fa-payload">{{ selectedEvent()!.payload | json }}</pre>
        </section>
      </cds-modal>
    }
  `,
  styles: [`
    :host { display: block; padding: var(--cds-spacing-06); background: var(--cds-background); }
    .fa-filters { display: flex; gap: var(--cds-spacing-04); margin: var(--cds-spacing-05) 0; flex-wrap: wrap; }
    .fa-filters cds-search { flex: 1; min-width: 200px; }
    .fa-kpis { margin-block-end: var(--cds-spacing-05); }
    .fa-kpi { text-align: center; }
    .fa-kpi-value { display: block; font-size: var(--cds-heading-04-font-size, 1.75rem); font-weight: 600; }
    .fa-kpi-label { font-size: var(--cds-body-compact-01-font-size); color: var(--cds-text-secondary); }
    .cds--data-table { width: 100%; }
    .cds--data-table--clickable { cursor: pointer; }
    .cds--data-table--clickable:hover { background: var(--cds-layer-hover-01); }
    .fa-pagination { display: flex; justify-content: space-between; align-items: center; padding: var(--cds-spacing-03) 0; color: var(--cds-text-secondary); font-size: var(--cds-body-compact-01-font-size); }
    .fa-pagination-controls { display: flex; align-items: center; gap: var(--cds-spacing-03); }
    .fa-export { margin-top: var(--cds-spacing-04); }
    .fa-key { font-weight: 600; color: var(--cds-text-secondary); min-width: 120px; }
    .fa-payload { background: var(--cds-layer-01); padding: var(--cds-spacing-04); border-radius: 4px; font-size: 0.75rem; max-height: 300px; overflow: auto; white-space: pre-wrap; word-break: break-all; }
  `],
})
export class FoundationModuleAuditComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  events = signal<AuditEvent[]>([]);
  totalEvents = signal(0);
  uniqueActors = signal(0);
  topAction = signal('—');
  selectedEvent = signal<AuditEvent | null>(null);
  searchTerm = '';
  eventTypeFilter = '';
  page = 1;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const params: any = { module: 'foundation', page: this.page, limit: 25 };
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.eventTypeFilter) params.action = this.eventTypeFilter;

    this.http.get<any>('/api/audit', { params }).pipe(
      catchError(() => of({ events: [], total: 0 })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(res => {
      const raw = Array.isArray(res?.events) ? res.events : [];
      this.events.set(raw.map((e: any) => ({
        id: e.id ?? e.event_id ?? '',
        time: e.timestamp ?? e.created_at ?? '—',
        actor: e.actor_email ?? e.user_id ?? '—',
        action: e.action ?? '—',
        entity: e.entity_type ?? '—',
        ip: e.ip_address ?? '—',
        outcome: e.outcome ?? e.result ?? 'success',
        payload: e.payload ?? e.metadata ?? {},
      })));
      this.totalEvents.set(res?.total ?? raw.length);
      const actors = new Set(raw.map((e: any) => e.actor_email ?? e.user_id));
      this.uniqueActors.set(actors.size);
      const actionCounts: Record<string, number> = {};
      for (const e of raw) { const a = e.action ?? 'unknown'; actionCounts[a] = (actionCounts[a] ?? 0) + 1; }
      const top = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];
      this.topAction.set(top ? top[0] : '—');
      this.loading.set(false);
    });
  }

  openDetail(evt: AuditEvent): void { this.selectedEvent.set(evt); }
}
