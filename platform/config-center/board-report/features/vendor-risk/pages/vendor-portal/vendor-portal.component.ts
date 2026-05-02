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
} from '@app/core/services/portals/vendor-portal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type Tab = 'dashboard' | 'questionnaires' | 'action-items' | 'documents' | 'messages';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-portal',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule],
  templateUrl: './vendor-portal.component.html',
  styleUrls: ['./vendor-portal.component.scss'],
})
export class VendorPortalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private svc = inject(VendorPortalService);
  private router = inject(Router);
  private _storage = inject(StorageService);

  // ── State ─────────────────────────────────────────────────────────────────

  tabs: { id: Tab; label: string }[] = [
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
    this.svc.updateActionItem(item.actionItemId, { status: newStatus as any }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
