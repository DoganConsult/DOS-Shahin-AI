import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe} from '@app/shared/pipes';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AiPanelComponent } from '@app/shared/ai-panel/ai-panel.component';
import { GrcComplianceService } from '@app/grc/services/grc-compliance.service';
import { ButtonModule, DialogModule, DropdownModule, InputModule, NotificationModule, TableModule, TagModule, TooltipModule, UIShellModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-control-testing',
    imports: [
        CommonModule, FormsModule,
        PageShellComponent, StatusBadgeComponent, AiPanelComponent,
        TableModule, TagModule, UIShellModule, ButtonModule, DialogModule,
        InputModule, InputModule, DropdownModule, TooltipModule, NotificationModule, AppDatePipe,
    ],
    providers: [],
    template: `
    <app-page-shell
      icon="flask"
      [title]="i18n.translate('controlTesting.title')"
      [subtitle]="i18n.translate('controlTesting.subtitle')"
      [breadcrumbs]="['Dashboard', 'Control Testing']"
      [loading]="!loaded">

      <cds-notification></cds-notification>

      <div *ngIf="loaded && loadError" class="error-state text-center p-4">
        <i class="" style="font-size:2rem; color:var(--red-500)"></i>
        <p class="mt-2 mb-2">{{ i18n.translate('common.failedToLoad') }}</p>
        <button cdsButton [label]="i18n.translate('common.retry')" icon="" (onClick)="load()" [text]="true" />
      </div>

      <section cdsToolbar styleClass="mb-3" *ngIf="loaded && !loadError">
        <ng-template pTemplate="start">
          <span class="p-input-icon-left">
            <i class=""></i>
            <input type="text" pInputText [(ngModel)]="searchTerm"
                   [placeholder]="i18n.translate('controlTesting.search')" [attr.aria-label]="i18n.translate('controlTesting.search')"
                   (input)="filterItems()" class="search-input" />
          </span>
          <cds-dropdown class="ms-3" [(ngModel)]="effectivenessFilter" [options]="effectivenessFilterOptions"
                      optionLabel="label" optionValue="value" styleClass="filter-dropdown"
                      (onChange)="filterItems()"
                      [placeholder]="i18n.translate('controlTesting.effectiveness')" />
        </ng-template>
        <ng-template pTemplate="end">
          <button cdsButton label="Export" icon="" severity="secondary"
                    [outlined]="true" (onClick)="exportCSV()" />
        </ng-template>
      </section>

      <table cdsTable aria-label="Filtered Items table" [value]="filteredItems" [paginator]="filteredItems.length > 10"
               [rows]="10" styleClass="p-datatable-striped p-datatable-gridlines"
               *ngIf="!loadError && filteredItems.length > 0">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('controlTesting.control') }}</th>
            <th>{{ i18n.translate('controlTesting.code') }}</th>
            <th>{{ i18n.translate('controlTesting.effectiveness') }}</th>
            <th>{{ i18n.translate('controlTesting.lastTest') }}</th>
            <th style="width:100px">{{ i18n.translate('controlTesting.actions') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.title ?? item.control_name ?? item.name }}</strong></td>
            <td>{{ item.control_code ?? item.code ?? '-' }}</td>
            <td><app-status-badge [status]="item.effectiveness ?? 'untested'" /></td>
            <td>{{ item.last_tested_at ? (item.last_tested_at | appDate:'medium') : '-' }}</td>
            <td>
              <div class="action-btns">
                <button aria-label="Test" class="icon-btn test-btn" (click)="openTestDialog(item)" [cdsTooltip]="Test"><i class=""></i></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="99" class="empty-msg">{{ i18n.translate('controlTesting.noData') }}</td></tr>
        </ng-template>
      </table>

      <div *ngIf="loaded && !loadError && filteredItems.length === 0" class="empty-state">
        <i class=" empty-icon"></i>
        <p>{{ i18n.translate('controlTesting.noControls') }}</p>
      </div>

      <cds-modal
        [header]="i18n.translate('controlTesting.executeTest')"
        [(visible)]="showTestDialog" [modal]="true" [style]="{width:'560px'}">
        <div class="dialog-form" *ngIf="testTarget">
          <p class="test-target-label"><strong>{{ testTarget.title ?? testTarget.control_name ?? testTarget.name }}</strong></p>
          <div class="field">
            <label>{{ i18n.translate('controlTesting.testType') }}</label>
            <cds-dropdown [(ngModel)]="testForm.test_type" [options]="testTypeOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('controlTesting.select')" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('controlTesting.testResult') }}</label>
            <cds-dropdown [(ngModel)]="testForm.test_result" [options]="testResultOptions"
                        optionLabel="label" optionValue="value" styleClass="w-full"
                        [placeholder]="i18n.translate('controlTesting.select')" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('controlTesting.testDate') }}</label>
            <input pInputText type="date" [(ngModel)]="testForm.test_date" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18n.translate('controlTesting.notes') }}</label>
            <textarea pInputTextarea [(ngModel)]="testForm.notes" [rows]="3" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <button cdsButton [label]="i18n.translate('controlTesting.cancel')" icon=""
                    severity="secondary" [text]="true" (onClick)="showTestDialog = false" />
          <button cdsButton [label]="i18n.translate('controlTesting.submitTest')" icon=""
                    (onClick)="submitTest()" [disabled]="!testForm.test_type || !testForm.test_result" />
        </ng-template>
      </cds-modal>

    </app-page-shell>
    <app-ai-panel module="control-testing" />
  `,
    styles: [`
    .mb-3 { margin-bottom: var(--space-md); }
    .ms-3 { margin-inline-start: 12px; }
    .search-input { min-width: 220px; }
    .filter-dropdown { min-width: 160px; }
    .p-input-icon-left { position: relative; display: inline-flex; align-items: center; }
    .p-input-icon-left > i { position: absolute; inset-inline-start: 12px; color: var(--text-muted); z-index: var(--z-base); }
    .p-input-icon-left > input { padding-inline-start: 36px; }
    .empty-msg { text-align: center; color: var(--text-muted); padding: var(--space-xl); }
    .empty-state { text-align: center; padding: var(--space-2xl); color: var(--text-muted); }
    .empty-icon { font-size: var(--font-size-6xl); margin-bottom: var(--space-md); display: block; }
    .action-btns { display: flex; gap: 4px; }
    .icon-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 6px; border-radius: var(--radius-sm); transition: all 150ms; font-size: var(--font-size-base); }
    .icon-btn:hover { background: #e0f2fe; color: #0369a1; }
    .icon-btn.test-btn:hover { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .test-target-label { margin: 0 0 8px; font-size: var(--font-size-base); color: var(--text-heading); }
    .dialog-form { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .w-full { width: 100%; }
  `]
})
export class ControlTestingComponent implements OnInit {
  private msg = inject(MessageService);

  items: Record<string, any>[] = [];
  filteredItems: Record<string, any>[] = [];
  loaded = false;
  loadError = false;
  searchTerm = '';
  effectivenessFilter = '';

  // Test dialog
  showTestDialog = false;
  testTarget: Record<string, any> | null = null;
  testForm: Record<string, any> = { test_type: '', test_result: '', notes: '', test_date: '' };

  testTypeOptions = [
    { label: 'Design', value: 'design' },
    { label: 'Operating', value: 'operating' },
    { label: 'Substantive', value: 'substantive' },
  ];

  testResultOptions = [
    { label: 'Effective', value: 'effective' },
    { label: 'Partially Effective', value: 'partially_effective' },
    { label: 'Ineffective', value: 'ineffective' },
  ];

  effectivenessFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Effective', value: 'effective' },
    { label: 'Partially Effective', value: 'partially_effective' },
    { label: 'Ineffective', value: 'ineffective' },
    { label: 'Untested', value: 'untested' },
  ];

  private live = inject(GrcLiveService);
  private destroyRef = inject(DestroyRef);

  constructor(
    public i18n: I18nService,
    private complianceSvc: GrcComplianceService
  ) {}

  ngOnInit(): void {
    this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    this.loadError = false;
    this.complianceSvc.getControls().subscribe({
      next: (res: Record<string, any>) => {
        const controls = res.data?.controls ?? res.controls ?? (Array.isArray(res) ? res : []);
        this.items = Array.isArray(controls) ? controls : [];
        this.filterItems();
        this.loaded = true;
      },
      error: () => { this.loaded = true; this.loadError = true; }
    });
  }

  filterItems(): void {
    let r = this.items;
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      r = r.filter(i =>
        (i.title ?? i.control_name ?? i.name ?? '').toLowerCase().includes(t) ||
        (i.control_code ?? i.code ?? '').toLowerCase().includes(t)
      );
    }
    if (this.effectivenessFilter) {
      r = r.filter(i => (i.effectiveness ?? 'untested') === this.effectivenessFilter);
    }
    this.filteredItems = r;
  }

  openTestDialog(item: Record<string, any>): void {
    this.testTarget = item;
    const today = new Date().toISOString().split('T')[0];
    this.testForm = { test_type: '', test_result: '', notes: '', test_date: today };
    this.showTestDialog = true;
  }

  submitTest(): void {
    if (!this.testTarget || !this.testForm.test_type || !this.testForm.test_result) return;
    const controlId = this.testTarget.control_id ?? this.testTarget.id;
    this.complianceSvc.testControl(controlId, {
      testType: this.testForm.test_type,
      testResult: this.testForm.test_result,
      notes: this.testForm.notes,
      testDate: this.testForm.test_date,
    } as any).subscribe({
      next: () => {
        this.showTestDialog = false;
        this.load();
        this.msg.add({
          severity: 'success',
          summary: this.i18n.translate('controlTesting.success'),
          detail: this.i18n.translate('controlTesting.testRecorded'),
          life: 3000,
        });
      },
      error: () => {
        this.msg.add({
          severity: 'error',
          summary: this.i18n.translate('controlTesting.error'),
          detail: this.i18n.translate('controlTesting.testFailed'),
          life: 4000,
        });
      }
    });
  }

  exportCSV(): void {
    if (!this.filteredItems.length) return;
    const headers = Object.keys(this.filteredItems[0]);
    const csv = [headers.join(','), ...this.filteredItems.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'control-testing.csv'; a.click();
    this.msg.add({ severity: 'success', summary: this.i18n.translate('common.success'), detail: this.i18n.translate('controlTesting.exported') || 'Export downloaded', life: 3000 });
  }
}
