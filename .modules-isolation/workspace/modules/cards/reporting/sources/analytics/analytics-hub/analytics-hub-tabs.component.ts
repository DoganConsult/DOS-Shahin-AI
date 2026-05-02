import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

export interface AnalyticsHubTab {
  key: string;
  labelEn: string;
  labelAr: string;
  icon: string;
}

const HUB_TAB_STYLES = `
  .hub-tab-bar{display:flex;gap:4px;padding:16px 28px 0;border-bottom:1px solid var(--surface-border,var(--border-subtle));flex-wrap:wrap}
  .hub-tab{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px 8px 0 0;border:none;background:transparent;font-size: var(--font-size-base);color:var(--text-color-secondary,var(--text-muted));cursor:pointer;transition:background .15s,color .15s;border-bottom:2px solid transparent}
  .hub-tab:hover{background:var(--surface-100,var(--surface-ice));color:var(--text-color,#111)}
  .hub-tab.active{color:var(--primary-700,#1d4ed8);border-bottom-color:var(--primary-500,#3b82f6);font-weight:600}
  .hub-tab .pi{font-size: var(--font-size-base)}
`;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-hub-tabs',
  standalone: true,
  imports: [CommonModule],
  styles: [HUB_TAB_STYLES],
  template: `
    <div class="hub-tab-bar" role="tablist">
      @for (tab of tabs; track tab.key) {
        <button class="hub-tab" role="tab" [class.active]="activeTab===tab.key" (click)="tabChange.emit(tab.key)" [attr.aria-selected]="activeTab===tab.key">
          <i class="pi" [ngClass]="tab.icon"></i><span>{{ i18n.currentLang()==='ar' ? tab.labelAr : tab.labelEn }}</span>
        </button>
      }
    </div>
  `,
})
export class AnalyticsHubTabsComponent {
  protected readonly i18n = inject(I18nService);

  @Input() tabs: readonly AnalyticsHubTab[] = [];
  @Input() activeTab = 'analytics';

  @Output() tabChange = new EventEmitter<string>();
}