import { Component, ChangeDetectionStrategy, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, RiskLink } from '../services/exception-api.service';
import { DisplayValuePipe } from '@app/shared/pipes';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-risk-links',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule, DisplayValuePipe],
  styles: [`
    .rl-section { padding: 16px 0; }
    .rl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .rl-header h4 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .rl-list { display: flex; flex-direction: column; gap: 8px; }
    .rl-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 14px; }
    .rl-row { display: flex; align-items: center; justify-content: space-between; }
    .rl-id { font-weight: 600; font-size: var(--font-size-base); }
    .rl-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-top: 4px; }
    .rl-desc { font-size: var(--font-size-xs-plus); margin-top: 6px; }
    .add-form { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
    .add-input { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); }
    .span-2 { grid-column: span 2; }
    .risk-select { padding: 4px 8px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .empty-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); padding: 24px; text-align: center; }
    .rl-low { background: var(--green-50); color: var(--green-700); }
    .rl-medium { background: var(--yellow-50); color: var(--yellow-700); }
    .rl-high { background: var(--orange-50); color: var(--orange-700); }
    .rl-critical { background: var(--red-50); color: var(--red-700); }
  `],
  template: `
    <div class="rl-section">
      <div class="rl-header">
        <h4>{{ isAr ? 'ربط المخاطر' : 'Risk Links' }} ({{ total() }})</h4>
        <p-button icon="pi pi-plus" [label]="isAr ? 'ربط مخاطرة' : 'Link Risk'" size="small" [outlined]="true" (onClick)="showAdd.set(!showAdd())" />
      </div>

      @if (showAdd()) {
        <div class="add-form">
          <input class="add-input" [placeholder]="isAr ? 'معرف المخاطرة' : 'Risk ID'" [(ngModel)]="newLink.riskId" />
          <select class="risk-select" [(ngModel)]="newLink.residualRiskLevel">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <input class="add-input span-2" [placeholder]="isAr ? 'وصف الأثر' : 'Impact Description'" [(ngModel)]="newLink.impactDescription" />
          <p-button icon="pi pi-check" [label]="isAr ? 'ربط' : 'Link'" size="small" (onClick)="addLink()" [disabled]="!newLink.riskId" />
        </div>
      }

      @if (loading()) {
        <p class="empty-text">{{ isAr ? 'جارٍ التحميل...' : 'Loading...' }}</p>
      } @else if (links().length === 0) {
        <p class="empty-text">{{ isAr ? 'لا توجد مخاطر مربوطة' : 'No risk links found' }}</p>
      } @else {
        <div class="rl-list">
          @for (link of links(); track link.linkId) {
            <div class="rl-card">
              <div class="rl-row">
                <span class="rl-id">{{ (link.riskId || link.controlId) | displayValue }}</span>
                <p-tag [value]="link.residualRiskLevel" [styleClass]="'rl-' + link.residualRiskLevel" />
              </div>
              @if (link.impactDescription) { <div class="rl-desc">{{ link.impactDescription }}</div> }
              <div class="rl-meta">Type: {{ link.linkType }} · Linked: {{ link.linkedAt | date:'mediumDate' }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExceptionRiskLinksComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = input.required<string>();

  loading = signal(true);
  links = signal<RiskLink[]>([]);
  total = signal(0);
  showAdd = signal(false);
  newLink = { riskId: '', impactDescription: '', residualRiskLevel: 'medium' };

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getRiskLinks(this.exceptionId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => { this.links.set(res?.data?.links || []); this.total.set(res?.data?.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addLink(): void {
    if (!this.newLink.riskId) return;
    this.api.linkRisk(this.exceptionId(), { riskId: this.newLink.riskId, impactDescription: this.newLink.impactDescription, residualRiskLevel: this.newLink.residualRiskLevel })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.newLink = { riskId: '', impactDescription: '', residualRiskLevel: 'medium' }; this.showAdd.set(false); this.load(); });
  }
}
