import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { catchError, of } from 'rxjs';

interface CampaignRow {
  campaign_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  status: string;
  due_date: string;
  total_users: number;
  attested_count: number;
  declined_count: number;
  pending_count: number;
  created_at: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-attestations-page',
    imports: [CommonModule, FormsModule, RouterModule],
    template: `
    <div class="page-container" [dir]="i18n.direction()">
      <div class="page-toolbar">
        <h2>{{ i18n.localize('Attestation Campaigns', '\u062D\u0645\u0644\u0627\u062A \u0627\u0644\u0625\u0642\u0631\u0627\u0631') }}</h2>
        <div class="toolbar-actions">
          <select [(ngModel)]="entityTypeFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.localize('All Entity Types', '\u0643\u0644 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0643\u064A\u0627\u0646\u0627\u062A') }}</option>
            <option value="control">{{ i18n.localize('Controls', '\u0627\u0644\u0636\u0648\u0627\u0628\u0637') }}</option>
            <option value="obligation">{{ i18n.localize('Obligations', '\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A') }}</option>
            <option value="gap">{{ i18n.localize('Gaps', '\u0627\u0644\u0641\u062C\u0648\u0627\u062A') }}</option>
            <option value="framework">{{ i18n.localize('Frameworks', '\u0627\u0644\u0623\u0637\u0631') }}</option>
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.localize('All Statuses', '\u0643\u0644 \u0627\u0644\u062D\u0627\u0644\u0627\u062A') }}</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="submitted">Submitted</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
          <button class="btn btn-primary" (click)="openCreateDialog()">+ {{ i18n.localize('New Campaign', '\u062D\u0645\u0644\u0629 \u062C\u062F\u064A\u062F\u0629') }}</button>
        </div>
      </div>

      <div class="health-strip">
        <div class="stat-card" (click)="statusFilter = ''; applyFilters()">
          <span class="stat-value">{{ allCampaigns().length }}</span>
          <span class="stat-label">{{ i18n.localize('Total', '\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A') }}</span>
        </div>
        <div class="stat-card" (click)="statusFilter = 'draft'; applyFilters()">
          <span class="stat-value">{{ draftCount() }}</span>
          <span class="stat-label">Draft</span>
        </div>
        <div class="stat-card" (click)="statusFilter = 'active'; applyFilters()">
          <span class="stat-value">{{ activeCount() }}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat-card" (click)="statusFilter = 'completed'; applyFilters()">
          <span class="stat-value">{{ completedCount() }}</span>
          <span class="stat-label">{{ i18n.localize('Completed', '\u0645\u0643\u062A\u0645\u0644') }}</span>
        </div>
        <div class="stat-card" (click)="statusFilter = 'expired'; applyFilters()">
          <span class="stat-value">{{ expiredCount() }}</span>
          <span class="stat-label">{{ i18n.localize('Expired', '\u0645\u0646\u062A\u0647\u064A') }}</span>
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); load()">{{ i18n.translate('common.retry') || (i18n.localize('Retry', '\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629')) }}</button>
        </div>
      }
      @if (loading()) {
        <div class="loading-state">{{ i18n.localize('Loading...', '\u062C\u0627\u0631\u064D \u0627\u0644\u062A\u062D\u0645\u064A\u0644...') }}</div>
      } @else if (!loadError() && campaigns().length === 0) {
        <div class="empty-state">{{ i18n.localize('No attestation campaigns found.', '\u0644\u0627 \u062A\u0648\u062C\u062F \u062D\u0645\u0644\u0627\u062A \u0625\u0642\u0631\u0627\u0631.') }}</div>
      } @else if (!loadError()) {
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ i18n.localize('Name', '\u0627\u0644\u0627\u0633\u0645') }}</th>
              <th>{{ i18n.localize('Entity Type', '\u0646\u0648\u0639 \u0627\u0644\u0643\u064A\u0627\u0646') }}</th>
              <th>{{ i18n.localize('Status', '\u0627\u0644\u062D\u0627\u0644\u0629') }}</th>
              <th>{{ i18n.localize('Due Date', '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642') }}</th>
              <th>{{ i18n.localize('Progress', '\u0627\u0644\u062A\u0642\u062F\u0645') }}</th>
              <th>{{ i18n.localize('Actions', '\u0625\u062C\u0631\u0627\u0621\u0627\u062A') }}</th>
            </tr>
          </thead>
          <tbody>
            @for (c of campaigns(); track c.campaign_id) {
              <tr class="clickable-row">
                <td (click)="openDetail(c)">{{ c.name }}</td>
                <td><span class="badge badge-entity">{{ c.entity_type }}</span></td>
                <td><span class="badge" [attr.data-status]="c.status">{{ c.status }}</span></td>
                <td>{{ c.due_date | date:'mediumDate' }}</td>
                <td>{{ c.attested_count }}/{{ c.total_users }} ({{ c.total_users > 0 ? Math.round(c.attested_count / c.total_users * 100) : 0 }}%)</td>
                <td class="action-cell">
                  @if (c.status === 'draft') {
                    <button class="btn-sm btn-activate" (click)="activateCampaign(c)">{{ i18n.localize('Activate', '\u062A\u0641\u0639\u064A\u0644') }}</button>
                  }
                  @if (c.status === 'submitted') {
                    <button class="btn-sm btn-approve" (click)="reviewCampaign(c, 'approve')">{{ i18n.localize('Approve', '\u0627\u0639\u062A\u0645\u0627\u062F') }}</button>
                    <button class="btn-sm btn-reject" (click)="reviewCampaign(c, 'reject')">{{ i18n.localize('Reject', '\u0631\u0641\u0636') }}</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      <!-- Detail Drawer -->
      @if (selectedCampaign()) {
        <div class="detail-overlay" (click)="closeDetail()"></div>
        <aside class="detail-drawer">
          <div class="drawer-header">
            <h3>{{ selectedCampaign()!.name }}</h3>
            <button class="close-btn" (click)="closeDetail()">&times;</button>
          </div>
          <div class="drawer-body">
            <div class="detail-row"><strong>{{ i18n.localize('Entity Type', '\u0646\u0648\u0639') }}:</strong> {{ selectedCampaign()!.entity_type }}</div>
            <div class="detail-row"><strong>{{ i18n.localize('Entity ID', '\u0645\u0639\u0631\u0641') }}:</strong> {{ selectedCampaign()!.entity_id }}</div>
            <div class="detail-row"><strong>{{ i18n.localize('Status', '\u0627\u0644\u062D\u0627\u0644\u0629') }}:</strong> <span class="badge" [attr.data-status]="selectedCampaign()!.status">{{ selectedCampaign()!.status }}</span></div>
            <div class="detail-row"><strong>{{ i18n.localize('Due Date', '\u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642') }}:</strong> {{ selectedCampaign()!.due_date | date:'mediumDate' }}</div>
            <div class="detail-row"><strong>{{ i18n.localize('Attested', '\u0645\u0642\u0631') }}:</strong> {{ selectedCampaign()!.attested_count }}/{{ selectedCampaign()!.total_users }}</div>
            <div class="detail-row"><strong>{{ i18n.localize('Declined', '\u0645\u0631\u0641\u0648\u0636') }}:</strong> {{ selectedCampaign()!.declined_count }}</div>
            <div class="detail-row"><strong>{{ i18n.localize('Pending', '\u0645\u0639\u0644\u0642') }}:</strong> {{ selectedCampaign()!.pending_count }}</div>
            <div class="drawer-actions">
              @if (selectedCampaign()!.status === 'draft') {
                <button class="btn btn-primary" (click)="activateCampaign(selectedCampaign()!)">{{ i18n.localize('Activate Campaign', '\u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0645\u0644\u0629') }}</button>
              }
              @if (selectedCampaign()!.status === 'submitted') {
                <button class="btn btn-primary" (click)="reviewCampaign(selectedCampaign()!, 'approve')">{{ i18n.localize('Approve', '\u0627\u0639\u062A\u0645\u0627\u062F') }}</button>
                <button class="btn btn-danger" (click)="reviewCampaign(selectedCampaign()!, 'reject')">{{ i18n.localize('Reject', '\u0631\u0641\u0636') }}</button>
              }
              @if (['active', 'in_progress'].includes(selectedCampaign()!.status)) {
                <button class="btn btn-secondary" (click)="submitAttestation(selectedCampaign()!)">{{ i18n.localize('Submit My Attestation', '\u062A\u0642\u062F\u064A\u0645 \u0625\u0642\u0631\u0627\u0631\u064A') }}</button>
              }
            </div>
          </div>
        </aside>
      }

      <!-- Create Campaign Dialog -->
      @if (showCreateDialog) {
        <div class="detail-overlay" (click)="showCreateDialog = false"></div>
        <div class="dialog-container">
          <div class="dialog-header">
            <h3>{{ i18n.localize('Create Attestation Campaign', '\u0625\u0646\u0634\u0627\u0621 \u062D\u0645\u0644\u0629 \u0625\u0642\u0631\u0627\u0631') }}</h3>
            <button class="close-btn" (click)="showCreateDialog = false">&times;</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>{{ i18n.localize('Campaign Name', '\u0627\u0633\u0645 \u0627\u0644\u062D\u0645\u0644\u0629') }}</label>
              <input type="text" [(ngModel)]="createForm.name" class="form-input" />
            </div>
            <div class="form-group">
              <label>{{ i18n.localize('Entity Type', '\u0646\u0648\u0639 \u0627\u0644\u0643\u064A\u0627\u0646') }}</label>
              <select [(ngModel)]="createForm.entityType" class="form-input">
                <option value="control">{{ i18n.localize('Control', '\u0636\u0627\u0628\u0637') }}</option>
                <option value="obligation">{{ i18n.localize('Obligation', '\u0627\u0644\u062A\u0632\u0627\u0645') }}</option>
                <option value="gap">{{ i18n.localize('Gap', '\u0641\u062C\u0648\u0629') }}</option>
                <option value="framework">{{ i18n.localize('Framework', '\u0625\u0637\u0627\u0631') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.localize('Entity ID', '\u0645\u0639\u0631\u0641 \u0627\u0644\u0643\u064A\u0627\u0646') }}</label>
              <input type="text" [(ngModel)]="createForm.entityId" class="form-input" />
            </div>
            <div class="form-group">
              <label>{{ i18n.localize('Due Date', '\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642') }}</label>
              <input type="date" [(ngModel)]="createForm.dueDate" class="form-input" />
            </div>
            <div class="form-group">
              <label>{{ i18n.localize('User IDs (comma-separated)', '\u0645\u0639\u0631\u0641\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646') }}</label>
              <input type="text" [(ngModel)]="createForm.userIdsRaw" class="form-input" placeholder="user-id-1, user-id-2" />
            </div>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" (click)="showCreateDialog = false">{{ i18n.localize('Cancel', '\u0625\u0644\u063A\u0627\u0621') }}</button>
            <button class="btn btn-primary" (click)="createCampaign()" [disabled]="!createForm.name || !createForm.entityId || !createForm.dueDate">{{ i18n.localize('Create', '\u0625\u0646\u0634\u0627\u0621') }}</button>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .page-container { padding: 1.5rem; }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }
    .page-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
    .page-toolbar h2 { margin: 0; font-size: var(--font-size-xl); font-weight: 600; }
    .toolbar-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .toolbar-actions select { padding: 0.4rem 0.75rem; border: 1px solid #d1d5db; border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-tag); cursor: pointer; font-weight: 500; }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .btn-sm { padding: 0.25rem 0.5rem; border: none; border-radius: var(--radius-xs); font-size: var(--font-size-sm); cursor: pointer; font-weight: 500; }
    .btn-activate { background: #dbeafe; color: #1d4ed8; }
    .btn-approve { background: #d1fae5; color: #065f46; }
    .btn-reject { background: #fee2e2; color: #991b1b; }
    .action-cell { display: flex; gap: 0.25rem; }
    .health-strip { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
    .stat-card { flex: 1; padding: 0.75rem 1rem; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: var(--radius); text-align: center; cursor: pointer; transition: box-shadow 0.2s; }
    .stat-card:hover { box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.08); }
    .stat-value { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: #111827; }
    .stat-label { font-size: var(--font-size-sm); color: #6b7280; text-transform: uppercase; }
    .data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-base); }
    .data-table th { text-align: left; padding: 0.625rem 0.75rem; border-bottom: 2px solid #e5e7eb; font-weight: 600; color: #374151; }
    .data-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid #f3f4f6; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: #f9fafb; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: var(--radius-xs); font-size: var(--font-size-sm); font-weight: 500; background: #e5e7eb; color: #374151; }
    .badge[data-status="draft"] { background: #f3f4f6; color: #6b7280; }
    .badge[data-status="active"] { background: #dbeafe; color: #1d4ed8; }
    .badge[data-status="in_progress"] { background: #fef3c7; color: #92400e; }
    .badge[data-status="submitted"] { background: #e0e7ff; color: #4338ca; }
    .badge[data-status="completed"] { background: #d1fae5; color: #065f46; }
    .badge[data-status="expired"] { background: #fee2e2; color: #991b1b; }
    .badge-entity { background: #ede9fe; color: #6d28d9; }
    .loading-state, .empty-state { text-align: center; padding: 3rem; color: #6b7280; }
    .detail-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(var(--color-black-rgb), 0.3); z-index: calc(var(--z-modal) - 2); }
    .detail-drawer { position: fixed; top: 0; right: 0; width: 420px; height: 100vh; background: #fff; box-shadow: -4px 0 16px rgba(var(--color-black-rgb), 0.1); z-index: calc(var(--z-modal) - 1); display: flex; flex-direction: column; }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .close-btn { background: none; border: none; font-size: var(--font-size-xl); cursor: pointer; color: #6b7280; }
    .drawer-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
    .detail-row { margin-bottom: 0.75rem; font-size: var(--font-size-base); }
    .detail-row strong { color: #374151; }
    .drawer-actions { margin-top: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .dialog-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; background: #fff; border-radius: var(--radius-lg); box-shadow: 0 8px 32px rgba(var(--color-black-rgb), 0.15); z-index: calc(var(--z-modal) - 1); }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
    .dialog-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .dialog-body { padding: 1.25rem; }
    .dialog-footer { padding: 0.75rem 1.25rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 0.5rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: var(--font-size-caption); font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
    .form-input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: var(--radius-sm); font-size: var(--font-size-base); box-sizing: border-box; }
  `]
})
export class ComplianceAttestationsPageComponent implements OnInit {
  readonly Math = Math;
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  allCampaigns = signal<CampaignRow[]>([]);
  campaigns = signal<CampaignRow[]>([]);
  selectedCampaign = signal<CampaignRow | null>(null);
  showCreateDialog = false;

  entityTypeFilter = '';
  statusFilter = '';

  createForm = { name: '', entityType: 'control', entityId: '', dueDate: '', userIdsRaw: '' };

  draftCount = computed(() => this.allCampaigns().filter(c => c.status === 'draft').length);
  activeCount = computed(() => this.allCampaigns().filter(c => ['active', 'in_progress'].includes(c.status)).length);
  completedCount = computed(() => this.allCampaigns().filter(c => c.status === 'completed').length);
  expiredCount = computed(() => this.allCampaigns().filter(c => c.status === 'expired').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.api.getAttestationCampaigns().pipe(
      catchError(() => {
        this.loadError.set(this.i18n.translate('common.failedToLoad') || 'Failed to load');
        return of({ data: [] });
      })
    ).subscribe(res => {
      const data = Array.isArray((res as any)?.data) ? (res as any).data : [];
      this.allCampaigns.set(data);
      this.applyFilters();
      this.loading.set(false);
    });
  }

  applyFilters(): void {
    let list = this.allCampaigns();
    if (this.entityTypeFilter) list = list.filter(c => c.entity_type === this.entityTypeFilter);
    if (this.statusFilter) list = list.filter(c => c.status === this.statusFilter);
    this.campaigns.set(list);
  }

  openDetail(c: CampaignRow): void {
    this.selectedCampaign.set(c);
  }

  closeDetail(): void {
    this.selectedCampaign.set(null);
  }

  openCreateDialog(): void {
    this.createForm = { name: '', entityType: 'control', entityId: '', dueDate: '', userIdsRaw: '' };
    this.showCreateDialog = true;
  }

  createCampaign(): void {
    const userIds = this.createForm.userIdsRaw.split(',').map(s => s.trim()).filter(Boolean);
    this.api.createAttestationCampaign({
      entityType: this.createForm.entityType,
      entityId: this.createForm.entityId,
      name: this.createForm.name,
      dueDate: this.createForm.dueDate,
      userIds,
    }).subscribe({
      next: () => { this.showCreateDialog = false; this.load(); },
      error: () => { /* handle error */ },
    });
  }

  activateCampaign(c: CampaignRow): void {
    this.api.activateAttestationCampaign(c.campaign_id).subscribe({ next: () => this.load() });
  }

  reviewCampaign(c: CampaignRow, decision: 'approve' | 'reject'): void {
    this.api.reviewAttestation(c.campaign_id, decision).subscribe({ next: () => { this.closeDetail(); this.load(); } });
  }

  submitAttestation(c: CampaignRow): void {
    this.api.submitAttestationResponse(c.campaign_id, { action: 'attest' }).subscribe({ next: () => { this.closeDetail(); this.load(); } });
  }
}
