/**
 * Governance Activity Feed — Dumb sub-component
 * Thin wrapper around the shared RecentActivityTable for governance context.
 * Kept as a separate component so the parent can pass governance-specific props.
 */
import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { ActivityRowVM } from '@app/shared/models/module-overview.vm';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-governance-activity-feed',
    imports: [CommonModule, RecentActivityTableComponent],
    template: `
    <app-recent-activity-table
      titleEn="Recent Governance Activity"
      titleAr="\u0622\u062E\u0631 \u0646\u0634\u0627\u0637 \u0641\u064A \u0627\u0644\u062D\u0648\u0643\u0645\u0629"
      [rows]="rows"
      [isAr]="i18n.currentLang() === 'ar'"
      [pageSize]="pageSize"
      viewAllRoute="/foundation/audit"
      [showEntity]="true" />
  `
})
export class GovernanceActivityFeedComponent {
  readonly i18n = inject(I18nService);

  @Input() rows: ActivityRowVM[] = [];
  @Input() pageSize = 6;
}
