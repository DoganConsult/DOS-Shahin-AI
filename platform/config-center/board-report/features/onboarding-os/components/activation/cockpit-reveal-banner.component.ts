import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { GrcRecord } from '../../models/onboarding.models';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfettiBurstComponent } from '../shared/confetti-burst.component';
import { CountUpDirective } from '../shared/count-up.directive';

/**
 * CockpitRevealBanner - Shown after provisioning completes.
 * Displays a summary of what Shahin has configured and a checklist
 * of first operating actions before the user enters the cockpit.
 */
@Component({
    selector: 'app-cockpit-reveal-banner',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, ConfettiBurstComponent, CountUpDirective],
    template: `
    <div class="reveal" *ngIf="complete" [class.rtl]="lang === 'ar'">
      <app-confetti-burst [trigger]="complete"></app-confetti-burst>

      <!-- Reveal header -->
      <div class="reveal-header">
        <div class="reveal-icon">
          <i class="pi pi-check-circle"></i>
        </div>
        <p class="reveal-preheadline">{{ lang === 'ar' ? 'أكمل شاهين إعداد بيئتك' : 'Shahin has completed your setup' }}</p>
        <h2>{{ lang === 'ar' ? 'نظام الحوكمة التشغيلي جاهز' : 'Your Governance Operating System Is Live' }}</h2>
        <p class="reveal-summary">
          {{ lang === 'ar' ? 'بيئة العمل مُعَدّة وجاهزة للتشغيل.' : 'Your workspace is configured and operational.' }}
        </p>

        <!-- Stat card grid -->
        <div class="reveal-stat-grid">
          <div class="reveal-stat">
            <span class="reveal-stat-val" [appCountUp]="summary.controls">0</span>
            <span class="reveal-stat-label">{{ lang === 'ar' ? 'ضابط مُعَدّ' : 'controls' }}</span>
          </div>
          <div class="reveal-stat">
            <span class="reveal-stat-val" [appCountUp]="summary.evidence">0</span>
            <span class="reveal-stat-label">{{ lang === 'ar' ? 'مهمة أدلة' : 'evidence tasks' }}</span>
          </div>
          <div class="reveal-stat">
            <span class="reveal-stat-val" [appCountUp]="summary.workflows">0</span>
            <span class="reveal-stat-label">{{ lang === 'ar' ? 'سير عمل' : 'workflows' }}</span>
          </div>
          <div class="reveal-stat">
            <span class="reveal-stat-val" [appCountUp]="summary.agents">0</span>
            <span class="reveal-stat-label">{{ lang === 'ar' ? 'وكيل ذكاء' : 'AI agents' }}</span>
          </div>
        </div>

        <p class="reveal-reassurance">{{ lang === 'ar' ? 'لست تبدأ من الصفر. حدد شاهين إجراءاتك التالية الموصى بها.' : 'You are not starting from zero. Shahin has identified your first recommended actions.' }}</p>
      </div>

      <!-- First Operating Actions -->
      <div class="reveal-checklist" *ngIf="checklist.length > 0">
        <h4>
          <i class="pi pi-list-check"></i>
          {{ lang === 'ar' ? 'أولى الإجراءات التشغيلية' : 'First Operating Actions' }}
          <span class="checklist-count">{{ completedCount }}/{{ checklist.length }}</span>
        </h4>
        <div *ngFor="let item of checklist; let i = index"
          class="reveal-checklist-item"
          [class.done]="item.is_completed"
          [style.animation-delay]="(i * 60) + 'ms'">
          <label>
            <input type="checkbox"
              [checked]="item.is_completed"
              (change)="toggleChecklistItem.emit(item)"
              [disabled]="item.is_completed" />
            <div>
              <span class="item-title">{{ lang === 'ar' ? item.title_ar : item.title_en }}</span>
              <small class="item-desc">{{ lang === 'ar' ? item.description_ar : item.description_en }}</small>
            </div>
          </label>
        </div>
      </div>

      <!-- NPS Star Rating -->
      <div class="reveal-nps" *ngIf="!npsSubmitted()">
        <p>{{ lang === 'ar' ? 'كيف كانت تجربة الإعداد؟' : 'How was your setup experience?' }}</p>
        <div class="nps-stars">
          <button *ngFor="let star of [1,2,3,4,5]"
            class="nps-star"
            [class.active]="star <= npsRating()"
            (click)="npsRating.set(star)"
            [attr.aria-label]="star + ' star'">
            <i class="pi" [ngClass]="star <= npsRating() ? 'pi-star-fill' : 'pi-star'"></i>
          </button>
        </div>
        <button pButton class="p-button-sm p-button-text" *ngIf="npsRating() > 0"
          [label]="lang === 'ar' ? 'إرسال' : 'Submit'"
          (click)="submitNps()"></button>
      </div>
      <div class="reveal-nps-thanks" *ngIf="npsSubmitted()">
        <i class="pi pi-heart-fill"></i>
        {{ lang === 'ar' ? 'شكراً لملاحظاتك!' : 'Thank you for your feedback!' }}
      </div>

      <!-- CTA -->
      <button pButton class="reveal-cta"
        [label]="lang === 'ar' ? 'ادخل بيئة العمل' : 'Launch Your Workspace'"
        icon="pi pi-arrow-right"
        iconPos="right"
        (click)="enterWorkspace.emit()">
      </button>

      <!-- AI Continuity -->
      <p class="reveal-ai-continuity">
        {{ lang === 'ar' ? 'شاهين سيستمر في العمل بجانبك بعد الدخول.' : 'Shahin will continue working alongside you after you enter.' }}
      </p>
    </div>
  `,
    styles: [`
    .reveal {
      text-align: center;
      padding: 2rem 0;
      animation: premium-fade-up 0.5s ease both;
      position: relative;
    }

    .reveal-header {
      margin-bottom: 2rem;
    }

    .reveal-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 1rem;
      background: rgba(var(--success-rgb), 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: success-glow 2s ease-in-out infinite alternate;
    }

    .reveal-icon i {
      font-size: var(--font-size-4xl);
      color: var(--success, #24a148);
    }

    .reveal-preheadline {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--primary, #0f62fe);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 0.5rem;
    }

    h2 {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      margin: 0 0 0.75rem;
      color: var(--text-heading);
    }

    .reveal-summary {
      font-size: var(--font-size-body-sm);
      color: var(--text-body, #525252);
      line-height: 1.7;
      margin: 0 0 1rem;
    }

    /* Stat grid */
    .reveal-stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      max-width: 480px;
      margin: 0 auto 1rem;
    }

    .reveal-stat {
      text-align: center;
      padding: 0.6rem 0.4rem;
      background: var(--surface-ground, #f8fafc);
      border-radius: var(--radius, 8px);
      border: 1px solid var(--border-subtle);
    }

    .reveal-stat-val {
      display: block;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--primary);
    }

    .reveal-stat-label {
      display: block;
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .reveal-reassurance {
      font-size: var(--font-size-tag);
      font-style: italic;
      color: var(--text-muted, #6f6f6f);
      margin: 0;
    }

    .reveal-checklist {
      text-align: start;
      max-width: 500px;
      margin: 1.5rem auto;
      animation: stagger-in 0.3s ease 0.3s both;
    }

    .reveal-checklist h4 {
      font-size: var(--font-size-body-sm);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .checklist-count {
      font-size: 0.72rem; font-weight: 600; color: var(--primary, #0f62fe);
      background: var(--onb-ai-pulse, rgba(var(--primary-rgb), 0.08));
      padding: 0.15rem 0.5rem; border-radius: var(--radius-pill, 20px);
      margin-inline-start: auto;
    }

    .reveal-checklist-item {
      padding: 0.5rem 0;
      animation: stagger-in 0.3s ease both;
    }

    .reveal-checklist-item label {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      cursor: pointer;
    }

    .item-title {
      font-size: 0.88rem;
      font-weight: 600;
    }

    .item-desc {
      font-size: var(--font-size-caption);
      color: var(--text-muted);
      display: block;
    }

    .done {
      opacity: 0.6;
    }

    .done .item-title {
      text-decoration: line-through;
    }

    /* NPS */
    .reveal-nps {
      max-width: 320px;
      margin: 1.25rem auto;
      text-align: center;
    }

    .reveal-nps p {
      font-size: var(--font-size-tag);
      color: var(--text-heading);
      margin: 0 0 0.5rem;
      font-weight: 600;
    }

    .nps-stars {
      display: flex;
      justify-content: center;
      gap: 0.35rem;
      margin-bottom: 0.5rem;
    }

    .nps-star {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      font-size: 1.3rem;
      color: var(--text-muted);
      transition: color 150ms, transform 150ms;
    }

    .nps-star.active {
      color: #f1c21b;
      transform: scale(1.15);
    }

    .nps-star:hover {
      color: #f1c21b;
    }

    .reveal-nps-thanks {
      font-size: var(--font-size-tag);
      color: var(--success, #24a148);
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      margin: 1rem 0;
    }

    .reveal-nps-thanks i {
      color: var(--error, #da1e28);
    }

    .reveal-cta {
      margin-top: 1.5rem;
      padding: 0.95rem 2.5rem;
      font-size: var(--font-size-body-md);
      font-weight: 700;
      border-radius: var(--radius-md, 10px);
      background: var(--gradient-primary, linear-gradient(135deg, #002d9c 0%, #0f62fe 50%, #4589ff 100%)) !important;
      border: none !important;
      box-shadow: var(--shadow-premium-glow, 0 0 20px rgba(var(--primary-rgb), 0.14));
      animation: scale-up 0.5s ease 0.3s both;
      transition: all 250ms cubic-bezier(0.2, 0, 0.38, 0.9);
    }
    .reveal-cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-premium-glow), 0 6px 16px rgba(var(--color-black-rgb), 0.15); }

    /* AI Continuity line */
    .reveal-ai-continuity {
      font-size: var(--font-size-caption);
      color: var(--text-muted);
      margin-top: 1rem;
      font-style: italic;
    }

    .rtl {
      direction: rtl;
    }

    .rtl .reveal-checklist {
      text-align: right;
    }

    @keyframes premium-fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes scale-up {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes stagger-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes success-glow {
      from { box-shadow: 0 0 0 0 rgba(var(--success-rgb), 0.1); }
      to   { box-shadow: 0 0 20px 4px rgba(var(--success-rgb), 0.15); }
    }

    @media (prefers-reduced-motion: reduce) {
      .reveal,
      .reveal-icon,
      .reveal-cta,
      .reveal-checklist,
      .reveal-checklist-item {
        animation: none !important;
      }
    }
  `]
})
export class CockpitRevealBannerComponent {
  /** Startup checklist items with title_en, title_ar, description_en, description_ar, is_completed */
  @Input() checklist: GrcRecord[] = [];

  /** Workspace provisioning summary counts */
  @Input() summary: { controls: number; evidence: number; workflows: number; agents: number } = {
    controls: 0,
    evidence: 0,
    workflows: 0,
    agents: 0
  };

  /** Whether provisioning is complete and the banner should be visible */
  @Input() complete = false;

  /** Active language for bilingual rendering */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Emitted when user clicks the "Enter Your Operating Cockpit" CTA */
  @Output() enterWorkspace = new EventEmitter<void>();

  /** Emitted when user toggles a checklist item */
  @Output() toggleChecklistItem = new EventEmitter<unknown>();

  /** Emitted when user submits an NPS rating */
  @Output() npsRated = new EventEmitter<number>();

  /** NPS star rating (0-5) */
  npsRating = signal(0);

  /** Whether NPS has been submitted */
  npsSubmitted = signal(false);

  get completedCount(): number {
    return this.checklist.filter(i => i.is_completed).length;
  }

  submitNps(): void {
    if (this.npsRating() > 0) {
      this.npsRated.emit(this.npsRating());
      this.npsSubmitted.set(true);
    }
  }
}
