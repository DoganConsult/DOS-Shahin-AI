import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QiyasService } from '../../qiyas.service';
import { QiyasModel } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-models',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ i18n.translate('qiyas.modelRegistry') }}</h1>
          <p class="subtitle">{{ i18n.translate('qiyas.subtitle') }}</p>
        </div>
        <button class="btn-primary" (click)="showCreate = !showCreate">+ {{ i18n.translate('qiyas.newModel') }}</button>
      </div>

      <!-- Create form -->
      <div class="create-form" *ngIf="showCreate">
        <div class="form-row">
          <input [(ngModel)]="newModel.code" [placeholder]="i18n.translate('qiyas.modelCode')" [attr.aria-label]="i18n.translate('qiyas.modelCode')" class="input" />
          <input [(ngModel)]="newModel.name_en" [placeholder]="i18n.translate('qiyas.modelName')" [attr.aria-label]="i18n.translate('qiyas.modelName')" class="input" />
          <select [(ngModel)]="newModel.model_type" class="input">
            <option value="maturity">{{ i18n.translate('qiyas.maturity') }}</option>
            <option value="compliance">{{ i18n.translate('qiyas.compliance') }}</option>
            <option value="risk">{{ i18n.translate('qiyas.risk') }}</option>
            <option value="readiness">{{ i18n.translate('qiyas.readinessType') }}</option>
            <option value="custom">{{ i18n.translate('qiyas.custom') }}</option>
          </select>
          <button class="btn-primary" (click)="create()" [disabled]="!newModel.code || !newModel.name_en">{{ i18n.translate('qiyas.createModel') }}</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <select [(ngModel)]="filterStatus" (ngModelChange)="load()" class="input-sm">
          <option value="">{{ i18n.translate('qiyas.allStatuses') }}</option>
          <option value="active">{{ i18n.translate('qiyas.active') }}</option>
          <option value="draft">{{ i18n.translate('qiyas.draft') }}</option>
          <option value="deprecated">{{ i18n.translate('qiyas.archived') }}</option>
        </select>
        <select [(ngModel)]="filterType" (ngModelChange)="load()" class="input-sm">
          <option value="">{{ i18n.translate('qiyas.allTypes') }}</option>
          <option value="maturity">{{ i18n.translate('qiyas.maturity') }}</option>
          <option value="compliance">{{ i18n.translate('qiyas.compliance') }}</option>
          <option value="risk">{{ i18n.translate('qiyas.risk') }}</option>
          <option value="readiness">{{ i18n.translate('qiyas.readinessType') }}</option>
        </select>
      </div>

      <!-- List -->
      <div class="model-list">
        <div class="empty" *ngIf="models().length === 0 && !loading()">{{ i18n.translate('qiyas.noData') }}</div>
        <a *ngFor="let m of models()"
           [routerLink]="['/qiyas/models', m.model_id]"
           class="model-card">
          <div class="model-info">
            <div class="model-name">{{ m.name_en }}</div>
            <div class="model-code">{{ m.code }}</div>
          </div>
          <div class="model-meta">
            <span class="badge" [class]="'badge-' + m.status">{{ m.status }}</span>
            <span class="type-tag">{{ m.model_type }}</span>
          </div>
        </a>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .subtitle { color: var(--text-muted); margin-top: 2px; font-size: var(--font-size-base); }
    .btn-primary { padding: 10px 20px; border-radius: var(--radius); border: none; background: var(--primary); color: #fff; cursor: pointer; font-weight: 600; font-size: var(--font-size-base); }
    .create-form { background: var(--surface-ice); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; }
    .form-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .filters { display: flex; gap: 10px; margin-bottom: 16px; }
    .model-list { display: flex; flex-direction: column; gap: 8px; }
    .model-card { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); text-decoration: none; color: var(--text-heading); transition: border-color 0.15s; }
    .model-card:hover { border-color: var(--primary); }
    .model-name { font-weight: 600; font-size: var(--font-size-base); }
    .model-code { font-size: var(--font-size-sm); color: var(--text-muted); font-family: monospace; }
    .model-meta { display: flex; gap: 8px; align-items: center; }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-active { background: #dcfce7; color: var(--success); }
    .badge-draft { background: var(--surface-ice); color: var(--text-muted); }
    .badge-deprecated { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .type-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .empty { color: var(--text-muted); text-align: center; padding: 32px; }
  `]
})
export class QiyasModelsComponent implements OnInit {
  private svc = inject(QiyasService);
  public i18n = inject(I18nService);
  models = signal<QiyasModel[]>([]);
  loading = signal(false);
  showCreate = false;
  filterStatus = '';
  filterType = '';
  newModel: Partial<QiyasModel> = { code: '', name_en: '', model_type: 'maturity' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const params: Record<string, string> = {};
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterType) params.model_type = this.filterType;
    this.svc.listModels(params).subscribe({
      next: (m) => { this.models.set(m); this.loading.set(false); },
      error: () => { this.models.set([]); this.loading.set(false); },
    });
  }

  create() {
    this.svc.createModel(this.newModel).subscribe({
      next: () => { this.showCreate = false; this.newModel = { code: '', name_en: '', model_type: 'maturity' }; this.load(); },
    });
  }

}
