/**
 * Policy Versions Page — View version history and compare policy changes.
 *
 * Fetches policies with version info from policy-lifecycle API via GrcGovernanceService.
 * Displays policy list with current version number and last-updated date.
 * Implements version history view: chronological list with version, author, change summary.
 * Implements side-by-side diff view for two selected versions: highlight additions, deletions, modifications.
 * Disables comparison when only one version exists with appropriate message.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { DropdownModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { GrcGovernanceService } from '@app/grc/services/grc-governance.service';

/** A policy summary for the list view */
export interface PolicySummary {
  id: string;
  title: string;
  currentVersion: number;
  lastUpdated: string;
  status: string;
  owner: string;
}

/** A single version entry in the history */
export interface PolicyVersion {
  version: number;
  author: string;
  updatedAt: string;
  status: string;
  changeSummary: string;
  content: string;
}

/** A diff line for the side-by-side view */
export interface DiffLine {
  type: 'addition' | 'deletion' | 'modification' | 'unchanged';
  left: string;
  right: string;
  lineNum: number;
}

/**
 * Compute a simple line-based diff between two text contents.
 * Returns an array of DiffLine entries highlighting additions, deletions, and modifications.
 */
export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = (oldContent || '').split('\n');
  const newLines = (newContent || '').split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const left = i < oldLines.length ? oldLines[i] : '';
    const right = i < newLines.length ? newLines[i] : '';

    if (i >= oldLines.length) {
      result.push({ type: 'addition', left: '', right, lineNum: i + 1 });
    } else if (i >= newLines.length) {
      result.push({ type: 'deletion', left, right: '', lineNum: i + 1 });
    } else if (left !== right) {
      result.push({ type: 'modification', left, right, lineNum: i + 1 });
    } else {
      result.push({ type: 'unchanged', left, right, lineNum: i + 1 });
    }
  }
  return result;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-policy-versions',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DropdownModule, TableModule, TagModule,
    ButtonModule, SkeletonModule, DialogModule, CheckboxModule, AppDatePipe,],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <h2>{{ i18n.translate('Policy Versions') }}</h2>
        <p class="text-muted">{{ i18n.translate('View version history for policies and compare changes') }}</p>
      </header>

      <!-- Skeleton Loading -->
      <p-skeleton *ngIf="loadingPolicies" width="100%" height="300px" />

      <!-- Error State -->
      <div *ngIf="!loadingPolicies && error" class="error-state">
        <i class="pi pi-exclamation-triangle"></i>
        <p>{{ error }}</p>
        <p-button [label]="i18n.translate('Retry')" icon="pi pi-refresh" (onClick)="loadPolicies()" [text]="true" />
      </div>

      <!-- Policy List (Req 13.1) -->
      <ng-container *ngIf="!loadingPolicies && !error && !selectedPolicy">
        <div *ngIf="policies.length === 0" class="empty-state">
          <i class="pi pi-file empty-icon"></i>
          <p>{{ i18n.translate('No policies found') }}</p>
        </div>

        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
          *ngIf="policies.length > 0"
          [value]="policies"
          [paginator]="policies.length > 15"
          [rows]="15"
          styleClass="p-datatable-sm p-datatable-striped"
          [scrollable]="true"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>{{ i18n.translate('Policy') }}</th>
              <th>{{ i18n.translate('Current Version') }}</th>
              <th>{{ i18n.translate('Last Updated') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th>{{ i18n.translate('Owner') }}</th>
              <th style="width:140px">{{ i18n.translate('Actions') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td>{{ p.title }}</td>
              <td>v{{ p.currentVersion }}</td>
              <td>{{ p.lastUpdated | appDate:'medium' }}</td>
              <td><p-tag [value]="p.status" [severity]="statusSeverity(p.status)" /></td>
              <td>{{ p.owner || '-' }}</td>
              <td>
                <p-button
                  icon="pi pi-history"
                  [text]="true"
                  size="small"
                  [label]="i18n.translate('History')"
                  (onClick)="selectPolicy(p)"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </ng-container>

      <!-- Version History View (Req 13.2) -->
      <ng-container *ngIf="selectedPolicy && !showDiff">
        <div class="breadcrumb">
          <p-button icon="pi pi-arrow-left" [text]="true" [label]="i18n.translate('Back to Policies')" (onClick)="backToPolicies()" />
          <span class="bc-title">{{ selectedPolicy.title }}</span>
        </div>

        <p-skeleton *ngIf="loadingVersions" width="100%" height="200px" />

        <!-- Single version message (Req 13.4) -->
        <div *ngIf="!loadingVersions && versions.length <= 1" class="info-banner">
          <i class="pi pi-info-circle"></i>
          <span>{{ i18n.translate('This policy has only one version. Comparison is not available until additional versions are created.') }}</span>
        </div>

        <!-- Compare button -->
        <div *ngIf="!loadingVersions && versions.length > 1" class="compare-toolbar">
          <p-button
            [label]="i18n.translate('Compare Selected')"
            icon="pi pi-arrows-h"
            (onClick)="openDiffView()"
            [disabled]="selectedForCompare.length !== 2"
            severity="info"
          />
          <span class="compare-hint" *ngIf="selectedForCompare.length < 2">
            {{ i18n.translate('Select exactly 2 versions to compare') }}
          </span>
        </div>

        <!-- Version History Table -->
        <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table"
          *ngIf="!loadingVersions && versions.length > 0"
          [value]="versions"
          styleClass="p-datatable-sm p-datatable-striped"
          [scrollable]="true"
        >
          <ng-template pTemplate="header">
            <tr>
              <th *ngIf="versions.length > 1" style="width:50px"></th>
              <th>{{ i18n.translate('Version') }}</th>
              <th>{{ i18n.translate('Author') }}</th>
              <th>{{ i18n.translate('Date') }}</th>
              <th>{{ i18n.translate('Status') }}</th>
              <th>{{ i18n.translate('Change Summary') }}</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-v>
            <tr>
              <td *ngIf="versions.length > 1">
                <p-checkbox
                  [binary]="true"
                  [ngModel]="isSelectedForCompare(v.version)"
                  (onChange)="toggleCompareSelection(v.version)"
                />
              </td>
              <td>v{{ v.version }}</td>
              <td>{{ v.author || '-' }}</td>
              <td>{{ v.updatedAt | appDate:'medium' }}</td>
              <td><p-tag [value]="v.status || 'draft'" [severity]="statusSeverity(v.status)" /></td>
              <td>{{ v.changeSummary || i18n.translate('No change summary') }}</td>
            </tr>
          </ng-template>
        </p-table>
      </ng-container>

      <!-- Side-by-Side Diff View (Req 13.3) -->
      <ng-container *ngIf="showDiff">
        <div class="breadcrumb">
          <p-button icon="pi pi-arrow-left" [text]="true" [label]="i18n.translate('Back to History')" (onClick)="closeDiffView()" />
          <span class="bc-title">{{ selectedPolicy?.title }} — {{ i18n.translate('Comparing') }} v{{ diffLeft?.version }} {{ i18n.translate('vs') }} v{{ diffRight?.version }}</span>
        </div>

        <div class="diff-legend">
          <span class="legend-item addition">{{ i18n.translate('Addition') }}</span>
          <span class="legend-item deletion">{{ i18n.translate('Deletion') }}</span>
          <span class="legend-item modification">{{ i18n.translate('Modification') }}</span>
        </div>

        <div class="diff-container">
          <div class="diff-header">
            <div class="diff-col-header">v{{ diffLeft?.version }} ({{ i18n.translate('Older') }})</div>
            <div class="diff-col-header">v{{ diffRight?.version }} ({{ i18n.translate('Newer') }})</div>
          </div>
          <div class="diff-body">
            <div *ngFor="let line of diffLines" class="diff-row" [ngClass]="'diff-' + line.type">
              <span class="line-num">{{ line.lineNum }}</span>
              <div class="diff-left">{{ line.left }}</div>
              <div class="diff-right">{{ line.right }}</div>
            </div>
            <div *ngIf="diffLines.length === 0" class="empty-state">
              <p>{{ i18n.translate('No differences found between these versions') }}</p>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); }
    .text-muted { color: var(--text-muted); margin-top: 4px; }
    .empty-state { text-align: center; padding: 60px 24px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 16px; opacity: 0.3; display: block; }
    .error-state { text-align: center; padding: 48px 24px; color: var(--text-muted); }
    .error-state i { font-size: var(--font-size-6xl); color: var(--error); margin-bottom: 12px; display: block; }
    .breadcrumb { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .bc-title { font-size: var(--font-size-md); font-weight: 600; color: var(--text-heading); }
    .info-banner { display: flex; align-items: center; gap: 10px; padding: 14px 18px; background: var(--surface); border: 1px solid var(--border-subtle); border-radius: var(--radius); margin-bottom: 16px; color: var(--text-muted); font-size: var(--font-size-sm); }
    .info-banner i { color: var(--primary); font-size: var(--font-size-lg); }
    .compare-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .compare-hint { font-size: var(--font-size-sm); color: var(--text-muted); }
    .diff-legend { display: flex; gap: 16px; margin-bottom: 12px; }
    .legend-item { font-size: var(--font-size-sm); padding: 4px 10px; border-radius: var(--radius-xs); }
    .legend-item.addition { background: #dcfce7; color: #166534; }
    .legend-item.deletion { background: #fee2e2; color: #991b1b; }
    .legend-item.modification { background: #fef9c3; color: #854d0e; }
    .diff-container { border: 1px solid var(--border-subtle); border-radius: var(--radius); overflow: hidden; }
    .diff-header { display: grid; grid-template-columns: 1fr 1fr; background: var(--surface); border-bottom: 1px solid var(--border-subtle); }
    .diff-col-header { padding: 10px 16px; font-weight: 600; font-size: var(--font-size-sm); color: var(--text-heading); }
    .diff-col-header:first-child { border-inline-end: 1px solid var(--border-subtle); padding-inline-start: 48px; }
    .diff-body { max-height: 600px; overflow-y: auto; }
    .diff-row { display: grid; grid-template-columns: 32px 1fr 1fr; font-family: monospace; font-size: var(--font-size-sm); line-height: 1.6; border-bottom: 1px solid var(--border-subtle); }
    .diff-row:last-child { border-bottom: none; }
    .line-num { padding: 2px 6px; text-align: end; color: var(--text-muted); background: var(--surface); font-size: var(--font-size-xs); border-inline-end: 1px solid var(--border-subtle); }
    .diff-left, .diff-right { padding: 2px 12px; white-space: pre-wrap; word-break: break-word; min-height: 20px; }
    .diff-left { border-inline-end: 1px solid var(--border-subtle); }
    .diff-addition .diff-left { background: transparent; }
    .diff-addition .diff-right { background: #dcfce7; color: #166534; }
    .diff-deletion .diff-left { background: #fee2e2; color: #991b1b; }
    .diff-deletion .diff-right { background: transparent; }
    .diff-modification .diff-left { background: #fef9c3; color: #854d0e; }
    .diff-modification .diff-right { background: #fef9c3; color: #854d0e; }
    .diff-unchanged .diff-left, .diff-unchanged .diff-right { color: var(--text-body); }
  `]
})
export class PolicyVersionsComponent implements OnInit {
  policies: PolicySummary[] = [];
  versions: PolicyVersion[] = [];
  selectedPolicy: PolicySummary | null = null;
  selectedForCompare: number[] = [];

  loadingPolicies = false;
  loadingVersions = false;
  error = '';

  showDiff = false;
  diffLeft: PolicyVersion | null = null;
  diffRight: PolicyVersion | null = null;
  diffLines: DiffLine[] = [];

  constructor(public i18n: I18nService, private governanceSvc: GrcGovernanceService) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  /** Load all policies with version info (Req 13.1) */
  loadPolicies(): void {
    this.loadingPolicies = true;
    this.error = '';
    this.governanceSvc.getPolicyLifecycleList().subscribe({
      next: (res: Record<string, unknown>) => {
        const raw = Array.isArray(res) ? res : (res.policies || []);
        this.policies = raw.map((p: any) => this.normalizePolicy(p));
        this.loadingPolicies = false;
      },
      error: () => {
        this.governanceSvc.getGovernancePolicies().subscribe({
          next: (res: Record<string, unknown>) => {
            const raw = Array.isArray(res) ? res : (res.policies || []);
            this.policies = raw.map((p: any) => this.normalizePolicy(p));
            this.loadingPolicies = false;
          },
          error: () => {
            this.error = this.i18n.translate('Failed to load policies');
            this.loadingPolicies = false;
          },
        });
      },
    });
  }

  /** Select a policy and load its version history (Req 13.2) */
  selectPolicy(p: PolicySummary): void {
    this.selectedPolicy = p;
    this.selectedForCompare = [];
    this.showDiff = false;
    this.loadVersionHistory(p.id);
  }

  /** Load version history for a policy */
  loadVersionHistory(policyId: string): void {
    this.loadingVersions = true;
    this.governanceSvc.getPolicyVersions(policyId).subscribe({
      next: (res: Record<string, unknown>) => {
        const raw = res.versions || res || [];
        this.versions = (Array.isArray(raw) ? raw : []).map((v: Record<string, unknown>) => this.normalizeVersion(v))
          .sort((a: PolicyVersion, b: PolicyVersion) => a.version - b.version);
        this.loadingVersions = false;
      },
      error: () => {
        // Fallback: construct single version from policy data
        this.versions = [{
          version: this.selectedPolicy?.currentVersion || 1,
          author: this.selectedPolicy?.owner || '-',
          updatedAt: this.selectedPolicy?.lastUpdated || new Date().toISOString(),
          status: this.selectedPolicy?.status || 'draft',
          changeSummary: this.i18n.translate('Initial version'),
          content: '',
        }];
        this.loadingVersions = false;
      },
    });
  }

  /** Navigate back to policy list */
  backToPolicies(): void {
    this.selectedPolicy = null;
    this.versions = [];
    this.selectedForCompare = [];
    this.showDiff = false;
  }

  /** Toggle a version for comparison */
  toggleCompareSelection(version: number): void {
    const idx = this.selectedForCompare.indexOf(version);
    if (idx >= 0) {
      this.selectedForCompare = this.selectedForCompare.filter(v => v !== version);
    } else {
      if (this.selectedForCompare.length >= 2) {
        // Replace the oldest selection
        this.selectedForCompare = [this.selectedForCompare[1], version];
      } else {
        this.selectedForCompare = [...this.selectedForCompare, version];
      }
    }
  }

  /** Check if a version is selected for comparison */
  isSelectedForCompare(version: number): boolean {
    return this.selectedForCompare.includes(version);
  }

  /** Open the side-by-side diff view (Req 13.3) */
  openDiffView(): void {
    if (this.selectedForCompare.length !== 2) return;
    const sorted = [...this.selectedForCompare].sort((a, b) => a - b);
    this.diffLeft = this.versions.find(v => v.version === sorted[0]) || null;
    this.diffRight = this.versions.find(v => v.version === sorted[1]) || null;
    if (this.diffLeft && this.diffRight) {
      this.diffLines = computeDiff(this.diffLeft.content, this.diffRight.content);
      this.showDiff = true;
    }
  }

  /** Close diff view and return to version history */
  closeDiffView(): void {
    this.showDiff = false;
    this.diffLines = [];
    this.diffLeft = null;
    this.diffRight = null;
  }

  /** Map status to PrimeNG severity */
  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'approved': case 'published': return 'success';
      case 'review': return 'warning';
      case 'retired': return 'danger';
      default: return 'info';
    }
  }

  /** Normalize raw policy data into PolicySummary */
  private normalizePolicy(raw: Record<string, unknown>): PolicySummary {
    return {
      id: raw.policy_id || raw.policyId || raw.id || '',
      title: raw.title || raw.name || 'Untitled',
      currentVersion: raw.version || raw.currentVersion || 1,
      lastUpdated: raw.updated_at || raw.updatedAt || raw.lastUpdated || new Date().toISOString(),
      status: raw.status || 'draft',
      owner: raw.owner || raw.ownerId || raw.updated_by || '-',
    };
  }

  /** Normalize raw version data into PolicyVersion */
  private normalizeVersion(raw: Record<string, unknown>): PolicyVersion {
    return {
      version: raw.version || 1,
      author: raw.author || raw.updated_by || raw.owner || '-',
      updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
      status: raw.status || 'draft',
      changeSummary: raw.changes || raw.changeSummary || raw.change_summary || '',
      content: raw.content || '',
    };
  }

}
