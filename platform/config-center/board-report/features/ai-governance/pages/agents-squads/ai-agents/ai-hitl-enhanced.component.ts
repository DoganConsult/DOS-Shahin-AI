import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MessageService } from 'primeng/api';

import { AiGovernanceApiService } from '../../../services/ai-governance-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { GrcRecord } from '@app/core/models/shared.types';
import { StorageService } from '@app/infrastructure';

import { AiHitlReviewQueueComponent, HitlItem, HitlDashboard } from '../../../components/ai-hitl-components/ai-hitl-review-queue.component';
import { AiHitlApprovalDialogComponent } from '../../../components/ai-hitl-components/ai-hitl-approval-dialog.component';
import { AiHitlOverridePanelComponent, SlaConfig } from '../../../components/ai-hitl-components/ai-hitl-override-panel.component';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
    selector: 'app-ai-hitl-enhanced',
    imports: [
        CommonModule,
        AiHitlReviewQueueComponent,
        AiHitlApprovalDialogComponent,
        AiHitlOverridePanelComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="gov-page" [attr.dir]="i18n.direction()">

      <!-- Review Queue (KPIs + filters + table) -->
      <app-ai-hitl-review-queue
        [dashboard]="dashboard()"
        [filteredQueue]="filteredQueue()"
        [queueLoading]="queueLoading()"
        [bulkLoading]="bulkLoading()"
        [stateFilterOptions]="stateFilterOptions"
        [entityTypeOptions]="entityTypeOptions()"
        (filterChanged)="loadQueue()"
        (selectionChanged)="selectedItems = $event"
        (bulkAction)="bulkAction($event)"
        (reviewAction)="openReviewDialog($event.item, $event.decision)"
        (viewDetail)="selectItem($event)">
      </app-ai-hitl-review-queue>

      <!-- Override Panel (detail + SLA config) -->
      <app-ai-hitl-override-panel
        [selectedDetail]="selectedDetail()"
        [reviewLoading]="reviewLoading()"
        [slaConfigs]="slaConfigs()"
        [decisionOptions]="decisionOptions"
        (submitReview)="submitInlineReview($event.decision, $event.notes)"
        (saveSla)="saveSlaConfig($event)">
      </app-ai-hitl-override-panel>

      <!-- Approval Dialog -->
      <app-ai-hitl-approval-dialog
        [visible]="reviewDialogVisible"
        [decision]="dialogDecision"
        [loading]="reviewLoading()"
        (closed)="reviewDialogVisible = false"
        (saved)="submitDialogReview($event)">
      </app-ai-hitl-approval-dialog>

    </div>
  `,
    styles: [`
    .gov-page { display:flex; flex-direction:column; min-height:100%; padding:20px 28px 40px; gap:16px; }
  `]
})
export class AiHitlEnhancedComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
  // ── Injected services ───────────────────────────────────────────────────────
  readonly i18n = inject(I18nService);
  private readonly aiApi = inject(AiGovernanceApiService);
  private readonly live = inject(GrcLiveService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly _storage = inject(StorageService);

  // ── Dashboard KPI state ─────────────────────────────────────────────────────
  readonly dashboard = signal<HitlDashboard>({
    totalAiDrafts: 0, totalPendingReview: 0, totalApproved: 0, totalRejected: 0, totalEscalated: 0,
  });

  // ── Queue state ─────────────────────────────────────────────────────────────
  readonly queue = signal<HitlItem[]>([]);
  readonly queueLoading = signal(false);
  selectedItems: HitlItem[] = [];

  // ── Filters ─────────────────────────────────────────────────────────────────
  stateFilter: string | null = null;
  entityTypeFilter: string | null = null;

  readonly stateFilterOptions = [
    { label: 'AI Draft', value: 'ai_draft' },
    { label: 'Pending Review', value: 'pending_review' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Escalated', value: 'escalated' },
  ];

  readonly entityTypeOptions = computed(() => {
    const types = [...new Set(this.queue().map(i => i.entity_type))];
    return types.map(t => ({ label: t, value: t }));
  });

  readonly filteredQueue = computed(() => {
    let items = this.queue();
    if (this.stateFilter) items = items.filter(i => i.hitl_state === this.stateFilter);
    if (this.entityTypeFilter) items = items.filter(i => i.entity_type === this.entityTypeFilter);
    return items;
  });

  // ── Detail panel ────────────────────────────────────────────────────────────
  readonly selectedDetail = signal<HitlItem | null>(null);

  // ── Review dialog state ─────────────────────────────────────────────────────
  reviewDialogVisible = false;
  dialogDecision = '';
  dialogNotes = '';
  private dialogItem: HitlItem | null = null;

  readonly reviewLoading = signal(false);

  readonly decisionOptions = [
    { label: 'Approve', value: 'approved' },
    { label: 'Reject', value: 'rejected' },
    { label: 'Escalate', value: 'escalated' },
  ];

  // ── Bulk action state ───────────────────────────────────────────────────────
  readonly bulkLoading = signal(false);

  // ── SLA configuration ──────────────────────────────────────────────────────
  readonly slaConfigs = signal<SlaConfig[]>([
    { entity_type: 'risk', warn_hours: 24, breach_hours: 48 },
    { entity_type: 'control', warn_hours: 24, breach_hours: 48 },
    { entity_type: 'policy', warn_hours: 24, breach_hours: 48 },
    { entity_type: 'evidence', warn_hours: 24, breach_hours: 48 },
    { entity_type: 'finding', warn_hours: 24, breach_hours: 48 },
  ]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadDashboard();
    this.loadQueue();
    this.live.change$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => { this.loadDashboard(); this.loadQueue(); });
    this.loadSlaFromStorage();
  }

  // ── Data loading ────────────────────────────────────────────────────────────

  loadDashboard(): void {
    this.apiclientSvc.get('/hitl/dashboard')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.dashboard.set({
            totalAiDrafts: res?.totalAiDrafts ?? res?.total_ai_drafts ?? 0,
            totalPendingReview: res?.totalPendingReview ?? res?.total_pending_review ?? 0,
            totalApproved: res?.totalApproved ?? res?.total_approved ?? 0,
            totalRejected: res?.totalRejected ?? res?.total_rejected ?? 0,
            totalEscalated: res?.totalEscalated ?? res?.total_escalated ?? 0,
          });
        },
        error: (err) => this.showError('ai.hitl.errorLoadDashboard', err),
      });
  }

  loadQueue(): void {
    this.queueLoading.set(true);
    this.apiclientSvc.get('/hitl/queue')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows: HitlItem[] = res?.rows ?? res?.data ?? res ?? [];
          const items = Array.isArray(rows) ? rows : [];
          const now = Date.now();
          const withSla = items.map(item => ({ ...item, sla_status: this.computeSlaStatus(item, now) }));
          this.queue.set(withSla);
          this.queueLoading.set(false);
        },
        error: (err) => { this.queueLoading.set(false); this.showError('ai.hitl.errorLoadQueue', err); },
      });
  }

  // ── SLA computation ─────────────────────────────────────────────────────────

  private computeSlaStatus(item: HitlItem, now: number): 'ok' | 'warn' | 'breach' {
    if (item.hitl_state !== 'pending_review' && item.hitl_state !== 'ai_draft') return 'ok';
    const updatedAt = new Date(item.updated_at).getTime();
    if (isNaN(updatedAt)) return 'ok';
    const hoursElapsed = (now - updatedAt) / (1000 * 60 * 60);
    const cfg = this.slaConfigs().find(c => c.entity_type === item.entity_type);
    const warnHours = cfg?.warn_hours ?? 24;
    const breachHours = cfg?.breach_hours ?? 48;
    if (hoursElapsed >= breachHours) return 'breach';
    if (hoursElapsed >= warnHours) return 'warn';
    return 'ok';
  }

  // ── Item selection ──────────────────────────────────────────────────────────

  selectItem(item: HitlItem): void {
    this.selectedDetail.set(item);
  }

  // ── Review dialog ───────────────────────────────────────────────────────────

  openReviewDialog(item: HitlItem, decision: string): void {
    this.dialogItem = item;
    this.dialogDecision = decision;
    this.dialogNotes = '';
    this.reviewDialogVisible = true;
  }

  submitDialogReview(notes: string): void {
    if (!this.dialogItem) return;
    this.submitReview(this.dialogItem, this.dialogDecision, notes);
  }

  submitInlineReview(decision: string, notes: string): void {
    const item = this.selectedDetail();
    if (!item || !decision) return;
    this.submitReview(item, decision, notes);
  }

  private submitReview(item: HitlItem, decision: string, notes: string): void {
    this.reviewLoading.set(true);
    const toState = decision === 'escalated' ? 'escalated' : decision === 'rejected' ? 'rejected' : 'approved';
    this.apiclientSvc.post(`/hitl/${item.entity_type}/${item.entity_id}/review`, {
      decision, toState, notes: notes || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.reviewLoading.set(false);
          this.reviewDialogVisible = false;
          this.selectedDetail.set(null);
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('ai.hitl.reviewSubmitted') });
          this.loadQueue();
          this.loadDashboard();
        },
        error: (err) => { this.reviewLoading.set(false); this.showError('ai.hitl.errorSubmitReview', err); },
      });
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────

  bulkAction(decision: string): void {
    if (this.selectedItems.length === 0) return;
    this.bulkLoading.set(true);
    const toState = decision === 'rejected' ? 'rejected' : 'approved';
    let completed = 0;
    let errors = 0;
    const total = this.selectedItems.length;

    for (const item of this.selectedItems) {
      this.apiclientSvc.post(`/hitl/${item.entity_type}/${item.entity_id}/review`, { decision, toState })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => { completed++; if (completed + errors >= total) this.onBulkComplete(completed, errors); },
          error: () => { errors++; if (completed + errors >= total) this.onBulkComplete(completed, errors); },
        });
    }
  }

  private onBulkComplete(completed: number, errors: number): void {
    this.bulkLoading.set(false);
    this.selectedItems = [];
    this.messageService.add({
      severity: errors > 0 ? 'warn' : 'success',
      summary: this.i18n.translate('ai.hitl.bulkComplete'),
      detail: `${completed} succeeded, ${errors} failed`,
    });
    this.loadQueue();
    this.loadDashboard();
  }

  // ── SLA configuration persistence ──────────────────────────────────────────

  saveSlaConfig(cfg: SlaConfig): void {
    const configs = this.slaConfigs();
    this._storage.set('hitl_sla_configs', JSON.stringify(configs));
    this.messageService.add({ severity: 'success', summary: this.i18n.translate('ai.hitl.slaConfigSaved'), detail: cfg.entity_type });
    const now = Date.now();
    const updated = this.queue().map(item => ({ ...item, sla_status: this.computeSlaStatus(item, now) }));
    this.queue.set(updated);
  }

  private loadSlaFromStorage(): void {
    try {
      const stored = this._storage.get('hitl_sla_configs');
      if (stored) {
        const parsed: SlaConfig[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) this.slaConfigs.set(parsed);
      }
    } catch { /* Ignore parse errors, use defaults */ }
  }

  // ── Error helper ────────────────────────────────────────────────────────────

  private showError(key: string, err: any): void {
    console.error(`[AiHitlEnhanced] ${key}`, err);
    this.messageService.add({
      severity: 'error',
      summary: this.i18n.translate(key),
      detail: err?.error?.message ?? err?.message ?? '',
    });
  }
}
