// ============================================
// Shahin GRC — Vendor Portal Component
// External portal for vendor contacts to manage
// compliance, questionnaires, action items,
// documents, and messages.
//
// Route: /vendor-portal (no standard auth guard —
// external users authenticate with scoped JWT)
//
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
// ============================================

import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import {
  VendorPortalService,
  ComplianceStatus,
  Questionnaire,
  ActionItem,
  VendorDocument,
  VendorMessage,
  VendorProfile,
} from '../../services/vendor-portal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components';

type Tab = 'dashboard' | 'questionnaires' | 'action-items' | 'documents' | 'messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-portal',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule],
  template: `
    <div class="vp-shell">
      <!-- Header -->
      <header class="vp-header">
        <div class="vp-header-left">
          <img loading="eager" src="logoiconapphero.png" alt="Shahin GRC" width="36" height="36"
               style="border-radius:8px" />
          <h1>Vendor Portal</h1>
          <span class="vp-vendor-name" *ngIf="profile">{{ profile.name }}</span>
        </div>
        <button class="btn-logout" (click)="logout()">Sign Out</button>
      </header>

      <!-- Tab Navigation -->
      <nav class="vp-tabs" role="tablist">
        <button *ngFor="let t of tabs" class="vp-tab"
                [class.active]="activeTab === t.id"
                (click)="activeTab = t.id"
                [attr.aria-selected]="activeTab === t.id"
                role="tab">
          {{ t.label }}
        </button>
      </nav>

      <!-- Loading -->
      <div *ngIf="loading" class="vp-loading">
        <div class="spinner"></div>
        <p>Loading…</p>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="vp-error">
        <p>{{ error }}</p>
        <button class="btn-secondary" (click)="loadData()">Retry</button>
      </div>

      <!-- ═══ Dashboard Tab ═══ -->
      <section *ngIf="!loading && !error && activeTab === 'dashboard'" class="vp-section">
        <div class="dashboard-grid" *ngIf="compliance">
          <div class="stat-card">
            <span class="stat-label">Compliance Score</span>
            <span class="stat-value" [class]="scoreClass(compliance.overallScore)">
              {{ compliance.overallScore }}%
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Open Questionnaires</span>
            <span class="stat-value">{{ compliance.openQuestionnaires }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Pending Action Items</span>
            <span class="stat-value">{{ compliance.pendingActionItems }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Engagement Score</span>
            <span class="stat-value" [class]="engagementClass(compliance.engagementScore)">
              {{ compliance.engagementScore }}/100
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Risk Tier</span>
            <span class="stat-value tier" [attr.data-tier]="compliance.riskTier">
              {{ compliance.riskTier | titlecase }}
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Framework Coverage</span>
            <span class="stat-value">{{ compliance.frameworkCoverage }}%</span>
          </div>
        </div>
      </section>

      <!-- ═══ Questionnaires Tab ═══ -->
      <section *ngIf="!loading && !error && activeTab === 'questionnaires'" class="vp-section">
        <h2>Questionnaires</h2>

        <!-- Questionnaire detail / response form -->
        <div *ngIf="selectedQuestionnaire" class="q-detail">
          <button class="btn-back" (click)="selectedQuestionnaire = null">&larr; Back to list</button>
          <h3>{{ selectedQuestionnaire.title }}</h3>
          <span class="status-badge" [attr.data-status]="selectedQuestionnaire.status">
            {{ selectedQuestionnaire.status | titlecase }}
          </span>
          <p *ngIf="selectedQuestionnaire.dueDate" class="q-due">
            Due: {{ selectedQuestionnaire.dueDate | appDate:'medium' }}
          </p>

          <div class="q-questions" *ngIf="selectedQuestionnaire.questions?.length">
            <div *ngFor="let q of selectedQuestionnaire.questions; let i = index" class="q-item">
              <label class="q-label">{{ i + 1 }}. {{ q.text || q.question || q.textEn || q }}</label>
              <textarea [(ngModel)]="responseMap[i]" rows="3"
                        placeholder="Enter your response…" aria-label="Enter your response…"
                        [disabled]="selectedQuestionnaire.status === 'completed'"></textarea>
            </div>
          </div>

          <button class="btn-primary" (click)="submitResponses()"
                  [disabled]="submitting || selectedQuestionnaire.status === 'completed'">
            {{ submitting ? 'Submitting…' : 'Submit Responses' }}
          </button>
        </div>

        <!-- Questionnaire list -->
        <div *ngIf="!selectedQuestionnaire">
          <div *ngIf="questionnaires.length === 0" class="empty-state">
            No questionnaires assigned yet.
          </div>
          <table aria-label="Vp Table table" class="vp-table" *ngIf="questionnaires.length > 0">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of questionnaires">
                <td>{{ q.title }}</td>
                <td>
                  <span class="status-badge" [attr.data-status]="q.status">
                    {{ q.status | titlecase }}
                  </span>
                </td>
                <td>{{ q.dueDate ? (q.dueDate | appDate:'medium') : '—' }}</td>
                <td>
                  <button class="btn-link" (click)="openQuestionnaire(q)">
                    {{ q.status === 'completed' ? 'View' : 'Respond' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ═══ Action Items Tab ═══ -->
      <section *ngIf="!loading && !error && activeTab === 'action-items'" class="vp-section">
        <h2>Action Items</h2>
        <div *ngIf="actionItems.length === 0" class="empty-state">
          No action items assigned.
        </div>
        <table aria-label="Action Items table" class="vp-table" *ngIf="actionItems.length > 0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of actionItems">
              <td>{{ item.title }}</td>
              <td>
                <span class="priority-badge" [attr.data-priority]="item.priority">
                  {{ item.priority | titlecase }}
                </span>
              </td>
              <td>{{ item.dueDate ? (item.dueDate | appDate:'medium') : '—' }}</td>
              <td>
                <select [ngModel]="item.status"
                        (ngModelChange)="updateItemStatus(item, $event)"
                        [disabled]="item.status === 'completed'">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </td>
              <td>
                <span *ngIf="updatingItem === item.actionItemId" class="updating">Saving…</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ═══ Documents Tab ═══ -->
      <section *ngIf="!loading && !error && activeTab === 'documents'" class="vp-section">
        <h2>Documents</h2>
        <div class="doc-upload">
          <label class="upload-label">
            <input type="file" (change)="onFileSelected($event)" [disabled]="uploading" />
            {{ uploading ? 'Uploading…' : 'Upload Document' }}
          </label>
        </div>
        <div *ngIf="documents.length === 0" class="empty-state">
          No documents uploaded yet.
        </div>
        <table aria-label="Documents table" class="vp-table" *ngIf="documents.length > 0">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Uploaded</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let doc of documents">
              <td>{{ doc.fileName }}</td>
              <td>{{ doc.fileType }}</td>
              <td>{{ formatSize(doc.fileSize) }}</td>
              <td>{{ doc.createdAt | appDate:'medium' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- ═══ Messages Tab ═══ -->
      <section *ngIf="!loading && !error && activeTab === 'messages'" class="vp-section">
        <h2>Messages</h2>
        <div class="msg-list">
          <div *ngIf="messages.length === 0" class="empty-state">
            No messages yet. Start a conversation below.
          </div>
          <div *ngFor="let msg of messages" class="msg-bubble"
               [class.msg-self]="msg.senderRole === 'vendor_contact'"
               [class.msg-other]="msg.senderRole !== 'vendor_contact'">
            <div class="msg-meta">
              <strong>{{ msg.sender }}</strong>
              <span class="msg-time">{{ msg.createdAt | appDate:'short' }}</span>
            </div>
            <p>{{ msg.content }}</p>
          </div>
        </div>
        <div class="msg-compose">
          <textarea [(ngModel)]="newMessage" rows="2"
                    placeholder="Type a message…" aria-label="Type a message…"
                    (keydown.enter)="sendMsg($event)"></textarea>
          <button class="btn-primary" (click)="sendMsg()" [disabled]="!newMessage.trim() || sending">
            {{ sending ? 'Sending…' : 'Send' }}
          </button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .vp-shell {
      min-height: 100vh;
      background: var(--surface-sunken, #f4f5f7);
      font-family: var(--font-family, 'Inter', sans-serif);
    }
    .vp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 2rem;
      background: var(--surface, #fff);
      border-bottom: 1px solid var(--border, var(--border-subtle));
    }
    .vp-header-left { display: flex; align-items: center; gap: 0.75rem; }
    .vp-header h1 { font-size: 1.25rem; margin: 0; color: var(--text-heading, #1a1a2e); }
    .vp-vendor-name {
      font-size: 0.85rem; color: var(--text-muted, var(--text-muted));
      padding-inline-start: 0.75rem; border-inline-start: 1px solid var(--border, var(--border-subtle));
    }
    .btn-logout {
      padding: 0.5rem 1rem; border: 1px solid var(--border, var(--border-subtle));
      border-radius: var(--radius-md, 8px); background: transparent;
      cursor: pointer; font-size: 0.85rem; color: var(--text-muted, var(--text-muted));
    }
    .btn-logout:hover { background: var(--surface-alt, var(--surface-ice)); }

    /* Tabs */
    .vp-tabs {
      display: flex; gap: 0; padding: 0 2rem;
      background: var(--surface, #fff);
      border-bottom: 1px solid var(--border, var(--border-subtle));
    }
    .vp-tab {
      padding: 0.75rem 1.25rem; border: none; background: none;
      font-size: 0.9rem; cursor: pointer;
      color: var(--text-muted, var(--text-muted));
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .vp-tab.active {
      color: var(--primary, #4f46e5);
      border-bottom-color: var(--primary, #4f46e5);
      font-weight: 600;
    }
    .vp-tab:hover:not(.active) { color: var(--text-heading, #1a1a2e); }

    /* Section */
    .vp-section { padding: 1.5rem 2rem; max-width: 1200px; }
    .vp-section h2 { margin: 0 0 1rem; font-size: 1.1rem; color: var(--text-heading, #1a1a2e); }

    /* Loading / Error */
    .vp-loading, .vp-error { text-align: center; padding: 3rem 2rem; }
    .vp-error p { color: var(--error, var(--error)); margin-bottom: 1rem; }
    .spinner {
      width: 36px; height: 36px; margin: 0 auto 1rem;
      border: 3px solid var(--surface-alt, var(--border-subtle));
      border-top-color: var(--primary, #4f46e5);
      border-radius: var(--radius-pill); animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Dashboard grid */
    .dashboard-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      background: var(--surface, #fff); border-radius: var(--radius-md, 8px);
      padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-label { font-size: 0.8rem; color: var(--text-muted, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.03em; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-heading, #1a1a2e); }
    .stat-value.score-green { color: var(--success, var(--success)); }
    .stat-value.score-yellow { color: var(--warning, #ca8a04); }
    .stat-value.score-red { color: var(--error, var(--error)); }

    /* Table */
    .vp-table { width: 100%; border-collapse: collapse; background: var(--surface, #fff); border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: var(--shadow-sm); }
    .vp-table th { text-align: start; padding: 0.75rem 1rem; font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted, var(--text-muted)); background: var(--surface-alt, #f9fafb); border-bottom: 1px solid var(--border, var(--border-subtle)); }
    .vp-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-light, var(--surface-ice)); font-size: 0.9rem; }

    /* Status badges */
    .status-badge {
      display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-lg);
      font-size: 0.75rem; font-weight: 600; text-transform: uppercase;
    }
    [data-status="completed"] { background: #dcfce7; color: #166534; }
    [data-status="in_progress"], [data-status="distributed"] { background: #dbeafe; color: #1e40af; }
    [data-status="pending"], [data-status="draft"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    [data-status="overdue"] { background: #fee2e2; color: #991b1b; }

    /* Priority badges */
    .priority-badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: var(--radius-lg); font-size: 0.75rem; font-weight: 600; }
    [data-priority="critical"] { background: #fee2e2; color: #991b1b; }
    [data-priority="high"] { background: #ffedd5; color: #9a3412; }
    [data-priority="medium"] { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    [data-priority="low"] { background: var(--status-success-bg, #defbe6); color: #166534; }

    /* Buttons */
    .btn-primary {
      padding: 0.6rem 1.5rem; background: var(--primary, #4f46e5); color: #fff;
      border: none; border-radius: var(--radius-md, 8px); cursor: pointer; font-size: 0.9rem;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
    .btn-secondary {
      padding: 0.5rem 1rem; background: var(--surface-alt, var(--border-subtle));
      color: var(--text-heading, #1a1a2e); border: none;
      border-radius: var(--radius-md, 8px); cursor: pointer; font-size: 0.85rem;
    }
    .btn-link { background: none; border: none; color: var(--primary, #4f46e5); cursor: pointer; font-size: 0.85rem; text-decoration: underline; }
    .btn-back { background: none; border: none; color: var(--text-muted, var(--text-muted)); cursor: pointer; font-size: 0.85rem; margin-bottom: 1rem; }

    .empty-state { text-align: center; padding: 2rem; color: var(--text-muted, var(--text-muted)); }

    /* Questionnaire detail */
    .q-detail { background: var(--surface, #fff); border-radius: var(--radius-md, 8px); padding: 1.5rem; box-shadow: var(--shadow-sm); }
    .q-due { font-size: 0.85rem; color: var(--text-muted, var(--text-muted)); margin: 0.5rem 0 1rem; }
    .q-item { margin-bottom: 1rem; }
    .q-label { display: block; font-weight: 500; margin-bottom: 0.35rem; font-size: 0.9rem; }
    .q-item textarea { width: 100%; box-sizing: border-box; padding: 0.5rem; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-sm, 6px); font-size: 0.9rem; resize: vertical; }

    /* Action items select */
    .vp-table select { padding: 0.35rem 0.5rem; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-sm, 6px); font-size: 0.85rem; }
    .updating { font-size: 0.8rem; color: var(--primary, #4f46e5); }

    /* Documents */
    .doc-upload { margin-bottom: 1rem; }
    .upload-label {
      display: inline-block; padding: 0.6rem 1.25rem;
      background: var(--primary, #4f46e5); color: #fff;
      border-radius: var(--radius-md, 8px); cursor: pointer; font-size: 0.9rem;
    }
    .upload-label input[type="file"] { display: none; }

    /* Messages */
    .msg-list { max-height: 400px; overflow-y: auto; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .msg-bubble { padding: 0.75rem 1rem; border-radius: var(--radius-md, 8px); max-width: 75%; }
    .msg-self { background: var(--primary-light, var(--blue-50, #edf5ff)); align-self: flex-end; }
    .msg-other { background: var(--surface, #fff); border: 1px solid var(--border, var(--border-subtle)); align-self: flex-start; }
    .msg-meta { display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.25rem; }
    .msg-meta strong { font-size: 0.8rem; }
    .msg-time { font-size: 0.7rem; color: var(--text-muted, var(--text-muted)); }
    .msg-bubble p { margin: 0; font-size: 0.9rem; }
    .msg-compose { display: flex; gap: 0.5rem; align-items: flex-end; }
    .msg-compose textarea { flex: 1; padding: 0.5rem; border: 1px solid var(--border, var(--border-subtle)); border-radius: var(--radius-sm, 6px); font-size: 0.9rem; resize: none; }
  `],
})
export class VendorPortalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private svc = inject(VendorPortalService);
  private router = inject(Router);
  private _storage = inject(StorageService);

  // ── State ─────────────────────────────────────────────────────────────────

  tabs: { id: string; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'questionnaires', label: 'Questionnaires' },
    { id: 'action-items', label: 'Action Items' },
    { id: 'documents', label: 'Documents' },
    { id: 'messages', label: 'Messages' },
  ];
  activeTab: Tab = 'dashboard';

  loading = true;
  error = '';

  profile: VendorProfile | null = null;
  compliance: ComplianceStatus | null = null;
  questionnaires: Questionnaire[] = [];
  actionItems: ActionItem[] = [];
  documents: VendorDocument[] = [];
  messages: VendorMessage[] = [];

  // Questionnaire response
  selectedQuestionnaire: Questionnaire | null = null;
  responseMap: Record<number, string> = {};
  submitting = false;

  // Action item update
  updatingItem = '';

  // Document upload
  uploading = false;

  // Messages
  newMessage = '';
  sending = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const vendorId = this.svc.getVendorId();
    if (!vendorId) {
      this.router.navigate(['/invitations/accept']);
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';

    // Load all data in parallel
    this.svc.getComplianceStatus().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (c) => { this.compliance = c; this.checkLoaded(); },
      error: (e) => this.handleLoadError(e),
    });
    this.svc.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => { this.profile = p; },
      error: () => { /* non-critical */ },
    });
    this.svc.getQuestionnaires().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.questionnaires = r.questionnaires || []; },
      error: () => { this.questionnaires = []; },
    });
    this.svc.getActionItems().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.actionItems = r.actionItems || []; },
      error: () => { this.actionItems = []; },
    });
    this.svc.getDocuments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.documents = r.documents || []; },
      error: () => { this.documents = []; },
    });
    this.svc.getMessages().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.messages = r.messages || []; },
      error: () => { this.messages = []; },
    });
  }

  private checkLoaded(): void {
    this.loading = false; this.cdr.markForCheck();
  }

  private handleLoadError(err: unknown): void {
    this.loading = false; this.cdr.markForCheck();
    const status = typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
    const errorBody = typeof err === 'object' && err !== null && 'error' in err ? err.error : undefined;
    const errorMessage = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody ? errorBody.error : undefined;
    if (status === 401 || status === 403) {
      this.error = 'Session expired. Please sign in again.';
    } else {
      this.error = typeof errorMessage === 'string' ? errorMessage : 'Failed to load portal data.';
    }
  }

  // ── Dashboard helpers ─────────────────────────────────────────────────────

  scoreClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }

  engagementClass(score: number): string {
    if (score >= 70) return 'stat-value score-green';
    if (score >= 40) return 'stat-value score-yellow';
    return 'stat-value score-red';
  }

  // ── Questionnaire actions ─────────────────────────────────────────────────

  openQuestionnaire(q: Questionnaire): void {
    this.selectedQuestionnaire = q;
    this.responseMap = {};
    if (Array.isArray(q.responses)) {
      q.responses.forEach((response, i: number) => {
        this.responseMap[i] = typeof response === 'string' ? response : response.answer ?? '';
      });
    }
  }

  submitResponses(): void {
    if (!this.selectedQuestionnaire) return;
    this.submitting = true;
    const questionnaireId = this.selectedQuestionnaire.questionnaireId ?? this.selectedQuestionnaire.id;
    if (!questionnaireId) {
      this.submitting = false;
      return;
    }
    const responses = Object.values(this.responseMap).map((answer) => ({ answer }));
    this.svc.respondToQuestionnaire(questionnaireId, responses).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.submitting = false;
        this.selectedQuestionnaire!.status = 'completed';
        // Refresh questionnaire list
        this.svc.getQuestionnaires().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (r) => { this.questionnaires = r.questionnaires || []; },
        });
      },
      error: () => { this.submitting = false; },
    });
  }

  // ── Action item actions ───────────────────────────────────────────────────

  updateItemStatus(item: ActionItem, newStatus: string): void {
    this.updatingItem = item.actionItemId;
    this.svc.updateActionItem(item.actionItemId, { status: newStatus }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        item.status = updated.status;
        this.updatingItem = '';
      },
      error: () => { this.updatingItem = ''; },
    });
  }

  // ── Document actions ──────────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.svc.uploadDocument({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (doc) => {
        this.documents = [doc, ...this.documents];
        this.uploading = false;
        input.value = '';
      },
      error: () => { this.uploading = false; },
    });
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Message actions ───────────────────────────────────────────────────────

  sendMsg(event?: Event): void {
    if (event) event.preventDefault();
    const content = this.newMessage.trim();
    if (!content) return;

    this.sending = true;
    this.svc.sendMessage(content).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (msg) => {
        this.messages = [...this.messages, msg];
        this.newMessage = '';
        this.sending = false;
      },
      error: () => { this.sending = false; },
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  logout(): void {
    this._storage.remove('scopedJwt');
    this._storage.remove('externalUserId');
    this.router.navigate(['/login']);
  }

}
