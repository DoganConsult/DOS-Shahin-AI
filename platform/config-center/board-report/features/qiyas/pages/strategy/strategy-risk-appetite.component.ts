// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';

@Component({
    selector: 'app-strategy-risk-appetite', changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, FormsModule, TableModule, TagModule, ButtonModule, DialogModule, InputTextModule, InputTextarea, DropdownModule, SkeletonModule, ToastModule, PageHeaderComponent, EmptyStateComponent],
    template: `
    <app-page-header titleEn="Risk Appetite Statements" titleAr="بيانات الرغبة في المخاطر" icon="pi-shield"
                     subtitleEn="Define and manage organizational risk appetite by category" subtitleAr="تحديد وإدارة الرغبة في المخاطر حسب الفئة">
      <button pButton label="New Statement" icon="pi pi-plus" class="p-button-sm" (click)="showCreate = true"></button>
    </app-page-header>
    @if (loading()) { <p-skeleton width="100%" height="300px" /> }
    @else if (statements().length) {
      <p-table [value]="statements()" styleClass="p-datatable-sm p-datatable-striped" [paginator]="statements().length > 15" [rows]="15">
        <ng-template pTemplate="header"><tr><th>Category</th><th>Statement</th><th>Level</th><th>Tolerance</th><th>Status</th><th>Actions</th></tr></ng-template>
        <ng-template pTemplate="body" let-s>
          <tr>
            <td><p-tag [value]="s.risk_category" /></td>
            <td style="max-width:400px">{{ s.statement_en }}</td>
            <td><p-tag [value]="s.appetite_level" [severity]="s.appetite_level === 'averse' ? 'danger' : s.appetite_level === 'hungry' ? 'warning' : 'info'" /></td>
            <td>{{ s.tolerance_lower || '—' }} – {{ s.tolerance_upper || '—' }} {{ s.unit }}</td>
            <td><p-tag [value]="s.status" [severity]="s.status === 'approved' ? 'success' : 'warning'" /></td>
            <td>
              @if (s.status === 'draft') { <button pButton icon="pi pi-check" class="p-button-text p-button-success p-button-sm" (click)="approve(s.statement_id)"></button> }
            </td>
          </tr>
        </ng-template>
      </p-table>
    } @else { <app-empty-state variant="info" titleEn="No risk appetite statements defined" titleAr="لم يتم تحديد بيانات الرغبة في المخاطر" /> }

    <p-dialog header="New Risk Appetite Statement" [(visible)]="showCreate" [modal]="true" [style]="{width:'550px'}">
      <div class="form-grid">
        <div class="ff"><label>Risk Category</label>
          <p-dropdown [options]="catOpts" [(ngModel)]="form.riskCategory" placeholder="Select" /></div>
        <div class="ff"><label>Statement (EN)</label><textarea pInputTextarea [(ngModel)]="form.statementEn" rows="3"></textarea></div>
        <div class="ff"><label>Appetite Level</label>
          <p-dropdown [options]="levelOpts" [(ngModel)]="form.appetiteLevel" placeholder="Select" /></div>
        <div class="ff"><label>Tolerance Lower</label><input pInputText type="number" [(ngModel)]="form.toleranceLower" /></div>
        <div class="ff"><label>Tolerance Upper</label><input pInputText type="number" [(ngModel)]="form.toleranceUpper" /></div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Cancel" class="p-button-text" (click)="showCreate = false"></button>
        <button pButton label="Create" icon="pi pi-check" (click)="create()"></button>
      </ng-template>
    </p-dialog>
    <p-toast />
  `,
    styles: [`:host { display: block; padding: 0 16px 24px; }
    .form-grid { display: flex; flex-direction: column; gap: 12px; }
    .ff { display: flex; flex-direction: column; gap: 4px; }
    .ff label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-muted); }
    .ff input, .ff textarea { width: 100%; }`]
})
export class StrategyRiskAppetiteComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  private readonly msg = inject(MessageService);
  loading = signal(true);
  statements = signal<any[]>([]);
  showCreate = false;
  form = { riskCategory: 'operational', statementEn: '', appetiteLevel: 'moderate', toleranceLower: null, toleranceUpper: null };
  catOpts = ['operational','financial','compliance','strategic','cyber','reputational'].map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }));
  levelOpts = ['averse','cautious','moderate','open','hungry'].map(l => ({ label: l.charAt(0).toUpperCase() + l.slice(1), value: l }));

  ngOnInit(): void { this.load(); }
  load(): void { this.loading.set(true); this.api.getRiskAppetite().subscribe({ next: d => { this.statements.set(d.statements || []); this.loading.set(false); }, error: () => this.loading.set(false) }); }
  create(): void { this.api.createRiskAppetite(this.form).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Statement created' }); this.showCreate = false; this.load(); }, error: () => this.msg.add({ severity: 'error', summary: 'Failed' }) }); }
  approve(id: string): void { this.api.approveRiskAppetite(id).subscribe({ next: () => { this.msg.add({ severity: 'success', summary: 'Approved' }); this.load(); } }); }
}
