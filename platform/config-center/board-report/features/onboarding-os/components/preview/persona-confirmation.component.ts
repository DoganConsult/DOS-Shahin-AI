import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DashboardPersonaProfile } from '../../models/onboarding.models';

@Component({
    selector: 'app-persona-confirmation',
    imports: [CommonModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="persona-confirm" *ngIf="recommended" [class.rtl]="lang === 'ar'">
      <div class="persona-header">
        <i class="pi pi-user"></i>
        {{ lang === 'ar' ? 'شخصية لوحة التحكم المقترحة' : 'Recommended Dashboard Persona' }}
      </div>
      <div class="persona-card" [class.confirmed]="confirmed()">
        <div class="persona-icon"><i class="pi pi-user-edit"></i></div>
        <div class="persona-info">
          <h4>{{ lang === 'ar' ? recommended.label_ar : recommended.label_en }}</h4>
          <p>{{ lang === 'ar' ? recommended.description_ar : recommended.description_en }}</p>
          <div class="persona-modules" *ngIf="recommended.priority_modules?.length">
            <span *ngFor="let mod of (recommended.priority_modules || []).slice(0, 4)" class="persona-mod">{{ mod }}</span>
          </div>
        </div>
      </div>
      <div class="persona-actions" *ngIf="!confirmed()">
        <button pButton [label]="lang === 'ar' ? 'نعم، هذا صحيح' : 'Yes, this is correct'"
          icon="pi pi-check" class="p-button-sm" (click)="confirm()"></button>
        <button pButton [label]="lang === 'ar' ? 'ليس تماماً' : 'Not quite'"
          icon="pi pi-pencil" class="p-button-sm p-button-text" (click)="showAlternatives.set(true)"></button>
      </div>
      <div class="persona-confirmed-badge" *ngIf="confirmed()">
        <i class="pi pi-check-circle"></i> {{ lang === 'ar' ? 'تم التأكيد' : 'Confirmed' }}
      </div>
      <!-- Alternatives -->
      <div class="persona-alts" *ngIf="showAlternatives() && !confirmed()">
        <p class="persona-alts-label">{{ lang === 'ar' ? 'اختر الشخصية الأنسب:' : 'Choose the best fit:' }}</p>
        <div *ngFor="let p of alternatives" class="persona-alt"
          (click)="selectAlternative(p)" role="button" tabindex="0" (keydown.enter)="selectAlternative(p)">
          <strong>{{ lang === 'ar' ? p.label_ar : p.label_en }}</strong>
          <span>{{ lang === 'ar' ? p.description_ar : p.description_en }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .persona-confirm {
      padding: 1.25rem; margin-bottom: 1.5rem;
      background: var(--surface, #fff); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg, 12px);
    }
    .persona-header {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: var(--font-size-tag); font-weight: 700; color: var(--text-heading);
      margin-bottom: 0.75rem;
    }
    .persona-header i { color: var(--primary); }
    .persona-card {
      display: flex; gap: 0.75rem; padding: 1rem;
      background: var(--gradient-sky, linear-gradient(180deg, #edf5ff, #f8fafc));
      border: 1px solid var(--border-subtle); border-radius: var(--radius, 8px);
      margin-bottom: 0.75rem; transition: border-color 200ms;
    }
    .persona-card.confirmed { border-color: var(--status-success, #24a148); }
    .persona-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.1));
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .persona-icon i { font-size: var(--font-size-body-md); color: var(--primary); }
    .persona-info h4 { font-size: var(--font-size-body-sm); font-weight: 700; margin: 0 0 0.25rem; color: var(--text-heading); }
    .persona-info p { font-size: var(--font-size-caption); color: var(--text-body); margin: 0 0 0.5rem; line-height: 1.4; }
    .persona-modules { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .persona-mod {
      font-size: 0.6rem; font-weight: 600; padding: 0.1rem 0.35rem;
      background: rgba(var(--primary-rgb), 0.06); color: var(--primary);
      border-radius: var(--radius-xs, 4px); text-transform: capitalize;
    }
    .persona-actions { display: flex; gap: 0.5rem; }
    .persona-confirmed-badge {
      display: flex; align-items: center; gap: 0.3rem;
      font-size: 0.82rem; font-weight: 600; color: var(--status-success, #24a148);
    }
    .persona-alts { margin-top: 0.75rem; }
    .persona-alts-label { font-size: 0.82rem; color: var(--text-muted); margin: 0 0 0.5rem; }
    .persona-alt {
      display: flex; flex-direction: column; gap: 0.15rem;
      padding: 0.6rem 0.75rem; border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm, 6px); cursor: pointer;
      margin-bottom: 0.35rem; transition: all 200ms;
    }
    .persona-alt:hover { border-color: var(--primary); background: rgba(var(--primary-rgb), 0.02); }
    .persona-alt strong { font-size: 0.82rem; color: var(--text-heading); }
    .persona-alt span { font-size: 0.72rem; color: var(--text-muted); }
    .rtl { direction: rtl; }
  `]
})
export class PersonaConfirmationComponent {
  @Input() recommended: DashboardPersonaProfile | null = null;
  @Input() alternatives: DashboardPersonaProfile[] = [];
  @Input() lang: 'en' | 'ar' = 'en';
  @Output() personaConfirmed = new EventEmitter<string>();

  confirmed = signal(false);
  showAlternatives = signal(false);

  confirm(): void {
    if (this.recommended) {
      this.confirmed.set(true);
      this.personaConfirmed.emit(this.recommended.persona_code);
    }
  }

  selectAlternative(p: DashboardPersonaProfile): void {
    this.confirmed.set(true);
    this.showAlternatives.set(false);
    this.personaConfirmed.emit(p.persona_code);
  }
}
