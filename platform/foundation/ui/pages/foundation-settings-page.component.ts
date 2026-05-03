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
import { catchError, forkJoin, of } from 'rxjs';
import {
  CheckboxModule,
  DropdownModule,
  InputModule,
  NotificationModule,
  StructuredListModule,
  TabsModule,
  TagModule,
  ToggleModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';

interface SettingRow {
  key: string;
  value: string;
}

interface DropdownItem {
  content: string;
  selected?: boolean;
}

@Component({
  selector: 'app-foundation-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    StructuredListModule,
    ToggleModule,
    CheckboxModule,
    InputModule,
    DropdownModule,
    TagModule,
    NotificationModule,
  ],
  template: `
    <section class="foundation-page">
      <header class="foundation-page__header">
        <div>
          <p class="foundation-page__eyebrow">Foundation</p>
          <h1 class="foundation-page__title">Settings</h1>
          <p class="foundation-page__subtitle">
            Org profile, role model, permission policy, hierarchy rules, delegation rules, SoD rules, module readiness, and audit settings.
          </p>
        </div>
        <cds-tag [type]="ready() ? 'green' : 'red'">{{ ready() ? 'Ready' : 'Needs attention' }}</cds-tag>
      </header>

      @if (error()) {
        <cds-notification [notificationObj]="{ type: 'warning', title: 'Settings are partially available', message: error()! }"></cds-notification>
      }

      <cds-tabs>
        <cds-tab heading="Org profile">
          <div class="foundation-page__controls">
            <cds-text-label helperText="Read-only tenant configuration">
              Module code
              <input cdsText [readonly]="true" [value]="moduleCode()" />
            </cds-text-label>
            <cds-text-label helperText="Tenant config keys surfaced to Foundation">
              Config sections
              <input cdsText [readonly]="true" [value]="configSectionSummary()" />
            </cds-text-label>
          </div>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (row of orgProfile(); track row.key) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td foundation-page__key">{{ row.key }}</div>
                  <div class="cds--structured-list-td">{{ row.value }}</div>
                </div>
              }
            </div>
          </section>
        </cds-tab>

        <cds-tab heading="Role model">
          <div class="foundation-page__controls foundation-page__controls--compact">
            <cds-dropdown label="Role preview" (selected)="onRoleSelected($event)">
              <cds-dropdown-list [items]="roleItems()"></cds-dropdown-list>
            </cds-dropdown>
            <cds-checkbox [checked]="permissionsLoaded()" [disabled]="true">Permission policy loaded</cds-checkbox>
          </div>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (row of roleModel(); track row.key) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td foundation-page__key">{{ row.key }}</div>
                  <div class="cds--structured-list-td">{{ row.value }}</div>
                </div>
              }
            </div>
          </section>
        </cds-tab>

        <cds-tab heading="Hierarchy & delegation">
          <div class="foundation-page__controls foundation-page__controls--compact">
            <cds-toggle [checked]="hierarchyIntegrity()" [disabled]="true" label="Hierarchy integrity" onText="OK" offText="Issue"></cds-toggle>
            <cds-toggle [checked]="delegationsCount() > 0" [disabled]="true" label="Delegation rules active" onText="Yes" offText="No"></cds-toggle>
          </div>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (row of hierarchyRows(); track row.key) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td foundation-page__key">{{ row.key }}</div>
                  <div class="cds--structured-list-td">{{ row.value }}</div>
                </div>
              }
            </div>
          </section>
        </cds-tab>

        <cds-tab heading="SoD & readiness">
          <div class="foundation-page__controls foundation-page__controls--compact">
            <cds-toggle [checked]="sodViolations() === 0" [disabled]="true" label="SoD state" onText="Clear" offText="Violations"></cds-toggle>
            <cds-checkbox [checked]="ready()" [disabled]="true">Module readiness acceptable</cds-checkbox>
          </div>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (row of readinessRows(); track row.key) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td foundation-page__key">{{ row.key }}</div>
                  <div class="cds--structured-list-td">{{ row.value }}</div>
                </div>
              }
            </div>
          </section>
        </cds-tab>

        <cds-tab heading="Audit settings">
          <cds-notification [notificationObj]="{ type: 'info', title: 'Read-only audit configuration', message: 'Edit audit policy through platform administration once write flows are approved.' }"></cds-notification>
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (row of auditRows(); track row.key) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td foundation-page__key">{{ row.key }}</div>
                  <div class="cds--structured-list-td">{{ row.value }}</div>
                </div>
              }
            </div>
          </section>
        </cds-tab>
      </cds-tabs>
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
    .foundation-page__controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: var(--cds-spacing-05);
      margin-bottom: var(--cds-spacing-05);
    }
    .foundation-page__controls--compact {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--cds-spacing-05);
    }
    .foundation-page__key {
      font-weight: 600;
      color: var(--cds-text-secondary);
      width: 18rem;
    }
  `],
})
export class FoundationSettingsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(FoundationApiService);

  readonly error = signal<string | null>(null);
  readonly ready = signal(false);
  readonly hierarchyIntegrity = signal(false);
  readonly delegationsCount = signal(0);
  readonly sodViolations = signal(0);
  readonly moduleCode = signal('foundation');
  readonly configSectionSummary = signal('—');
  readonly permissionsLoaded = signal(false);
  readonly orgProfile = signal<SettingRow[]>([]);
  readonly roleModel = signal<SettingRow[]>([]);
  readonly hierarchyRows = signal<SettingRow[]>([]);
  readonly readinessRows = signal<SettingRow[]>([]);
  readonly auditRows = signal<SettingRow[]>([]);
  readonly roleItems = signal<DropdownItem[]>([]);

  constructor() {
    forkJoin({
      tenantConfig: this.api.getTenantConfig().pipe(catchError(() => of({}))),
      lookups: this.api.getLookups().pipe(catchError(() => of({}))),
      roles: this.api.getFoundationRoles().pipe(catchError(() => of({ roles: [] }))),
      health: this.api.getFoundationHealth().pipe(catchError(() => of(null))),
      moduleConfig: this.api.getFoundationModuleConfig().pipe(catchError(() => of({ data: {} }))),
      delegations: this.api.getDelegations().pipe(catchError(() => of({ delegations: [] }))),
      sodRules: this.api.getSodRules().pipe(catchError(() => of({ data: [] }))),
      sodViolations: this.api.getSodViolations().pipe(catchError(() => of({ data: [] }))),
      audit: this.api.getAuditTrail({ module: 'foundation', limit: 10 }).pipe(catchError(() => of({ entries: [] }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ tenantConfig, lookups, roles, health, moduleConfig, delegations, sodRules, sodViolations, audit }) => {
          this.applyState(tenantConfig, lookups, roles, health, moduleConfig, delegations, sodRules, sodViolations, audit);
        },
        error: (err: unknown) => {
          this.error.set(FoundationApiService.formatLoadError(err));
        },
      });
  }

  onRoleSelected(event: { item: DropdownItem | DropdownItem[] | null }): void {
    const item = Array.isArray(event?.item) ? event.item[0] : event?.item;
    if (!item) return;
    this.roleItems.update(items => items.map(entry => ({ ...entry, selected: entry.content === item.content })));
  }

  private applyState(
    tenantConfig: any,
    lookups: any,
    roles: { roles?: unknown[] },
    health: any,
    moduleConfig: any,
    delegations: { delegations?: unknown[] },
    sodRules: { data?: unknown[] },
    sodViolationResult: { data?: unknown[] },
    audit: any,
  ): void {
    const configData = tenantConfig?.data ?? tenantConfig ?? {};
    const configSections = Object.keys(configData);
    const roleRows = Array.isArray(roles?.roles) ? roles.roles : [];
    const signals = (health?.signals ?? {}) as Record<string, unknown>;
    const moduleConfigData = moduleConfig?.data ?? {};
    const auditEntries = Array.isArray(audit?.entries) ? audit.entries : Array.isArray(audit?.rows) ? audit.rows : [];
    const violations = Array.isArray(sodViolationResult?.data) ? sodViolationResult.data : [];
    const rules = Array.isArray(sodRules?.data) ? sodRules.data : [];

    this.ready.set(Boolean(signals['schema_exists']) && Boolean(signals['tables_exist']) && Boolean(signals['hierarchy_integrity']));
    this.hierarchyIntegrity.set(Boolean(signals['hierarchy_integrity']));
    this.delegationsCount.set(Array.isArray(delegations?.delegations) ? delegations.delegations.length : 0);
    this.sodViolations.set(violations.length);
    this.configSectionSummary.set(configSections.length ? configSections.join(', ') : 'General');
    this.permissionsLoaded.set(roleRows.length > 0 && Array.isArray(lookups?.permissionGroups));
    this.roleItems.set(roleRows.slice(0, 10).map((role: any, index) => ({ content: String(role.code ?? role.nameEn ?? role.name ?? `Role ${index + 1}`), selected: index === 0 })));

    this.orgProfile.set([
      { key: 'Config sections', value: configSections.length ? String(configSections.length) : '0' },
      { key: 'Reference groups', value: String((lookups?.referenceDataGroups ?? []).length) },
      { key: 'Module config bundle', value: Object.keys(moduleConfigData).join(', ') || 'Unavailable' },
    ]);

    this.roleModel.set([
      { key: 'Role count', value: String(roleRows.length) },
      { key: 'Permission groups', value: String((lookups?.permissionGroups ?? []).length) },
      { key: 'Authority kinds', value: String((lookups?.foundationSurfaces ?? []).length) },
    ]);

    this.hierarchyRows.set([
      { key: 'Hierarchy integrity', value: this.hierarchyIntegrity() ? 'OK' : 'Attention required' },
      { key: 'Delegations', value: String(this.delegationsCount()) },
      { key: 'Ownership domains', value: Array.isArray(lookups?.ownershipTypes) ? lookups.ownershipTypes.join(', ') : 'Unavailable' },
      { key: 'Review frequencies', value: Array.isArray(lookups?.reviewFrequencies) ? lookups.reviewFrequencies.join(', ') : 'Unavailable' },
    ]);

    this.readinessRows.set([
      { key: 'Tenant schema', value: signals['schema_exists'] ? 'Present' : 'Missing' },
      { key: 'Foundation tables', value: signals['tables_exist'] ? 'Present' : 'Missing' },
      { key: 'Orphaned departments', value: String(signals['orphaned_departments'] ?? 0) },
      { key: 'Unassigned positions', value: String(signals['unassigned_positions'] ?? 0) },
      { key: 'SoD rules', value: String(rules.length) },
      { key: 'SoD violations', value: String(violations.length) },
    ]);

    this.auditRows.set([
      { key: 'Audit events loaded', value: String(auditEntries.length) },
      { key: 'Audit endpoint', value: '/api/audit-trail?module=foundation' },
      { key: 'Health endpoint', value: '/api/foundation/health' },
      { key: 'Module config endpoint', value: '/api/foundation/module-config' },
    ]);
  }
}