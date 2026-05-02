import { Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { devError } from '../../../core/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

interface FAQ {
  qEn: string; qAr: string;
  aEn: string; aAr: string;
  open: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-faq-section',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  template: `
    <section class="faq-section" id="faq">
      <div class="faq-container">
        <app-section-header
          badge="Frequently Asked Questions"
          badgeAr="الأسئلة الشائعة"
          badgeIcon="pi pi-question-circle"
          title="Everything You Need to Know"
          titleAr="كل ما تحتاج معرفته"
          subtitle="Answers to common questions from CISOs, compliance officers, and IT leaders."
          subtitleAr="إجابات على الأسئلة الشائعة من مسؤولي الأمن السيبراني والامتثال وقادة تقنية المعلومات."
        />

        <div class="faq-list">
          <div *ngFor="let faq of faqs; let i = index" class="faq-item" [class.open]="faq.open">
            <h3 class="faq-h">
              <button class="faq-q"
                      type="button"
                      [attr.aria-expanded]="faq.open"
                      [attr.aria-controls]="'faq-a-' + i"
                      [id]="'faq-q-' + i"
                      (click)="toggle(i)">
                <span>{{ i18n.localize(faq.qEn, faq.qAr) }}</span>
                <i class="pi" [ngClass]="faq.open ? 'pi-minus' : 'pi-plus'" aria-hidden="true"></i>
              </button>
            </h3>
            <div class="faq-a"
                 [id]="'faq-a-' + i"
                 role="region"
                 [attr.aria-labelledby]="'faq-q-' + i"
                 [hidden]="!faq.open">
              <p>{{ i18n.localize(faq.aEn, faq.aAr) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .faq-section { padding: 80px 0; background: #fff; }
    .faq-container { max-width: 800px; margin: 0 auto; padding: 0 24px; }

    .faq-list { display: flex; flex-direction: column; gap: 12px; }

    .faq-item {
      border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden;
      transition: all 300ms;
    }
    .faq-item:hover { border-color: #bae6fd; }
    .faq-item.open { border-color: var(--primary); box-shadow: var(--shadow-md); }

    .faq-h { margin: 0; font: inherit; font-weight: inherit; }

    .faq-q {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 18px 20px; background: none; border: none; cursor: pointer;
      font-size: var(--font-size-base); font-weight: 700; color: var(--text-heading); text-align: start;
      gap: 12px; transition: background 200ms;
    }
    .faq-q:hover { background: var(--surface-ice); }
    .faq-q .pi { font-size: var(--font-size-base); color: var(--primary); flex-shrink: 0; }
    .open .faq-q { background: var(--status-info-bg, #edf5ff); }

    .faq-a {
      padding: 0 20px 18px;
    }
    .faq-a p {
      font-size: var(--font-size-base); color: #475569; line-height: 1.8; margin: 0;
    }
  `],
})
export class FAQSectionComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  faqs: FAQ[] = [];

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, unknown>) => {
        this.faqs = (res.faqs || []).map((f: Record<string, unknown>, i: number) => ({ ...f, open: i === 0 }));
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  toggle(index: number): void {
    this.faqs[index].open = !this.faqs[index].open;
  }

}

