// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/textarea';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QiyasStrategyApiService } from '../services/qiyas-strategy-api.service';
import { PageHeaderComponent } from '../../../../../shared/components/page-chrome/page-header.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state.component';

@Component({
    selector: 'app-strategy-objectives', changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [MessageService],
    imports: [CommonModule, FormsModule, RouterModule, TableModule, TagModule, ButtonModule, DialogModule,
        InputTextModule, InputTextarea, DropdownModule, ProgressBarModule, SkeletonModule, ToastModule,
        PageHeaderComponent, EmptyStateComponent],
    template: `
    <app-page-header titleEn="Objectives Register" titleAr="سجل الأهداف" icon="pi-flag"
                     subtitleEn="Strategic objectives linked to risks, metrics, and maturity" subtitleAr="الأهداف الاستراتيجية المرتبطة بالمخاطر والمقاييس والنضج">
      <button pButton label="New Objective" icon="pi pi-plus" class="p-button-sm" (click)="showCreate = true"></button>
    </app-page-header>

    <!-- Filters -->
    <div class="obj-filters">
      <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="load()">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option><option value="active">Active</option>
        <option value="on_track">On Track</option><option value="at_risk">At Risk</option>
        <option value="delayed">Delayed</option><option value="completed">Completed</option>
      </select>
    </div>

    @if (loading()) { <p-skeleton width="100%" height="400px" /> }
    @else if (objectives().length) {
      <p-table [value]="objectives()" [paginator]="objectives().length > 20" [rows]="20" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr><th>Code</th><th>Objective</th><th>Category</th><th>Owner</th><th>Status</th><th>Priority</th><th>Progress</th><th>Target</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-o>
          <tr class="cursor-pointer" [routerLink]="['/qiyas/strategy/objectives', o.objective_id]">
            <td class="code-cell">{{ o.code }}</td>
            <td>{{ o.title_en }}</td>
            <td><p-tag [value]="o.category" /></td>
            <td>{{ o.owner_id || '—' }}</td>
            <td><p-tag [value]="o.status" [severity]="o.status === 'at_risk' ? 'danger' : o.status === 'completed' ? 'success' : 'info'" /></td>
            <td><p-tag [value]="o.priority" [severity]="o.priority === 'critical' ? 'danger' : 'info'" /></td>
            <td><p-progressBar [value]="o.progress_pct || 0" [showValue]="true" /></td>
            <td>{{ o.target_date || '—' }}</td>
          </tr>
        </ng-template>
      </p-table>
    } @else { <app-empty-state variant="info" titleEn="No objectives found" titleAr="لا توجد أهداف" /> }

    <!-- Create Dialog -->
    <p-dialog header="New Strategic Objective" [(visible)]="showCreate" [modal]="true" [style]="{width:'550px'}">
      <div class="form-grid">
        <div class="ff"><label>Title (EN)</label><input pInputText [(ngModel)]="form.titleEn" /></div>
        <div class="ff"><label>Title (AR)</label><input pInputText [(ngModel)]="form.titleAr" /></div>
        <div class="ff"><label>Description</label><textarea pInputTextarea [(ngModel)]="form.description" rows="3"></textarea></div>
        <div class="ff"><label>Category</label>
          <p-dropdown [options]="categories" [(ngModel)]="form.category" placeholder="Select" />
        </div>
        <div class="ff"><label>Priority</label>
          <p-dropdown [options]="priorityOpts" [(ngModel)]="form.priority" placeholder="Select" />
        </div>
        <div class="ff"><label>Target Date</label><input pInputText type="date" [(ngModel)]="form.targetDate" /></div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton label="Cancel" class="p-button-text" (click)="showCreate = false"></button>
        <button pButton label="Create" icon="pi pi-check" (click)="create()"></button>
      </ng-template>
    </p-dialog>
    <p-toast />
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }
    .obj-filters { display: flex; gap: 8px; margin: 12px 0; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: var(--font-size-tag); }
    .code-cell { font-family: monospace; font-size: var(--font-size-caption); color: var(--primary); }
    .cursor-pointer { cursor: pointer; }
    .form-grid { display: flex; flex-direction: column; gap: 12px; }
    .ff { display: flex; flex-direction: column; gap: 4px; }
    .ff label { font-size: var(--font-size-tag); font-weight: 600; color: var(--text-muted); }
    .ff input, .ff textarea { width: 100%; }
  `]
})
export class StrategyObjectivesComponent implements OnInit {
  private readonly api = inject(QiyasStrategyApiService);
  private readonly msg = inject(MessageService);
  loading = signal(true);
  objectives = signal<any[]>([]);
  statusFilter = '';
  showCreate = false;
  form = { titleEn: '', titleAr: '', description: '', category: 'governance', priority: 'medium', targetDate: '' };
  categories = [{ label: 'Governance', value: 'governance' }, { label: 'Risk', value: 'risk' }, { label: 'Compliance', value: 'compliance' }, { label: 'Performance', value: 'performance' }, { label: 'Innovation', value: 'innovation' }];
  priorityOpts = [{ label: 'Critical', value: 'critical' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }];

  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.api.getObjectives({ status: this.statusFilter || undefined }).subscribe({
      next: (d) => { this.objectives.set(d.objectives || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  create(): void {
    this.api.createObjective(this.form).subscribe({
      next: () => { this.msg.add({ severity: 'success', summary: 'Objective created' }); this.showCreate = false; this.load(); },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to create objective' })
    });
  }
}
