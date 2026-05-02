import { asArray } from '@app/runtime/utils/safe-data';
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ApiClientService } from "@app/core/services/api-client.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contextual-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, CardModule, InputTextModule, DropdownModule, ButtonModule, TagModule, TableModule],
  template: `
    <app-page-shell icon="brain" title="Contextual AI"
      subtitle="Context-aware suggestions, entity summaries, and recommendations"
      [breadcrumbs]="['Dashboard', 'Contextual AI']" [loading]="loading">
      <div class="sections" *ngIf="!error">
        <p-card header="AI Suggestions">
          <div class="filter-row">
            <p-dropdown [options]="routeOptions" [(ngModel)]="route" placeholder="Select route context" appendTo="body" />
            <p-button label="Get Suggestions" icon="pi pi-sparkles" (onClick)="getSuggestions()" />
          </div>
          <div *ngFor="let s of suggestions" class="suggestion-card">
            <p-tag [value]="s.type || 'suggestion'" severity="info" />
            <span class="suggestion-text">{{ s.text || s.message || s.title }}</span>
          </div>
        </p-card>

        <p-card header="Entity Summary">
          <div class="filter-row">
            <p-dropdown [options]="entityTypes" [(ngModel)]="entityType" placeholder="Entity Type" appendTo="body" />
            <input pInputText [(ngModel)]="entityId" placeholder="Entity ID" aria-label="Entity ID" />
            <p-button label="Summarize" icon="pi pi-file" (onClick)="getSummary()" />
          </div>
          <div *ngIf="summary" class="summary-box">
            <p>{{ summary.summary || summary.text || (summary | json) }}</p>
          </div>
        </p-card>

        <p-card header="Recommendations">
          <div class="filter-row">
            <p-dropdown [options]="entityTypes" [(ngModel)]="recEntityType" placeholder="Entity Type" appendTo="body" />
            <input pInputText [(ngModel)]="recEntityId" placeholder="Entity ID" aria-label="Entity ID" />
            <p-button label="Get Recommendations" icon="pi pi-lightbulb" (onClick)="getRecommendations()" />
          </div>
          <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Recommendations table" [value]="recommendations" styleClass="p-datatable-sm" *ngIf="recommendations.length > 0">
            <ng-template pTemplate="header"><tr><th>Type</th><th>Recommendation</th><th>Priority</th></tr></ng-template>
            <ng-template pTemplate="body" let-r>
              <tr>
                <td><p-tag [value]="r.type || 'general'" /></td>
                <td>{{ r.text || r.recommendation || r.title }}</td>
                <td><p-tag [value]="r.priority || 'medium'" [severity]="r.priority === 'high' ? 'danger' : r.priority === 'low' ? 'info' : 'warning'" /></td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
      <div *ngIf="error" class="error-state">
        <i class="pi pi-exclamation-triangle" style="font-size:36px"></i>
        <p>{{ error }}</p>
        <button (click)="error=''; getSuggestions()">Retry</button>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .sections { display: flex; flex-direction: column; gap: 20px; }
    .filter-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .suggestion-card { display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--surface-ground); border-radius: var(--radius-sm); margin-bottom: 8px; }
    .suggestion-text { font-size: var(--font-size-base); }
    .summary-box { padding: 16px; background: var(--surface-ground); border-radius: var(--radius); font-size: var(--font-size-base); line-height: 1.6; }
    .error-state{text-align:center;padding:32px;color:var(--error)}.error-state button{margin-top:12px;padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--status-danger-bg, #fff1f1);background:var(--status-danger-bg, #fff1f1);color:var(--error);cursor:pointer;font-weight:600}
  `]
})
export class ContextualAIComponent {
  private cdr = inject(ChangeDetectorRef);
  loading = false;
  error = '';
  route = '/risks';
  suggestions: Record<string, unknown>[] = [];
  entityType = 'risk';
  entityId = '';
  summary: Record<string, unknown> | null = null;
  recEntityType = 'risk';
  recEntityId = '';
  recommendations: Record<string, unknown>[] = [];
  routeOptions = [
    { label: 'Risks', value: '/risks' }, { label: 'Policies', value: '/policies' },
    { label: 'Controls', value: '/controls' }, { label: 'Evidence', value: '/evidence' },
    { label: 'Dashboard', value: '/dashboard' }, { label: 'Compliance', value: '/compliance' },
  ];
  entityTypes = [
    { label: 'Risk', value: 'risk' }, { label: 'Policy', value: 'policy' },
    { label: 'Control', value: 'control' }, { label: 'Finding', value: 'finding' },
    { label: 'Assessment', value: 'assessment' },
  ];

  constructor(public i18n: I18nService, private apiclientSvc: ApiClientService) {}

  getSuggestions() {
    this.loading = true;
    this.apiclientSvc.get(`/contextual-ai/ai/suggestions?route=${this.route}`).subscribe({
      next: (d: Record<string, unknown>) => { this.suggestions = asArray(d, 'data'); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load data'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  getSummary() {
    if (!this.entityId) return;
    this.apiclientSvc.get(`/contextual-ai/ai/summary/${this.entityType}/${this.entityId}`).subscribe({
      next: (d: Record<string, unknown>) => { this.summary = d.data || d; }
    });
  }

  getRecommendations() {
    if (!this.recEntityId) return;
    this.apiclientSvc.get(`/contextual-ai/ai/recommendations/${this.recEntityType}/${this.recEntityId}`).subscribe({
      next: (d: Record<string, unknown>) => { this.recommendations = asArray(d, 'data'); }
    });
  }

}
