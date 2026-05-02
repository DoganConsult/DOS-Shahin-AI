import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { Framework } from '@app/core/models/grc.models';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, ProgressIndicatorModule, TagModule, TilesModule, TooltipModule, UIShellModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-frameworks',
    imports: [
        CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
        TilesModule, ProgressIndicatorModule, TagModule, UIShellModule, ButtonModule,
        DialogModule, InputModule, InputModule, DropdownModule, TooltipModule, NotificationModule,
        AiPanelComponent,
    ],
    providers: [],
    template: `
    <app-page-shell
      icon="sitemap"
      [title]="i18n.translate('framework.title')"
      [subtitle]="i18n.translate('framework.subtitle')"
      [breadcrumbs]="['Dashboard', 'Frameworks']"
      [loading]="!loaded">

      <cds-notification></cds-notification>

      <section cdsToolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <button cdsButton [label]="i18n.translate('common.create')" icon="" (onClick)="openCreate()" />
        </ng-template>
        <ng-template pTemplate="end">
          <button cdsButton label="Export CSV" icon="" severity="secondary" [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </section>

      <div class="fw-grid" *ngIf="frameworks.length > 0">
        <cds-tile *ngFor="let fw of frameworks" styleClass="fw-card">
          <div class="fw-inner">
            <div class="fw-top">
              <h3>{{ fw.name }}</h3>
              <div class="fw-top-actions">
                <app-status-badge [status]="fw.status" />
                <button aria-label="Edit" class="icon-btn" (click)="openEdit(fw)" [cdsTooltip]="Edit"><i class=""></i></button>
                <button aria-label="Delete" class="icon-btn danger" (click)="confirmDel(fw)" [cdsTooltip]="Delete"><i class=""></i></button>
              </div>
            </div>
            <p class="fw-desc">{{ fw.description }}</p>
            <div class="fw-progress">
              <cds-progress-bar [value]="fw.completionPercent" [showValue]="true" styleClass="fw-bar" />
            </div>
            <div class="fw-meta">
              <span><i class=""></i> {{ fw.implementedControls }}/{{ fw.totalControls }} {{ i18n.translate('nav.controls') }}</span>
              <cds-tag [value]="fw.category" severity="info" />
            </div>
          </div>
        </cds-tile>
      </div>

      <div *ngIf="loaded && frameworks.length === 0" class="empty-state">
        <i class=" empty-icon"></i>
        <p>{{ i18n.translate('common.noData') }}</p>
      </div>

      <!-- Create/Edit Dialog -->
      <cds-modal [header]="editMode ? 'Edit Framework' : 'New Framework'" [(visible)]="showDialog" [modal]="true" [style]="{width:'520px'}">
        <div class="dialog-form">
          <div class="field"><label>{{ i18n.translate('common.name') }}</label><input pInputText [(ngModel)]="form.name" class="w-full" /></div>
          <div class="field"><label>{{ i18n.translate('common.description') }}</label><textarea pInputTextarea [(ngModel)]="form.description" [rows]="3" class="w-full"></textarea></div>
          <div class="field-row">
            <div class="field"><label>Category</label>
              <cds-dropdown [(ngModel)]="form.category" [options]="catOpts" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
            <div class="field"><label>{{ i18n.translate('common.status') }}</label>
              <cds-dropdown [(ngModel)]="form.status" [options]="statusOpts" optionLabel="label" optionValue="value" styleClass="w-full" /></div>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDialog=false" />
          <button cdsButton [label]="i18n.translate('common.save')" icon="" (onClick)="save()" [disabled]="!form.name" />
        </ng-template>
      </cds-modal>

      <cds-modal header="Confirm Delete" [(visible)]="showDelDialog" [modal]="true" [style]="{width:'400px'}">
        <p>{{ i18n.translate('framework.confirmDelete') }}</p>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('common.cancel')" severity="secondary" [text]="true" (onClick)="showDelDialog=false" />
          <button cdsButton label="Delete" icon="" severity="danger" (onClick)="doDelete()" />
        </ng-template>
      </cds-modal>
    </app-page-shell>
    <app-ai-panel module="frameworks" />
  `,
    styles: [`
    .fw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
    .fw-inner { display: flex; flex-direction: column; gap: 8px; }
    .fw-top { display: flex; justify-content: space-between; align-items: center; }
    .fw-top h3 { font-size: var(--font-size-md); margin: 0; font-weight: 700; }
    .fw-top-actions { display: flex; align-items: center; gap: 6px; }
    .fw-desc { font-size: var(--font-size-sm); color: var(--text-muted); margin: 0; }
    .fw-progress { margin: 4px 0; }
    .fw-meta { display: flex; gap: 16px; align-items: center; font-size: var(--font-size-sm); color: var(--text-muted); }
    .fw-meta i { margin-inline-end: 4px; }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: 16px; display: block; }
    .mb-3 { margin-bottom: 16px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: var(--radius-sm); transition: all 150ms; }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.danger:hover { background: var(--status-danger-bg, #fff1f1); color: var(--error); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
  `]
})
export class FrameworksComponent implements OnInit {
  private messageService = inject(MessageService);

  frameworks: Framework[] = [];
  loaded = false;
  showDialog = false;
  showDelDialog = false;
  editMode = false;
  editId: string | null = null;
  delTarget: Framework | null = null;
  form: Record<string, any> = { name: '', description: '', category: 'security', status: 'not_started' };

  catOpts = [
    { label: 'Security', value: 'security' },
    { label: 'Privacy', value: 'privacy' },
    { label: 'Governance', value: 'governance' },
    { label: 'Compliance', value: 'compliance' },
    { label: 'Risk', value: 'risk' },
  ];
  statusOpts = [
    { label: 'Not Started', value: 'not_started' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Implemented', value: 'implemented' },
    { label: 'Certified', value: 'certified' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(public i18n: I18nService, private complianceSvc: GrcComplianceService) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.complianceSvc.getFrameworks().subscribe({
      next: f => { this.frameworks = f; this.loaded = true; },
      error: () => {
        this.loaded = true;
        this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToLoadFrameworks'), life: 4000 });
      }
    });
  }

  openCreate(): void {
    this.editMode = false; this.editId = null;
    this.form = { name: '', description: '', category: 'security', status: 'not_started' };
    this.showDialog = true;
  }

  openEdit(fw: Framework): void {
    this.editMode = true; this.editId = fw.frameworkId;
    this.form = { name: fw.name, description: fw.description, category: fw.category, status: fw.status };
    this.showDialog = true;
  }

  save(): void {
    if (!this.form.name) return;
    if (this.editMode && this.editId) {
      this.complianceSvc.updateFramework(this.editId, this.form).subscribe({
        next: () => { this.showDialog = false; this.load(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.frameworkUpdated'), life: 3000 }); },
        error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToUpdateFramework'), life: 4000 })
      });
    } else {
      this.complianceSvc.createFramework(this.form as any).subscribe({
        next: () => { this.showDialog = false; this.load(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.frameworkCreated'), life: 3000 }); },
        error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToCreateFramework'), life: 4000 })
      });
    }
  }

  confirmDel(fw: Framework): void { this.delTarget = fw; this.showDelDialog = true; }

  doDelete(): void {
    if (!this.delTarget) return;
    this.complianceSvc.deleteFramework(this.delTarget.frameworkId).subscribe({
      next: () => { this.showDelDialog = false; this.delTarget = null; this.load(); this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('common.frameworkDeleted'), life: 3000 }); },
      error: () => this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.failedToDeleteFramework'), life: 4000 })
    });
  }

  exportCSV(): void {
    const rows = this.frameworks.map(f => ({
      Name: f.name, Description: f.description, Category: f.category,
      Status: f.status, 'Total Controls': f.totalControls,
      'Implemented Controls': f.implementedControls, 'Completion %': f.completionPercent,
    }));
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String((r as GrcRecord)[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'frameworks-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

}
