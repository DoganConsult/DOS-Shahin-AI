import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ButtonModule, NotificationModule, ProgressIndicatorModule,
  StructuredListModule, TabsModule, TagModule,
} from 'carbon-components-angular';
import { AccessStore } from '@dos/access-store';
import { moduleApi, modulePerms, withScope } from './module-api';

interface WorkflowItem {
  id: string;
  ts?: string;
  state?: 'pending' | 'in-progress' | 'approved' | 'rejected' | string;
  actor?: string;
  summary?: string;
}
interface WorkflowsDto { items?: WorkflowItem[]; }

@Component({
  selector: 'app-module-workflows-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, TabsModule, StructuredListModule, TagModule,
    ProgressIndicatorModule, NotificationModule, ButtonModule,
  ],
  template: `
    <h1 class="cds--type-productive-heading-04">{{ moduleCode() }} — Workflows</h1>

    <cds-tabs>
      <cds-tab heading="Pending">
        <cds-structured-list>
          <cds-list-row *ngFor="let w of pending()">
            <cds-list-column><cds-tag type="magenta">{{ w.state || 'pending' }}</cds-tag></cds-list-column>
            <cds-list-column>{{ w.ts }}</cds-list-column>
            <cds-list-column>{{ w.actor || '—' }}</cds-list-column>
            <cds-list-column>{{ w.summary }}</cds-list-column>
            <cds-list-column>
              <button *ngIf="canApprove()" cdsButton="ghost" size="sm">Approve</button>
              <button *ngIf="canApprove()" cdsButton="danger--ghost" size="sm">Reject</button>
            </cds-list-column>
          </cds-list-row>
        </cds-structured-list>
        <cds-notification *ngIf="pending().length === 0 && !loading()"
          [notificationObj]="{ type: 'info', title: 'No pending tasks', message: '' }">
        </cds-notification>
      </cds-tab>

      <cds-tab heading="In progress">
        <cds-structured-list>
          <cds-list-row *ngFor="let w of inProgress()">
            <cds-list-column><cds-tag type="blue">{{ w.state }}</cds-tag></cds-list-column>
            <cds-list-column>{{ w.ts }}</cds-list-column>
            <cds-list-column>{{ w.summary }}</cds-list-column>
          </cds-list-row>
        </cds-structured-list>
      </cds-tab>

      <cds-tab heading="History">
        <cds-structured-list>
          <cds-list-row *ngFor="let w of history()">
            <cds-list-column>
              <cds-tag [type]="w.state === 'approved' ? 'green' : w.state === 'rejected' ? 'red' : 'gray'">
                {{ w.state }}
              </cds-tag>
            </cds-list-column>
            <cds-list-column>{{ w.ts }}</cds-list-column>
            <cds-list-column>{{ w.actor }}</cds-list-column>
            <cds-list-column>{{ w.summary }}</cds-list-column>
          </cds-list-row>
        </cds-structured-list>
      </cds-tab>
    </cds-tabs>
  `,
})
export class ModuleWorkflowsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly access = inject(AccessStore);

  readonly moduleCode = signal<string>(this.route.snapshot.data['moduleCode'] || 'unknown');
  readonly all = signal<WorkflowItem[]>([]);
  readonly loading = signal(true);
  readonly canApprove = (): boolean => {
    const p = modulePerms(this.moduleCode()); return !!p && this.access.hasPermission(p.approve);
  };

  readonly pending    = () => this.all().filter(w => (w.state || 'pending') === 'pending');
  readonly inProgress = () => this.all().filter(w => w.state === 'in-progress');
  readonly history    = () => this.all().filter(w => w.state === 'approved' || w.state === 'rejected');

  constructor() { void this.load(); }

  private async load(): Promise<void> {
    const api = moduleApi(this.moduleCode());
    if (!api) { this.loading.set(false); return; }
    try {
      const res = await firstValueFrom(
        this.http.get<WorkflowsDto>(withScope(api.workflows, { tenantId: this.access.tenantId() }), { withCredentials: true }),
      );
      this.all.set(res?.items ?? []);
    } finally { this.loading.set(false); }
  }
}
