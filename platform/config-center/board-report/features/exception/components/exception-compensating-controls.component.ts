import { Component, ChangeDetectionStrategy, inject, input, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { I18nService } from '@app/infrastructure';
import { ExceptionApiService, CompensatingControlLink } from '../services/exception-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exception-compensating-controls',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TagModule],
  styles: [`
    .cc-section { padding: 16px 0; }
    .cc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .cc-header h4 { margin: 0; font-size: var(--font-size-base); font-weight: 700; }
    .cc-list { display: flex; flex-direction: column; gap: 8px; }
    .cc-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 14px; display: flex; align-items: center; justify-content: space-between; }
    .cc-info { display: flex; flex-direction: column; gap: 4px; }
    .cc-title { font-weight: 600; font-size: var(--font-size-base); }
    .cc-meta { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .cc-actions { display: flex; gap: 6px; align-items: center; }
    .rating-select { padding: 4px 8px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-sm); }
    .add-form { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
    .add-input { padding: 6px 10px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); font-size: var(--font-size-xs-plus); flex: 1; min-width: 140px; }
    .empty-text { font-size: var(--font-size-xs-plus); color: var(--text-color-secondary); padding: 24px; text-align: center; }
    .eff-effective { background: var(--green-50); color: var(--green-700); }
    .eff-partially_effective { background: var(--yellow-50); color: var(--yellow-700); }
    .eff-ineffective { background: var(--red-50); color: var(--red-700); }
    .eff-not_assessed { background: var(--surface-100); color: var(--text-color-secondary); }
  `],
  template: `
    <div class="cc-section">
      <div class="cc-header">
        <h4>{{ isAr ? 'الضوابط التعويضية' : 'Compensating Controls' }} ({{ total() }})</h4>
        <p-button icon="pi pi-plus" [label]="isAr ? 'ربط' : 'Link'" size="small" [outlined]="true" (onClick)="showAdd.set(!showAdd())" />
      </div>

      @if (showAdd()) {
        <div class="add-form">
          <input class="add-input" [placeholder]="isAr ? 'معرف الضابط' : 'Control ID'" [(ngModel)]="newControlId" />
          <input class="add-input" [placeholder]="isAr ? 'عنوان الضابط' : 'Control Title'" [(ngModel)]="newControlTitle" />
          <p-button icon="pi pi-check" [label]="isAr ? 'ربط' : 'Link'" size="small" (onClick)="addLink()" [disabled]="!newControlId || !newControlTitle" />
        </div>
      }

      @if (loading()) {
        <p class="empty-text">{{ isAr ? 'جارٍ التحميل...' : 'Loading...' }}</p>
      } @else if (controls().length === 0) {
        <p class="empty-text">{{ isAr ? 'لا توجد ضوابط تعويضية مربوطة' : 'No compensating controls linked' }}</p>
      } @else {
        <div class="cc-list">
          @for (ctrl of controls(); track ctrl.linkId) {
            <div class="cc-card">
              <div class="cc-info">
                <span class="cc-title">{{ ctrl.controlTitle }}</span>
                <span class="cc-meta">ID: {{ ctrl.controlId }} · Linked: {{ ctrl.linkedAt | date:'mediumDate' }}</span>
              </div>
              <div class="cc-actions">
                <select class="rating-select" [ngModel]="ctrl.effectivenessRating" (ngModelChange)="updateEffectiveness(ctrl.linkId, $event)">
                  <option value="effective">Effective</option>
                  <option value="partially_effective">Partially Effective</option>
                  <option value="ineffective">Ineffective</option>
                  <option value="not_assessed">Not Assessed</option>
                </select>
                <p-tag [value]="ctrl.effectivenessRating" [styleClass]="'eff-' + ctrl.effectivenessRating" />
                <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small" (onClick)="removeLink(ctrl.linkId)" />
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExceptionCompensatingControlsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ExceptionApiService);
  private i18n = inject(I18nService);

  exceptionId = input.required<string>();

  loading = signal(true);
  controls = signal<CompensatingControlLink[]>([]);
  total = signal(0);
  showAdd = signal(false);
  newControlId = '';
  newControlTitle = '';

  get isAr(): boolean { return this.i18n.direction() === 'rtl'; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getCompensatingControls(this.exceptionId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => { this.controls.set(res?.data?.controls || []); this.total.set(res?.data?.total || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addLink(): void {
    if (!this.newControlId || !this.newControlTitle) return;
    this.api.linkCompensatingControl(this.exceptionId(), { controlId: this.newControlId, controlTitle: this.newControlTitle })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.newControlId = ''; this.newControlTitle = ''; this.showAdd.set(false); this.load(); });
  }

  removeLink(linkId: string): void {
    this.api.unlinkCompensatingControl(linkId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  updateEffectiveness(linkId: string, rating: string): void {
    this.api.updateControlEffectiveness(linkId, rating).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }
}
