// ============================================
// Shahin GRC — Regulator Portal Component
// External portal for regulator inspectors to
// view compliance, evidence, submit inquiries,
// and review audit trails.
//
// Route: /regulator-portal (no standard auth guard —
// external users authenticate with scoped JWT)
//
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
// ============================================

import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StorageService } from '@app/infrastructure';
import {
  RegulatorPortalService,
  Organization,
  ComplianceData,
  Evidence,
  Inquiry,
  AuditEntry,
  Framework,
} from '@app/core/services/portals/regulator-portal.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcFormFieldComponent } from '@app/widgets';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

type Tab = 'organizations' | 'compliance' | 'evidence' | 'inquiries' | 'audit-trail';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-regulator-portal',
    imports: [CommonModule, AppDatePipe, FormsModule, GrcFormFieldComponent],
    templateUrl: './regulator-portal.component.html',
    styleUrls: ['./regulator-portal.component.scss']
})
export class RegulatorPortalComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private svc = inject(RegulatorPortalService);
  private router = inject(Router);
  private _storage = inject(StorageService);

  // ── State ─────────────────────────────────────────────────────────────────

  tabs: { id: Tab; label: string }[] = [
    { id: 'organizations', label: 'Organizations' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'inquiries', label: 'Inquiries' },
    { id: 'audit-trail', label: 'Audit Trail' },
  ];
  activeTab: Tab = 'organizations';

  loading = true;
  error = '';

  organizations: Organization[] = [];
  selectedOrg: Organization | null = null;

  // Compliance
  complianceData: ComplianceData | null = null;

  // Evidence
  evidence: Evidence[] = [];
  evidenceFilter = '';
  evidenceStatusFilter = '';

  // Inquiries
  inquiries: Inquiry[] = [];
  newInquiry = { subject: '', body: '', requestType: 'information_request' };
  submittingInquiry = false;

  // Audit trail
  auditEntries: AuditEntry[] = [];

  // ── Computed ──────────────────────────────────────────────────────────────

  get filteredEvidence(): Evidence[] {
    let items = this.evidence;
    if (this.evidenceFilter.trim()) {
      const q = this.evidenceFilter.toLowerCase();
      items = items.filter(e =>
        e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q),
      );
    }
    if (this.evidenceStatusFilter) {
      items = items.filter(e => e.status === this.evidenceStatusFilter);
    }
    return items;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loading = true;
    this.svc.getRegulatorId().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        if (!result?.regulatorId) {
          this.router.navigate(['/invitations/accept']);
          return;
        }
        this.loadOrganizations();
      },
      error: () => {
        this.router.navigate(['/invitations/accept']);
      },
    });
  }

  loadOrganizations(): void {
    this.loading = true;
    this.error = '';
    this.svc.getAssignedOrganizations().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.organizations = r.organizations || [];
        this.loading = false; this.cdr.markForCheck();
      },
      error: (e) => this.handleLoadError(e),
    });
  }

  private handleLoadError(err: unknown): void {
    this.loading = false; this.cdr.markForCheck();
    const errorRecord = (err && typeof err === 'object' ? (err as GrcRecord) : {}) as GrcRecord;
    const errorBody = errorRecord['error'];
    const errorMessage = errorBody && typeof errorBody === 'object' ? (errorBody as GrcRecord)['error'] : undefined;
    if (errorRecord['status'] === 401 || errorRecord['status'] === 403) {
      this.error = 'Session expired. Please sign in again.';
    } else {
      this.error = typeof errorMessage === 'string' ? errorMessage : 'Failed to load portal data.';
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  selectOrganization(org: Organization): void {
    this.selectedOrg = org;
    this.activeTab = 'compliance';
    this.loadOrgData(org.tenantId);
  }

  switchTab(tab: Tab): void {
    if (tab !== 'organizations' && !this.selectedOrg) {
      // Must select an org first
      this.activeTab = 'organizations';
      return;
    }
    this.activeTab = tab;
    if (this.selectedOrg) {
      this.loadTabData(tab, this.selectedOrg.tenantId);
    }
  }

  backToOrgs(): void {
    this.selectedOrg = null;
    this.activeTab = 'organizations';
    this.complianceData = null;
    this.evidence = [];
    this.inquiries = [];
    this.auditEntries = [];
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private loadOrgData(orgId: string): void {
    this.loading = true;
    this.svc.getOrganizationCompliance(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.complianceData = data;
        this.loading = false; this.cdr.markForCheck();
      },
      error: (e) => this.handleLoadError(e),
    });

    // Pre-load other tabs in background
    this.svc.getOrganizationEvidence(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.evidence = Array.isArray(r.evidence) ? r.evidence : []; },
      error: () => { this.evidence = []; },
    });
    this.svc.getInquiries(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.inquiries = Array.isArray(r) ? r : []; },
      error: () => { this.inquiries = []; },
    });
    this.svc.getAuditTrail(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => { this.auditEntries = Array.isArray(r) ? r : []; },
      error: () => { this.auditEntries = []; },
    });
  }

  private loadTabData(tab: Tab, orgId: string): void {
    switch (tab) {
      case 'compliance':
        if (!this.complianceData) {
          this.loading = true;
          this.svc.getOrganizationCompliance(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => { this.complianceData = data; this.loading = false; this.cdr.markForCheck(); },
            error: (e) => this.handleLoadError(e),
          });
        }
        break;
      case 'evidence':
        if (this.evidence.length === 0) {
          this.svc.getOrganizationEvidence(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (r) => { this.evidence = Array.isArray(r.evidence) ? r.evidence : []; },
          });
        }
        break;
      case 'inquiries':
        this.svc.getInquiries(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (r) => { this.inquiries = Array.isArray(r) ? r : []; },
        });
        break;
      case 'audit-trail':
        this.svc.getAuditTrail(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (r) => { this.auditEntries = Array.isArray(r) ? r : []; },
        });
        break;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  scoreClass(score: number): string {
    if (score >= 70) return 'score-green';
    if (score >= 40) return 'score-yellow';
    return 'score-red';
  }

  // ── Evidence actions ──────────────────────────────────────────────────────

  downloadEvidence(ev: Evidence): void {
    if (!this.selectedOrg) return;
    // Trigger download via the API — the backend returns the file
    this.svc.getEvidenceById(this.selectedOrg.tenantId, ev.evidenceId || ev.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        // In a real implementation, this would trigger a file download
        // For now, the API call itself serves as the download trigger
      },
    });
  }

  // ── Inquiry actions ───────────────────────────────────────────────────────

  submitNewInquiry(): void {
    if (!this.selectedOrg) return;
    if (!this.newInquiry.subject.trim() || !this.newInquiry.body.trim()) return;

    this.submittingInquiry = true;
    this.svc.submitInquiry(this.selectedOrg.tenantId, this.newInquiry).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (inq) => {
        this.inquiries = [inq, ...this.inquiries];
        this.newInquiry = { subject: '', body: '', requestType: 'information_request' };
        this.submittingInquiry = false;
      },
      error: () => { this.submittingInquiry = false; },
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  logout(): void {
    this._storage.remove('scopedJwt');
    this._storage.remove('externalUserId');
    this.router.navigate(['/login']);
  }

}
