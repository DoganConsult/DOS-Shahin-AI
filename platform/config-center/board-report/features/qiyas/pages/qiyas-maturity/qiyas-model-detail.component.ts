import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, merge, of, switchMap, catchError } from 'rxjs';
import { QiyasService } from '../../qiyas.service';
import { QiyasModel, QiyasDomain } from '../../qiyas.models';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-qiyas-model-detail',
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="page" *ngIf="model()">
      <div class="page-header">
        <a routerLink="/qiyas/models" class="back-link">&larr; {{ i18n.translate('qiyas.modelRegistry') }}</a>
        <div class="header-row">
          <div>
            <h1>{{ model()!.name_en }}</h1>
            <div class="meta-row">
              <span class="code">{{ model()!.code }}</span>
              <span class="badge" [class]="'badge-' + model()!.status">{{ model()!.status }}</span>
              <span class="type-tag">{{ model()!.model_type }}</span>
            </div>
          </div>
          <div class="actions">
            <button class="btn-sm" *ngIf="model()!.status === 'draft'" (click)="activate()">{{ i18n.translate('qiyas.activate') }}</button>
          </div>
        </div>
        <p class="desc" *ngIf="model()!.description_en">{{ model()!.description_en }}</p>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>{{ i18n.translate('qiyas.domains') }}</h3>
          <button class="btn-sm" (click)="showAddDomain = !showAddDomain">+ {{ i18n.translate('qiyas.addDomain') }}</button>
        </div>

        <div class="add-domain-form" *ngIf="showAddDomain">
          <input [(ngModel)]="newDomain.code" [placeholder]="i18n.translate('qiyas.domainCode')" [attr.aria-label]="i18n.translate('qiyas.domainCode')" class="input" />
          <input [(ngModel)]="newDomain.name_en" [placeholder]="i18n.translate('qiyas.domainName')" [attr.aria-label]="i18n.translate('qiyas.domainName')" class="input" />
          <input [(ngModel)]="newDomain.weight" type="number" [placeholder]="i18n.translate('qiyas.weight')" [attr.aria-label]="i18n.translate('qiyas.weight')" class="input input-narrow" />
          <button class="btn-primary-sm" (click)="addDomain()" [disabled]="!newDomain.code || !newDomain.name_en">{{ i18n.translate('qiyas.saveDomain') }}</button>
        </div>

        <div class="domain-list">
          <div class="empty" *ngIf="domains().length === 0">{{ i18n.translate('qiyas.noData') }}</div>
          <div *ngFor="let d of domains(); let i = index" class="domain-card">
            <div class="domain-info">
              <span class="domain-order">{{ i + 1 }}</span>
              <div>
                <div class="domain-name">{{ d.name_en }}</div>
                <div class="domain-code">{{ d.code }}</div>
              </div>
            </div>
            <div class="domain-weight">{{ i18n.translate('qiyas.weight') }}: {{ d.weight }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
    .back-link { font-size: var(--font-size-sm); color: var(--text-muted); text-decoration: none; }
    .back-link:hover { color: var(--primary); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px; }
    h1 { font-size: var(--font-size-2xl); font-weight: 700; margin: 0; }
    .meta-row { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
    .code { font-family: monospace; font-size: var(--font-size-sm); color: var(--text-muted); }
    .badge { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-xs); font-weight: 600; text-transform: uppercase; }
    .badge-active { background: #dcfce7; color: var(--success); }
    .badge-draft { background: var(--surface-ice); color: var(--text-muted); }
    .type-tag { font-size: var(--font-size-xs); color: var(--text-muted); background: var(--surface-ice); padding: 2px 6px; border-radius: var(--radius-xs); }
    .desc { color: #475569; margin-top: 8px; }
    .btn-sm { padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: var(--font-size-sm); }
    .btn-primary-sm { padding: 6px 14px; border-radius: var(--radius-sm); border: none; background: var(--primary); color: #fff; cursor: pointer; font-size: var(--font-size-sm); }
    .section { margin-top: 32px; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .section-header h3 { font-size: 17px; font-weight: 600; margin: 0; }
    .add-domain-form { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .input { padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .input-narrow { width: 70px; }
    .domain-list { display: flex; flex-direction: column; gap: 6px; }
    .domain-card { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid var(--border-subtle); border-radius: var(--radius); }
    .domain-info { display: flex; gap: 12px; align-items: center; }
    .domain-order { width: 24px; height: 24px; border-radius: var(--radius-pill); background: var(--surface-ice); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted); }
    .domain-name { font-weight: 500; }
    .domain-code { font-size: var(--font-size-sm); color: var(--text-muted); font-family: monospace; }
    .domain-weight { font-size: var(--font-size-sm); color: var(--text-muted); }
    .empty { color: var(--text-muted); text-align: center; padding: 24px; }
  `]
})
export class QiyasModelDetailComponent {
  private svc = inject(QiyasService);
  private route = inject(ActivatedRoute);
  public i18n = inject(I18nService);

  private modelId = this.route.snapshot.paramMap.get('modelId')!;
  private refresh$ = new Subject<void>();

  model = toSignal(
    merge(of(void 0), this.refresh$).pipe(
      switchMap(() => this.svc.getModel(this.modelId)),
      catchError(() => of(null)),
    ),
    { initialValue: null as QiyasModel | null },
  );

  domains = toSignal(
    merge(of(void 0), this.refresh$).pipe(
      switchMap(() => this.svc.listDomains(this.modelId)),
      catchError(() => of([] as QiyasDomain[])),
    ),
    { initialValue: [] as QiyasDomain[] },
  );

  showAddDomain = false;
  newDomain: Partial<QiyasDomain> = { code: '', name_en: '', weight: 1.0 };

  addDomain() {
    const modelId = this.model()?.model_id;
    if (!modelId) return;
    this.svc.createDomain(modelId, { ...this.newDomain, sort_order: this.domains().length }).subscribe({
      next: () => {
        this.newDomain = { code: '', name_en: '', weight: 1.0 };
        this.showAddDomain = false;
        this.refresh$.next();
      },
    });
  }

  activate() {
    const modelId = this.model()?.model_id;
    if (!modelId) return;
    this.svc.updateModel(modelId, { status: 'active' }).subscribe(() => this.refresh$.next());
  }
}
