import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { SessionService } from '@app/dauth/session/session.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-validation',
    imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule,
        InputTextarea, DropdownModule, CheckboxModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="check-circle"
      [title]="i18nSvc.translate('audit.validationRetest')"
      [subtitle]="i18nSvc.translate('audit.closureReviewsClosereopenFindings')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <p-dropdown [options]="outcomeOptions" [(ngModel)]="outcomeFilter" [placeholder]="i18nSvc.translate('audit.outcome')"
            [showClear]="true" (onChange)="applyFilter()" />
        </ng-template>
        <ng-template pTemplate="end">
          <p-button [label]="i18nSvc.translate('audit.newReview')" icon="pi pi-plus" (onClick)="openDialog()"
            [disabled]="!canManage" />
        </ng-template>
      </p-toolbar>

      <p-table aria-label="Data table" [value]="filtered()" [paginator]="true" [rows]="15" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18nSvc.translate('audit.finding') }}</th>
            <th>{{ i18nSvc.translate('audit.severity') }}</th>
            <th>{{ i18nSvc.translate('audit.outcome') }}</th>
            <th>{{ i18nSvc.translate('audit.effective') }}</th>
            <th pSortableColumn="review_date">{{ i18nSvc.translate('audit.reviewDate') }} <p-sortIcon field="review_date" /></th>
            <th>{{ i18nSvc.translate('audit.comments') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <a class="finding-link" (click)="navigateToFinding(r.finding_id)">
                {{ r.finding_title || r.finding_id?.slice(0, 8) }}
              </a>
            </td>
            <td><app-status-badge [status]="r.finding_severity" /></td>
            <td><app-status-badge [status]="r.outcome" /></td>
            <td>
              <i [class]="r.verified_effective ? 'pi pi-check-circle' : 'pi pi-times-circle'"
                 [style.color]="r.verified_effective ? 'var(--success)' : 'var(--error)'" style="font-size: var(--font-size-lg)"></i>
            </td>
            <td>{{ r.review_date | appDate:'medium' }}</td>
            <td>{{ r.comments || '—' }}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18nSvc.translate('audit.noClosureReviewsYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Cross-Module Links -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="navigateTo('/audit/findings')"><i class="pi pi-search"></i> {{ i18nSvc.translate('audit.allFindings') || 'All Findings' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/capa')"><i class="pi pi-wrench"></i> {{ i18nSvc.translate('audit.capaPlans') || 'CAPA Plans' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/audit/capa-effectiveness')"><i class="pi pi-gauge"></i> {{ i18nSvc.translate('audit.effectiveness') || 'Effectiveness' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/risk/register')"><i class="pi pi-shield"></i> {{ i18nSvc.translate('audit.riskRegister') || 'Risk Register' }}</button>
        <button class="cross-link-btn" (click)="navigateTo('/compliance/controls')"><i class="pi pi-verified"></i> {{ i18nSvc.translate('audit.controls') || 'Controls' }}</button>
      </div>

      <!-- New Review Dialog -->
      <p-dialog [header]="i18nSvc.translate('audit.newClosureReview')"
        [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '480px' }">
        <div class="form-grid">
          <div class="field">
            <label>{{ i18nSvc.translate('audit.finding') }} *</label>
            <p-dropdown [options]="findingOptions()" [(ngModel)]="form.finding_id" optionLabel="label" optionValue="value" class="w-full"
              [placeholder]="i18nSvc.translate('audit.selectFinding')" [filter]="true" />
          </div>
          <div class="field">
            <label>{{ i18nSvc.translate('audit.outcome') }} *</label>
            <p-dropdown [options]="outcomeOptions" [(ngModel)]="form.outcome" class="w-full" />
          </div>
          <div class="field">
            <label>{{ i18nSvc.translate('audit.comments') }}</label>
            <textarea pInputTextarea [(ngModel)]="form.comments" [rows]="3" class="w-full"></textarea>
          </div>
          <div class="field">
            <p-checkbox [(ngModel)]="form.verified_effective" [binary]="true"
              inputId="verifiedEffective" /><label for="verifiedEffective" class="ml-2">{{ i18nSvc.translate('audit.verifiedEffective') }}</label>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18nSvc.translate('audit.cancel')" severity="secondary" [text]="true" (onClick)="dialogVisible = false" />
          <p-button [label]="i18nSvc.translate('audit.submit')" icon="pi pi-check" (onClick)="save()" [disabled]="!form.finding_id || !form.outcome" />
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `,
    styles: [`
    .form-grid { display: flex; flex-direction: column; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .w-full { width: 100%; }
    .finding-link { color: var(--primary); cursor: pointer; text-decoration: underline; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditValidationComponent implements OnInit {
  private api = inject(AuditApiService);
  private router = inject(Router);
  private auth = inject(SessionService);
  readonly i18nSvc = inject(I18nService);
  private msg = inject(MessageService);

  loading = signal(true);
  items = signal<Record<string, unknown>[]>([]);
  filtered = signal<Record<string, unknown>[]>([]);
  findings = signal<Record<string, unknown>[]>([]);
  outcomeFilter = '';
  dialogVisible = false;
  form: Record<string, unknown> = { finding_id: '', outcome: 'closed', comments: '', verified_effective: false };

  outcomeOptions = [{ label: 'Closed', value: 'closed' }, { label: 'Reopened', value: 'reopened' }, { label: 'Deferred', value: 'deferred' }];
  get canManage() { return this.auth.hasPermission('audit.record.manage'); }

  findingOptions = () => this.findings().map(f => ({ label: `${f.title} (${f.severity})`, value: f.finding_id }));

  ngOnInit() {
    this.loadReviews();
    this.api.getFindings().subscribe({ next: r => this.findings.set((r as any).findings || []) });
  }

  loadReviews() {
    this.api.getClosureReviews().subscribe({
      next: r => { this.items.set((r as any).reviews || []); this.applyFilter(); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: this.i18nSvc.translate('audit.failedToLoadReviews') }); }
    });
  }

  applyFilter() {
    let list = this.items();
    if (this.outcomeFilter) list = list.filter(i => i.outcome === this.outcomeFilter);
    this.filtered.set(list);
  }

  openDialog() {
    this.form = { finding_id: '', outcome: 'closed', comments: '', verified_effective: false };
    this.dialogVisible = true;
  }

  save() {
    this.api.createClosureReview(this.form as any).subscribe({
      next: () => { this.dialogVisible = false; this.loadReviews(); this.msg.add({ severity: 'success', summary: this.i18nSvc.translate('audit.reviewSubmitted') }); },
      error: (e) => this.msg.add({ severity: 'error', summary: this.i18nSvc.translate('common.error'), detail: e.error?.error || this.i18nSvc.translate('audit.failedToSubmitReview') })
    });
  }

  navigateToFinding(id: string) { this.router.navigate(['/audit/findings'], { queryParams: { id } }); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
