import { Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { SectionHeaderComponent } from '@app/shared/widgets/section-header/section-header.component';
import { devError } from '../../../core/utils/dev-logger';
import { GrcOperationsService } from '@app/api';

interface Industry {
  nameEn: string;
  nameAr: string;
  icon: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-industries-section',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  template: `
    <section class="ind-section" id="industries">
      <div class="ind-container">
        <app-section-header
          badge="Industries We Serve"
          badgeAr="القطاعات التي نخدمها"
          badgeIcon="pi pi-building"
          title="Built for Regulated Industries"
          titleAr="مصمّم للقطاعات المنظّمة"
          subtitle="Shahin-AI supports organizations across the most compliance-intensive sectors."
          subtitleAr="يدعم Shahin-AI المؤسسات في أكثر القطاعات تطلبًا للامتثال."
        />
        <div class="ind-grid">
          @for (industry of industries; track industry.nameEn) {
          <div class="ind-card">
            <span class="ind-icon"><i class="pi" [ngClass]="industry.icon"></i></span>
            <span class="ind-name">{{ i18n.direction() === 'rtl' ? industry.nameAr : industry.nameEn }}</span>
          </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .ind-section { padding: 80px 0; background: #fff; }
    .ind-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .ind-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px; max-width: 900px; margin: 0 auto; }
    .ind-card {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 24px 16px; border-radius: var(--radius-xl); border: 1px solid #e0f2fe; background: var(--status-info-bg, #edf5ff);
      transition: all 300ms; cursor: default;
    }
    .ind-card:hover { background: #e0f2fe; border-color: var(--primary); box-shadow: var(--shadow-xl); transform: translateY(-3px); }
    .ind-icon { font-size: 36px; }
    .ind-name { font-size: var(--font-size-sm); font-weight: 600; color: #334155; text-align: center; }
    @media (max-width: 900px) { .ind-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 500px) { .ind-grid { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class IndustriesSectionComponent implements OnInit {
    private operationsSvc = inject(GrcOperationsService);
  i18n = inject(I18nService);
  industries: Industry[] = [];

  ngOnInit(): void {
    this.operationsSvc.getPublicLandingContent().subscribe({
      next: (res: Record<string, unknown>) => { this.industries = res.industries || []; },
      error: (e: unknown) => devError("[API]", e),
    });
  }
}
