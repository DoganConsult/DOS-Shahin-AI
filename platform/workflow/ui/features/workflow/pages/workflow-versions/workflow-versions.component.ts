/**
 * Workflow Versioning UI Component
 *
 * Displays workflow version history with side-by-side diff view.
 * Users can compare two versions and revert to a previous version
 * with confirmation.
 */
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ApiClientService } from "@app/core/services/api-client.service";

interface GraphVersion {
  version_id: string;
  run_id: string;
  version_number: number;
  graph_snapshot: any;
  change_summary: string | null;
  changed_by: string | null;
  change_type: string;
  created_at: string;
}

interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-versions',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent,
        TableModule, TagModule, ToolbarModule, ButtonModule,
        DialogModule, DropdownModule, ToastModule, InputTextModule,
    ],
    providers: [MessageService],
    template: `
    <app-page-shell
      icon="history"
      [title]="'Workflow Versions'"
      [subtitle]="'Version history and comparison'"
      [breadcrumbs]="['Dashboard', 'Workflows', 'Versions']"
      [loading]="!loaded">

      <p-toast />

      <!-- Workflow ID filter -->
      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <div class="field-inline">
            <label>Workflow ID:</label>
            <input type="text" pInputText [(ngModel)]="workflowId"
                   placeholder="Enter workflow definition ID"
                   aria-label="Workflow ID"
                   class="workflow-id-input" />
            <p-button label="Load Versions" icon="pi pi-search"
                      (onClick)="loadVersions()" [disabled]="!workflowId" />
          </div>
        </ng-template>
        <ng-template pTemplate="end">
          <p-button label="Compare Selected" icon="pi pi-arrows-h"
                    severity="secondary" [outlined]="true"
                    [disabled]="selectedVersions.length !== 2"
                    (onClick)="compareVersions()" />
        </ng-template>
      </p-toolbar>

      <!-- Version List Table -->
      <p-table
        aria-label="Workflow Versions table"
        [value]="versions"
        [(selection)]="selectedVersions"
        [paginator]="versions.length > 10"
        [rows]="10"
        styleClass="p-datatable-striped p-datatable-gridlines"
        dataKey="version_id"
        *ngIf="versions.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:3rem">
              <span class="header-check-label">Sel</span>
            </th>
            <th>Version</th>
            <th>Change Type</th>
            <th>Summary</th>
            <th>Changed By</th>
            <th>Created At</th>
            <th style="width:120px">Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-version>
          <tr>
            <td>
              <p-tableCheckbox [value]="version" />
            </td>
            <td><strong>v{{ version.version_number }}</strong></td>
            <td>
              <p-tag [value]="version.change_type || 'auto'"
                     [severity]="changeTypeSeverity(version.change_type)" />
            </td>
            <td>{{ version.change_summary || '-' }}</td>
            <td>{{ version.changed_by || 'system' }}</td>
            <td>{{ version.created_at | date:'medium' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="View snapshot" class="icon-btn"
                        (click)="viewSnapshot(version)"
                        title="View snapshot">
                  <i class="pi pi-eye"></i>
                </button>
                <button aria-label="Revert to this version" class="icon-btn play"
                        (click)="openRevertDialog(version)"
                        title="Revert">
                  <i class="pi pi-replay"></i>
                </button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7" class="empty-msg">No versions found</td></tr>
        </ng-template>
      </p-table>

      <div *ngIf="loaded && versions.length === 0 && workflowId" class="empty-state">
        <i class="pi pi-inbox empty-icon"></i>
        <p>No versions found for this workflow</p>
      </div>

      <div *ngIf="loaded && !workflowId" class="empty-state">
        <i class="pi pi-search empty-icon"></i>
        <p>Enter a workflow ID to view version history</p>
      </div>

      <!-- Diff View Dialog -->
      <p-dialog
        header="Version Comparison"
        [(visible)]="showDiffDialog"
        [modal]="true"
        [style]="{width:'80vw', maxWidth: '1000px'}">
        <div class="diff-container" *ngIf="diffResult">
          <div class="diff-header">
            <span class="diff-label">v{{ diffVersionA?.version_number }} vs v{{ diffVersionB?.version_number }}</span>
          </div>
          <div class="diff-panels">
            <!-- Left panel: Version A -->
            <div class="diff-panel">
              <h4>v{{ diffVersionA?.version_number }} ({{ diffVersionA?.change_type }})</h4>
              <pre class="json-view">{{ diffVersionA?.graph_snapshot | json }}</pre>
            </div>
            <!-- Right panel: Version B -->
            <div class="diff-panel">
              <h4>v{{ diffVersionB?.version_number }} ({{ diffVersionB?.change_type }})</h4>
              <pre class="json-view">{{ diffVersionB?.graph_snapshot | json }}</pre>
            </div>
          </div>
          <div class="diff-summary">
            <p-tag *ngIf="diffResult.added.length > 0"
                   [value]="diffResult.added.length + ' added'" severity="success" class="diff-tag" />
            <p-tag *ngIf="diffResult.removed.length > 0"
                   [value]="diffResult.removed.length + ' removed'" severity="danger" class="diff-tag" />
            <p-tag *ngIf="diffResult.changed.length > 0"
                   [value]="diffResult.changed.length + ' changed'" severity="warning" class="diff-tag" />
            <p-tag *ngIf="diffResult.added.length === 0 && diffResult.removed.length === 0 && diffResult.changed.length === 0"
                   value="No structural differences" severity="info" class="diff-tag" />
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Close" severity="secondary" [text]="true"
                    (onClick)="showDiffDialog = false" />
        </ng-template>
      </p-dialog>

      <!-- Snapshot View Dialog -->
      <p-dialog
        header="Version Snapshot"
        [(visible)]="showSnapshotDialog"
        [modal]="true"
        [style]="{width:'60vw', maxWidth: '800px'}">
        <div class="snapshot-view" *ngIf="viewingVersion">
          <div class="snapshot-meta">
            <p><strong>Version:</strong> v{{ viewingVersion.version_number }}</p>
            <p><strong>Type:</strong> {{ viewingVersion.change_type }}</p>
            <p><strong>Summary:</strong> {{ viewingVersion.change_summary || '-' }}</p>
            <p><strong>Changed by:</strong> {{ viewingVersion.changed_by || 'system' }}</p>
            <p><strong>Date:</strong> {{ viewingVersion.created_at | date:'medium' }}</p>
          </div>
          <pre class="json-view">{{ viewingVersion.graph_snapshot | json }}</pre>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Close" severity="secondary" [text]="true"
                    (onClick)="showSnapshotDialog = false" />
        </ng-template>
      </p-dialog>

      <!-- Revert Confirmation Dialog -->
      <p-dialog
        header="Confirm Revert"
        [(visible)]="showRevertDialog"
        [modal]="true"
        [style]="{width:'420px'}">
        <p>Are you sure you want to revert to version v{{ revertTarget?.version_number }}?
           This will create a new version with the snapshot from the selected version.</p>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true"
                    (onClick)="showRevertDialog = false" />
          <p-button label="Revert" icon="pi pi-replay"
                    severity="warning" (onClick)="executeRevert()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .field-inline { display: flex; align-items: center; gap: 8px; }
    .field-inline label { font-weight: 600; color: var(--text-1); white-space: nowrap; }
    .workflow-id-input { min-width: 300px; }
    .header-check-label { font-size: var(--font-size-xs); color: var(--text-muted); }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.play:hover { background: #fef3c7; color: #b45309; }
    .diff-container { display: flex; flex-direction: column; gap: 12px; }
    .diff-header { padding: 8px 0; font-weight: 600; }
    .diff-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .diff-panel { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; background: var(--bg-0); overflow: auto; }
    .diff-panel h4 { margin: 0 0 8px; font-size: var(--font-size-sm); color: var(--text-1); }
    .diff-summary { display: flex; gap: 8px; flex-wrap: wrap; padding-top: 8px; }
    .diff-tag { margin-right: 4px; }
    .json-view { font-size: var(--font-size-sm); max-height: 400px; overflow: auto; background: var(--bg-1); padding: 12px; border-radius: var(--radius-sm); white-space: pre-wrap; word-break: break-word; }
    .snapshot-view { display: flex; flex-direction: column; gap: 12px; }
    .snapshot-meta { display: flex; flex-direction: column; gap: 4px; }
    .snapshot-meta p { margin: 0; font-size: var(--font-size-sm); }
  `]
})
export class WorkflowVersionsComponent implements OnInit {
  versions: GraphVersion[] = [];
  selectedVersions: GraphVersion[] = [];
  loaded = false;
  workflowId = '';

  // Diff dialog
  showDiffDialog = false;
  diffResult: DiffResult | null = null;
  diffVersionA: GraphVersion | null = null;
  diffVersionB: GraphVersion | null = null;

  // Snapshot dialog
  showSnapshotDialog = false;
  viewingVersion: GraphVersion | null = null;

  // Revert dialog
  showRevertDialog = false;
  revertTarget: GraphVersion | null = null;

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  constructor(
    public i18n: I18nService,
    private msg: MessageService, private apiclientSvc: ApiClientService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.workflowId) this.loadVersions();
    });

    // Check for query param workflow ID
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['workflowId']) {
        this.workflowId = params['workflowId'];
        this.loadVersions();
      } else {
        this.loaded = true;
      }
    });
  }

  loadVersions(): void {
    if (!this.workflowId) return;
    this.apiclientSvc.get<any>(`/workflows/${this.workflowId}/versions`).subscribe({
      next: (res: Record<string, unknown>) => {
        const data = Array.isArray(res) ? res : (res?.items ?? res?.data ?? []);
        this.versions = data as GraphVersion[];
        this.selectedVersions = [];
        this.loaded = true;
      },
      error: () => {
        this.versions = [];
        this.loaded = true;
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load workflow versions',
          life: 4000,
        });
      },
    });
  }

  changeTypeSeverity(type: string): string {
    switch (type) {
      case 'update': return 'info';
      case 'revert': return 'warning';
      case 'auto': return 'success';
      default: return 'info';
    }
  }

  viewSnapshot(version: GraphVersion): void {
    this.viewingVersion = version;
    this.showSnapshotDialog = true;
  }

  compareVersions(): void {
    if (this.selectedVersions.length !== 2) return;
    const [a, b] = this.selectedVersions.sort(
      (x, y) => x.version_number - y.version_number,
    );
    this.diffVersionA = a;
    this.diffVersionB = b;

    // Compute diff locally from snapshots
    this.diffResult = this.computeLocalDiff(a.graph_snapshot, b.graph_snapshot);
    this.showDiffDialog = true;
  }

  /**
   * Compute a simple structural diff between two graph snapshots.
   * Compares top-level keys and node arrays if present.
   */
  private computeLocalDiff(snapshotA: any, snapshotB: any): DiffResult {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    if (!snapshotA || !snapshotB) return { added, removed, changed };

    // Compare nodes if present
    const nodesA = new Map<string, any>(
      (snapshotA?.nodes || []).map((n: Record<string, unknown>) => [String(n.id || n.step_id || JSON.stringify(n)), n]),
    );
    const nodesB = new Map<string, any>(
      (snapshotB?.nodes || []).map((n: Record<string, unknown>) => [String(n.id || n.step_id || JSON.stringify(n)), n]),
    );

    for (const [id] of nodesB) {
      if (!nodesA.has(id)) {
        added.push(id);
      } else {
        const oldNode = nodesA.get(id);
        const newNode = nodesB.get(id);
        if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
          changed.push(id);
        }
      }
    }
    for (const [id] of nodesA) {
      if (!nodesB.has(id)) removed.push(id);
    }

    // If no nodes, compare top-level keys
    if (nodesA.size === 0 && nodesB.size === 0) {
      const keysA = new Set(Object.keys(snapshotA || {}));
      const keysB = new Set(Object.keys(snapshotB || {}));
      for (const key of keysB) {
        if (!keysA.has(key)) added.push(key);
        else if (JSON.stringify(snapshotA[key]) !== JSON.stringify(snapshotB[key])) changed.push(key);
      }
      for (const key of keysA) {
        if (!keysB.has(key)) removed.push(key);
      }
    }

    return { added, removed, changed };
  }

  openRevertDialog(version: GraphVersion): void {
    this.revertTarget = version;
    this.showRevertDialog = true;
  }

  executeRevert(): void {
    if (!this.revertTarget || !this.workflowId) return;
    this.apiclientSvc.post(
      `/workflows/${this.workflowId}/versions/${this.revertTarget.version_id}/revert`,
      {},
    ).subscribe({
      next: () => {
        this.showRevertDialog = false;
        this.revertTarget = null;
        this.loadVersions();
        this.msg.add({
          severity: 'success',
          summary: 'Reverted',
          detail: 'Workflow reverted successfully',
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to revert workflow version',
          life: 4000,
        });
      },
    });
  }
}
