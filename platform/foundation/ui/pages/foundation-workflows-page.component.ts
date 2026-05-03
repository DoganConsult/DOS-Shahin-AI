import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ButtonModule,
  ModalModule,
  NotificationModule,
  ProgressBarModule,
  StructuredListModule,
  TabsModule,
  TagModule,
} from 'carbon-components-angular';
import { FoundationApiService } from '../services/foundation-api.service';

interface WorkflowRow {
  id: string;
  kind: string;
  state: string;
  actor: string;
  summary: string;
  progress: number;
  source: string;
}

@Component({
  selector: 'app-foundation-workflows-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TabsModule,
    StructuredListModule,
    TagModule,
    ProgressBarModule,
    ButtonModule,
    ModalModule,
    NotificationModule,
  ],
  template: `
    <section class="foundation-page">
      <header class="foundation-page__header">
        <div>
          <p class="foundation-page__eyebrow">Foundation</p>
          <h1 class="foundation-page__title">Workflows</h1>
          <p class="foundation-page__subtitle">
            User onboarding, role assignment approval, delegation approval, access review, org-change approval, and maker-checker tasks.
          </p>
        </div>
        <cds-tag type="magenta">{{ pending().length }} pending</cds-tag>
      </header>

      @if (error()) {
        <cds-notification
          [notificationObj]="{ type: 'warning', title: 'Workflow data is partial', message: error()! }">
        </cds-notification>
      }

      <cds-tabs>
        <cds-tab heading="Pending">
          @if (loading()) {
            <cds-notification [notificationObj]="{ type: 'info', title: 'Loading workflows', message: 'Foundation is collecting workflow queues.' }"></cds-notification>
          } @else if (pending().length === 0) {
            <cds-notification [notificationObj]="{ type: 'info', title: 'No pending workflows', message: 'No approvals are blocked at the moment.' }"></cds-notification>
          } @else {
            <section class="cds--structured-list">
              <div class="cds--structured-list-thead">
                <div class="cds--structured-list-row cds--structured-list-row--header-row">
                  <div class="cds--structured-list-th">Workflow</div>
                  <div class="cds--structured-list-th">State</div>
                  <div class="cds--structured-list-th">Owner</div>
                  <div class="cds--structured-list-th">Progress</div>
                  <div class="cds--structured-list-th">Actions</div>
                </div>
              </div>
              <div class="cds--structured-list-tbody">
                @for (item of pending(); track item.id) {
                  <div class="cds--structured-list-row">
                    <div class="cds--structured-list-td">{{ item.summary }}</div>
                    <div class="cds--structured-list-td"><cds-tag type="magenta">{{ item.state }}</cds-tag></div>
                    <div class="cds--structured-list-td">{{ item.actor }}</div>
                    <div class="cds--structured-list-td foundation-page__progress-cell"><cds-progress-bar [value]="item.progress" [max]="100" size="sm"></cds-progress-bar></div>
                    <div class="cds--structured-list-td"><button cdsButton="ghost" size="sm" (click)="selectedRow.set(item)">View</button></div>
                  </div>
                }
              </div>
            </section>
          }
        </cds-tab>

        <cds-tab heading="In progress">
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (item of inProgress(); track item.id) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td">{{ item.summary }}</div>
                  <div class="cds--structured-list-td"><cds-tag type="blue">{{ item.state }}</cds-tag></div>
                  <div class="cds--structured-list-td">{{ item.source }}</div>
                </div>
              }
              @if (inProgress().length === 0) {
                <div class="cds--structured-list-row"><div class="cds--structured-list-td">No active in-progress tasks.</div></div>
              }
            </div>
          </section>
        </cds-tab>

        <cds-tab heading="History">
          <section class="cds--structured-list">
            <div class="cds--structured-list-tbody">
              @for (item of history(); track item.id) {
                <div class="cds--structured-list-row">
                  <div class="cds--structured-list-td">{{ item.summary }}</div>
                  <div class="cds--structured-list-td"><cds-tag [type]="item.state === 'approved' ? 'green' : 'red'">{{ item.state }}</cds-tag></div>
                  <div class="cds--structured-list-td">{{ item.source }}</div>
                </div>
              }
              @if (history().length === 0) {
                <div class="cds--structured-list-row"><div class="cds--structured-list-td">No historical workflow decisions captured yet.</div></div>
              }
            </div>
          </section>
        </cds-tab>
      </cds-tabs>

      @if (selectedRow()) {
        <cds-modal [open]="true" size="lg" (overlaySelected)="selectedRow.set(null)">
          <cds-modal-header [showCloseButton]="true" (closeSelect)="selectedRow.set(null)">
            <h3 cdsModalHeaderHeading>{{ selectedRow()!.kind }}</h3>
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
    .foundation-page__progress-cell {
      min-width: 12rem;
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
export class FoundationWorkflowsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(FoundationApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<WorkflowRow[]>([]);
  readonly selectedRow = signal<WorkflowRow | null>(null);
  readonly pending = computed(() => this.rows().filter(row => row.state === 'pending'));
  readonly inProgress = computed(() => this.rows().filter(row => row.state === 'in-progress'));
  readonly history = computed(() => this.rows().filter(row => row.state === 'approved' || row.state === 'rejected'));

  constructor() {
    forkJoin({
      invitations: this.api.getInvitations().pipe(catchError(() => of({ invitations: [] }))),
      delegations: this.api.getDelegations().pipe(catchError(() => of({ delegations: [] }))),
      campaigns: this.api.getAccessReviewCampaigns().pipe(catchError(() => of({ campaigns: [] }))),
      audit: this.api.getAuditTrail({ module: 'foundation', limit: 30 }).pipe(catchError(() => of({ entries: [] }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ invitations, delegations, campaigns, audit }) => {
          const auditEntries = Array.isArray(audit?.entries) ? audit.entries : Array.isArray(audit?.rows) ? audit.rows : [];
          const rows: WorkflowRow[] = [
            ...this.mapInvitations(invitations?.invitations ?? []),
            ...this.mapDelegations(delegations?.delegations ?? []),
            ...this.mapCampaigns(campaigns?.campaigns ?? []),
            ...this.mapAudit(auditEntries),
          ];
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(FoundationApiService.formatLoadError(err));
          this.loading.set(false);
        },
      });
  }

  private mapInvitations(items: unknown[]): WorkflowRow[] {
    return items.map((item: any, index) => ({
      id: String(item.id ?? item.invitation_id ?? `invite-${index}`),
      kind: 'User onboarding',
      state: this.normalizeState(item.status ?? item.state ?? 'pending'),
      actor: String(item.email ?? item.invited_by ?? 'HR / Admin'),
      summary: `Onboard ${item.email ?? item.first_name ?? 'user'} into Foundation`,
      progress: 25,
      source: 'Invitations',
    }));
  }

  private mapDelegations(items: unknown[]): WorkflowRow[] {
    return items.map((item: any, index) => ({
      id: String(item.id ?? item.delegation_id ?? `delegation-${index}`),
      kind: 'Delegation approval',
      state: this.normalizeState(item.status ?? item.state ?? 'pending'),
      actor: String(item.delegatee_name ?? item.delegatee ?? item.delegator ?? 'Delegation owner'),
      summary: `Delegation request for ${item.scope ?? item.role ?? 'authority scope'}`,
      progress: 50,
      source: 'Delegations',
    }));
  }

  private mapCampaigns(items: unknown[]): WorkflowRow[] {
    return items.map((item: any, index) => ({
      id: String(item.id ?? item.campaign_id ?? `campaign-${index}`),
      kind: 'Access review',
      state: this.normalizeState(item.status ?? 'in-progress'),
      actor: String(item.owner ?? item.created_by ?? 'Access review owner'),
      summary: String(item.name ?? item.title ?? 'Access review campaign'),
      progress: this.normalizeProgress(item.status),
      source: 'Access review campaigns',
    }));
  }

  private mapAudit(items: unknown[]): WorkflowRow[] {
    return (items as any[])
      .filter(entry => {
        const action = String(entry.action ?? '').toLowerCase();
        return action.includes('approve') || action.includes('role') || action.includes('org') || action.includes('maker');
      })
      .slice(0, 12)
      .map((entry: any, index) => ({
        id: String(entry.id ?? entry.event_id ?? `audit-${index}`),
        kind: 'Approval trail',
        state: this.normalizeState(entry.outcome ?? entry.result ?? 'approved'),
        actor: String(entry.actor_email ?? entry.user_id ?? 'Platform actor'),
        summary: String(entry.action ?? 'Foundation approval'),
        progress: 100,
        source: 'Audit trail',
      }));
  }

  private normalizeState(value: unknown): string {
    const normalized = String(value ?? 'pending').toLowerCase();
    if (normalized.includes('approve') || normalized === 'success') return 'approved';
    if (normalized.includes('reject') || normalized === 'denied' || normalized === 'failure') return 'rejected';
    if (normalized.includes('progress') || normalized.includes('running') || normalized.includes('active')) return 'in-progress';
    return 'pending';
  }

  private normalizeProgress(status: unknown): number {
    const normalized = this.normalizeState(status);
    if (normalized === 'approved' || normalized === 'rejected') return 100;
    if (normalized === 'in-progress') return 60;
    return 20;
  }
}