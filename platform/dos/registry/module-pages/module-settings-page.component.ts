import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CheckboxModule, DropdownModule, InputModule, NotificationModule,
  StructuredListModule, TabsModule, TagModule, ToggleModule,
} from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';
import { moduleApi, modulePerms, withScope } from './module-api';

interface AuditEntry {
  id: string;
  ts?: string;
  actor?: string;
  action?: string;
  summary?: string;
}
interface AuditDto { items?: AuditEntry[]; }
interface HealthCheck { name: string; status: 'ok' | 'fail'; }
interface HealthDto { status?: 'up' | 'degraded' | 'down'; checks?: HealthCheck[]; }

@Component({
  selector: 'app-module-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, TabsModule, StructuredListModule, ToggleModule, CheckboxModule,
    InputModule, DropdownModule, TagModule, NotificationModule,
  ],
  template: `
    <h1 class="cds--type-productive-heading-04">{{ moduleCode() }} — Settings</h1>

    <cds-tabs>
      <cds-tab heading="Configuration">
        <cds-notification
          [notificationObj]="{ type: 'info', title: canManage() ? 'Read/Write' : 'Read-only', message: 'Module configuration is platform-projected. Edit via Config Center.' }">
        </cds-notification>
        <cds-structured-list>
          <cds-list-row>
            <cds-list-column>Module code</cds-list-column>
            <cds-list-column>{{ moduleCode() }}</cds-list-column>
          </cds-list-row>
          <cds-list-row>
            <cds-list-column>Status</cds-list-column>
            <cds-list-column>
              <cds-tag [type]="health()?.status === 'up' ? 'green' : 'red'">
                {{ health()?.status || 'unknown' }}
              </cds-tag>
            </cds-list-column>
          </cds-list-row>
        </cds-structured-list>
      </cds-tab>

      <cds-tab heading="Permissions">
        <cds-structured-list>
          <cds-list-row><cds-list-column>Resolved by AccessStore (read-only)</cds-list-column></cds-list-row>
        </cds-structured-list>
      </cds-tab>

      <cds-tab heading="Audit Trail">
        <cds-structured-list>
          <cds-list-row *ngFor="let a of audit()">
            <cds-list-column>{{ a.ts }}</cds-list-column>
            <cds-list-column>{{ a.actor || '—' }}</cds-list-column>
            <cds-list-column><cds-tag type="cool-gray">{{ a.action }}</cds-tag></cds-list-column>
            <cds-list-column>{{ a.summary }}</cds-list-column>
          </cds-list-row>
        </cds-structured-list>
      </cds-tab>

      <cds-tab heading="Service Health">
        <cds-structured-list>
          <cds-list-row *ngFor="let c of health()?.checks || []">
            <cds-list-column>{{ c.name }}</cds-list-column>
            <cds-list-column>
              <cds-tag [type]="c.status === 'ok' ? 'green' : 'red'">{{ c.status }}</cds-tag>
            </cds-list-column>
          </cds-list-row>
        </cds-structured-list>
      </cds-tab>
    </cds-tabs>
  `,
})
export class ModuleSettingsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  readonly moduleCode = signal<string>(this.route.snapshot.data['moduleCode'] || 'unknown');
  readonly audit = signal<AuditEntry[]>([]);
  readonly health = signal<HealthDto | null>(null);
  readonly canManage = (): boolean => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.manage);
  };

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    const api = moduleApi(this.moduleCode());
    if (!api) return;
    const ctx = { tenantId: this.access.tenantId() };
    const [a, h] = await Promise.all([
      firstValueFrom(this.http.get<AuditDto>(withScope(api.audit, ctx), { withCredentials: true })).catch(() => null),
      firstValueFrom(this.http.get<HealthDto>(withScope(api.health, ctx), { withCredentials: true })).catch(() => null),
    ]);
    this.audit.set(a?.items ?? []);
    this.health.set(h);
  }
}
