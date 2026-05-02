/**
 * Policy Publications & Acknowledgments Page
 *
 * Two-section page for managing publication campaigns and tracking delivery/acknowledgment.
 * Section 1: Publication campaigns table with create, remind, recall actions.
 * Section 2: Delivery tracking per-campaign with user-level status and proof export.
 */
import {
  Component, OnInit, inject, DestroyRef,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { InputTextarea } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { GrcDataTableComponent, GrcFormFieldComponent } from '@app/shared/components';
import { PolicyApiService } from '../../services/policy-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Publication campaign DTO */
export interface PublicationCampaign {
  id: string;
  campaignName: string;
  policyId: string;
  policyTitle: string;
  channel: string;
  audienceCount: number;
  status: string;
  publishedAt: string;
  sent: number;
  viewed: number;
  acknowledged: number;
  completionPct: number;
}

/** Delivery record for a single user within a campaign */
export interface DeliveryRecord {
  id: string;
  userId: string;
  userName: string;
  status: 'pending' | 'delivered' | 'viewed' | 'acknowledged' | 'declined';
  deliveredAt: string | null;
  viewedAt: string | null;
  acknowledgedAt: string | null;
  reminderCount: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-publications',
    imports: [
        CommonModule, FormsModule, GrcDataTableComponent, PageHeaderComponent, GrcFormFieldComponent,
        ButtonModule, TableModule, TagModule, DialogModule, TooltipModule,
        ProgressBarModule, InputTextModule, DropdownModule, CalendarModule,
        InputTextarea, ConfirmDialogModule, ToastModule, MultiSelectModule,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './policy-publications.component.html',
    styleUrls: ['./policy-publications.component.scss']
})
export class PolicyPublicationsComponent implements OnInit {
  private api = inject(PolicyApiService);
  private msgService = inject(MessageService);
  private confirmSvc = inject(ConfirmationService);
  private destroyRef = inject(DestroyRef);
  public i18n = inject(I18nService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly headerActions: PageHeaderAction[] = [
    { id: 'new', labelEn: 'New Publication', labelAr: 'نشر جديد', icon: 'plus', primary: true },
  ];

  // -- State signals --
  loading = signal(true);
  campaigns = signal<PublicationCampaign[]>([]);
  selectedCampaign = signal<PublicationCampaign | null>(null);

  deliveryLoading = signal(false);
  deliveryRecords = signal<DeliveryRecord[]>([]);
  deliveryCompletionPct = computed(() => {
    const records = this.deliveryRecords();
    if (!records.length) return 0;
    const ackCount = records.filter(r => r.status === 'acknowledged').length;
    return Math.round((ackCount / records.length) * 100);
  });

  // -- New Publication dialog --
  showNewDialog = signal(false);
  policies = signal<{ label: string; value: string }[]>([]);

  newForm = {
    policyId: '',
    campaignName: '',
    channel: '',
    audience: [] as string[],
    message: '',
    scheduleDate: null as Date | null,
  };

  readonly channelOptions = [
    { label: 'Portal', value: 'portal' },
    { label: 'Email', value: 'email' },
    { label: 'Teams', value: 'teams' },
    { label: 'LMS', value: 'lms' },
    { label: 'All Channels', value: 'all' },
  ];

  readonly audienceOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'By Role', value: 'role' },
    { label: 'By Business Unit', value: 'bu' },
    { label: 'By Department', value: 'department' },
  ];

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadPolicies();
  }

  onHeaderAction(id: string): void {
    if (id === 'new') this.openNewDialog();
  }

  /** Load all publication campaigns */
  loadCampaigns(): void {
    this.loading.set(true);
    this.api.listPublications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const raw = Array.isArray(res) ? res : ((res['data'] || res['publications'] || []) as Record<string, unknown>[]);
          this.campaigns.set(raw.map((c: Record<string, unknown>) => this.normalizeCampaign(c)));
          this.loading.set(false);
        },
        error: () => {
          this.campaigns.set([]);
          this.loading.set(false);
        },
      });
  }

  loadPolicies(): void {
    this.api.list({ limit: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.policies.set(
            (res.data || []).map((p) => ({ label: p.title, value: p.id }))
          );
        },
        error: () => this.policies.set([]),
      });
  }

  /** Select a campaign to show delivery tracking */
  selectCampaign(campaign: PublicationCampaign): void {
    this.selectedCampaign.set(campaign);
    this.loadDeliveryStatus(campaign.id);
  }

  /** Back to campaigns list */
  clearSelection(): void {
    this.selectedCampaign.set(null);
    this.deliveryRecords.set([]);
  }

  /** Load delivery records for selected campaign */
  loadDeliveryStatus(campaignId: string): void {
    this.deliveryLoading.set(true);
    this.api.getPublicationStatus(campaignId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const raw = Array.isArray(res) ? res : ((res['data'] || res['records'] || []) as Record<string, unknown>[]);
          this.deliveryRecords.set(raw.map((r: Record<string, unknown>) => this.normalizeDelivery(r)));
          this.deliveryLoading.set(false);
        },
        error: () => {
          this.deliveryRecords.set([]);
          this.deliveryLoading.set(false);
        },
      });
  }

  /** Send reminders to overdue users */
  sendReminders(campaignId: string): void {
    this.api.sendPublicationReminders(campaignId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.msgService.add({ severity: 'success', summary: 'Reminders sent', life: 3000 });
          this.loadDeliveryStatus(campaignId);
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to send reminders', life: 4000 });
        },
      });
  }

  /** Recall a publication campaign */
  recallCampaign(campaign: PublicationCampaign): void {
    this.confirmSvc.confirm({
      message: `Are you sure you want to recall the publication "${campaign.campaignName}"?`,
      header: 'Recall Publication',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.recallPublication(campaign.id, { reason: 'Recalled by admin' })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.msgService.add({ severity: 'success', summary: 'Publication recalled', life: 3000 });
              this.loadCampaigns();
              this.clearSelection();
            },
            error: () => {
              this.msgService.add({ severity: 'error', summary: 'Failed to recall publication', life: 4000 });
            },
          });
      },
    });
  }

  /** Export delivery proof as CSV */
  exportProof(): void {
    const records = this.deliveryRecords();
    if (!records.length) return;
    const headers = ['User Name', 'Status', 'Delivered At', 'Viewed At', 'Acknowledged At', 'Reminder Count'];
    const rows = records.map(r => [
      `"${r.userName}"`, r.status, r.deliveredAt || '', r.viewedAt || '', r.acknowledgedAt || '', String(r.reminderCount),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publication-proof-${this.selectedCampaign()?.id || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -- New Publication dialog --
  openNewDialog(): void {
    this.newForm = { policyId: '', campaignName: '', channel: '', audience: [], message: '', scheduleDate: null };
    this.showNewDialog.set(true);
  }

  createPublication(): void {
    if (!this.newForm.policyId || !this.newForm.campaignName || !this.newForm.channel) return;
    const payload = {
      policyId: this.newForm.policyId,
      campaignName: this.newForm.campaignName,
      channel: this.newForm.channel,
      audience: this.newForm.audience,
      message: this.newForm.message,
      scheduleDate: this.newForm.scheduleDate?.toISOString() || null,
    };
    this.api.createPublication(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showNewDialog.set(false);
          this.msgService.add({ severity: 'success', summary: 'Publication created', life: 3000 });
          this.loadCampaigns();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to create publication', life: 4000 });
        },
      });
  }

  /** Map campaign status to PrimeNG tag severity */
  campaignStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'completed': return 'success';
      case 'active': case 'in_progress': return 'info';
      case 'scheduled': return 'warning';
      case 'recalled': case 'failed': return 'danger';
      default: return 'info';
    }
  }

  /** Map delivery status to PrimeNG tag severity */
  deliveryStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'acknowledged': return 'success';
      case 'viewed': return 'info';
      case 'delivered': return 'warning';
      case 'declined': return 'danger';
      default: return 'warning';
    }
  }

  /** Normalize raw API campaign data */
  private normalizeCampaign(raw: Record<string, unknown>): PublicationCampaign {
    return {
      id: (raw['id'] || raw['publication_id'] || '') as string,
      campaignName: (raw['campaignName'] || raw['campaign_name'] || raw['name'] || '') as string,
      policyId: (raw['policyId'] || raw['policy_id'] || '') as string,
      policyTitle: (raw['policyTitle'] || raw['policy_title'] || '') as string,
      channel: (raw['channel'] || 'portal') as string,
      audienceCount: (raw['audienceCount'] || raw['audience_count'] || 0) as number,
      status: (raw['status'] || 'active') as string,
      publishedAt: (raw['publishedAt'] || raw['published_at'] || raw['created_at'] || '') as string,
      sent: (raw['sent'] || raw['sent_count'] || 0) as number,
      viewed: (raw['viewed'] || raw['viewed_count'] || 0) as number,
      acknowledged: (raw['acknowledged'] || raw['acknowledged_count'] || raw['ack_count'] || 0) as number,
      completionPct: (raw['completionPct'] || raw['completion_pct'] || 0) as number,
    };
  }

  private normalizeDelivery(raw: Record<string, unknown>): DeliveryRecord {
    return {
      id: (raw['id'] || raw['delivery_id'] || '') as string,
      userId: (raw['userId'] || raw['user_id'] || '') as string,
      userName: (raw['userName'] || raw['user_name'] || raw['name'] || '') as string,
      status: (raw['status'] || 'pending') as DeliveryRecord['status'],
      deliveredAt: (raw['deliveredAt'] || raw['delivered_at'] || null) as string | null,
      viewedAt: (raw['viewedAt'] || raw['viewed_at'] || null) as string | null,
      acknowledgedAt: (raw['acknowledgedAt'] || raw['acknowledged_at'] || null) as string | null,
      reminderCount: (raw['reminderCount'] || raw['reminder_count'] || 0) as number,
    };
  }
}
