/**
 * Foundation Module — Page 4: Settings (Module Configuration View)
 *
 * Phase-1 enrollment. Read-only. Carbon ExpandableTile + StructuredList + DataTable.
 * Layout: Breadcrumb → 3 ExpandableTile sections (General/Permissions/Workflow) → Warning Banner.
 * Permission gate: foundation.read (read-only — no settings.write needed to view).
 */
import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit, DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import {
  BreadcrumbModule, TilesModule, TagModule, SkeletonModule,
  NotificationModule, IconModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';

@Component({
  selector: 'app-foundation-module-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    BreadcrumbModule, TilesModule, TagModule, SkeletonModule,
    NotificationModule, IconModule,
  ],
  template: `
    <!-- Breadcrumb -->
    <cds-breadcrumb>
      <cds-breadcrumb-item [href]="'/workspace-home'">{{ i18n.tr('breadcrumb.workspace', 'Workspace') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item [href]="'/foundation'">{{ i18n.tr('foundation.name', 'Foundation') }}</cds-breadcrumb-item>
      <cds-breadcrumb-item>{{ i18n.tr('foundation.settings.title', 'Settings') }}</cds-breadcrumb-item>
    </cds-breadcrumb>

    @if (loading()) {
      <cds-skeleton-text [lines]="5"></cds-skeleton-text>
    } @else {

      <!-- Section 1: General -->
      <cds-expandable-tile class="fs-section">
        <div class="fs-section-header">
          <svg cdsIcon="settings" size="20" class="fs-section-icon"></svg>
          <span class="fs-section-title">{{ i18n.tr('foundation.settings.general', 'General') }}</span>
        </div>
        <section class="cds--structured-list">
          <div class="cds--structured-list-tbody">
            @for (item of generalSettings(); track item.key) {
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fs-key">{{ item.key }}</div>
                <div class="cds--structured-list-td">{{ item.value }}</div>
              </div>
            }
          </div>
        </section>
      </cds-expandable-tile>

      <!-- Section 2: Permissions -->
      <cds-expandable-tile class="fs-section">
        <div class="fs-section-header">
          <svg cdsIcon="security" size="20" class="fs-section-icon"></svg>
          <span class="fs-section-title">{{ i18n.tr('foundation.settings.permissions', 'Permissions') }}</span>
        </div>
        <table class="cds--data-table">
          <thead><tr>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.settings.role', 'Role') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.settings.read', 'Read') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.settings.write', 'Write') }}</th>
            <th class="cds--table-header-label">{{ i18n.tr('foundation.settings.admin', 'Admin') }}</th>
          </tr></thead>
          <tbody>
            @for (perm of permissions(); track perm.role) {
              <tr>
                <td>{{ perm.role }}</td>
                <td><cds-tag [type]="perm.read ? 'green' : 'cool-gray'" size="sm">{{ perm.read ? 'Yes' : 'No' }}</cds-tag></td>
                <td><cds-tag [type]="perm.write ? 'green' : 'cool-gray'" size="sm">{{ perm.write ? 'Yes' : 'No' }}</cds-tag></td>
                <td><cds-tag [type]="perm.admin ? 'green' : 'cool-gray'" size="sm">{{ perm.admin ? 'Yes' : 'No' }}</cds-tag></td>
              </tr>
            }
          </tbody>
        </table>
      </cds-expandable-tile>

      <!-- Section 3: Workflow -->
      <cds-expandable-tile class="fs-section">
        <div class="fs-section-header">
          <svg cdsIcon="flow" size="20" class="fs-section-icon"></svg>
          <span class="fs-section-title">{{ i18n.tr('foundation.settings.workflow', 'Workflow') }}</span>
        </div>
        <section class="cds--structured-list">
          <div class="cds--structured-list-tbody">
            @for (wf of workflowSettings(); track wf.key) {
              <div class="cds--structured-list-row">
                <div class="cds--structured-list-td fs-key">{{ wf.key }}</div>
                <div class="cds--structured-list-td">{{ wf.value }}</div>
              </div>
            }
          </div>
        </section>
      </cds-expandable-tile>

      <!-- Read-only warning banner -->
      <cds-notification
        [notificationObj]="{ type: 'warning', title: i18n.tr('foundation.settings.readOnly', 'Read-only view'), message: i18n.tr('foundation.settings.readOnlyMessage', 'Edit in Phase 3 (write actions).') }"
        [showClose]="false">
      </cds-notification>

    }
  `,
  styles: [`
    :host { display: block; padding: var(--cds-spacing-06); background: var(--cds-background); }
    .fs-section { margin: var(--cds-spacing-04) 0; }
    .fs-section-header { display: flex; align-items: center; gap: var(--cds-spacing-03); }
    .fs-section-icon { fill: var(--cds-interactive); }
    .fs-section-title { font-size: var(--cds-heading-02-font-size); font-weight: 600; }
    .fs-key { font-weight: 600; color: var(--cds-text-secondary); min-width: 180px; }
    .cds--data-table { width: 100%; }
  `],
})
export class FoundationModuleSettingsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(FoundationApiService);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n();

  loading = signal(true);
  generalSettings = signal<{ key: string; value: string }[]>([]);
  permissions = signal<{ role: string; read: boolean; write: boolean; admin: boolean }[]>([]);
  workflowSettings = signal<{ key: string; value: string }[]>([]);

  ngOnInit(): void {
    // Static defaults — will be replaced by API when available
    this.generalSettings.set([
      { key: 'Module', value: 'Foundation' },
      { key: 'Code', value: 'foundation' },
      { key: 'Owner Team', value: 'Platform Engineering' },
      { key: 'Lifecycle', value: 'Active' },
      { key: 'Retention Policy', value: '7 years' },
    ]);
    this.permissions.set([
      { role: 'Admin', read: true, write: true, admin: true },
      { role: 'Manager', read: true, write: true, admin: false },
      { role: 'User', read: true, write: false, admin: false },
      { role: 'Viewer', read: true, write: false, admin: false },
    ]);
    this.workflowSettings.set([
      { key: 'Approval Required', value: 'Yes (for role changes)' },
      { key: 'Auto-provisioning', value: 'Enabled' },
      { key: 'Delegation', value: 'Allowed' },
    ]);
    this.loading.set(false);
  }
}
