import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ExecutiveWidgetsApiService } from '../../../../../core/widgets/executive-widgets.api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-review-debt-widget',
    imports: [CommonModule],
    template: `
    <div class="rounded-2xl border bg-white p-4">
      <div class="mb-3 text-base font-semibold">Policy Review Debt</div>

      <table aria-label="Min W Full table" class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left">
            <th class="py-2 pr-4">Policy</th>
            <th class="py-2 pr-4">Review Due</th>
            <th class="py-2 pr-4">Days Overdue</th>
            <th class="py-2 pr-4">Owner</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows()" class="border-b">
            <td class="py-2 pr-4">{{ row.title }}</td>
            <td class="py-2 pr-4">{{ row.next_review_date }}</td>
            <td class="py-2 pr-4">
              <span class="text-red-600 font-semibold">{{ row.days_overdue }}d</span>
            </td>
            <td class="py-2 pr-4">{{ row.owner || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!rows().length" class="text-sm text-gray-400 py-4 text-center">No overdue policy reviews</div>
    </div>
  `
})
export class PolicyReviewDebtWidgetComponent implements OnInit {
  @Input() tenantId?: string;
  private api = inject(ExecutiveWidgetsApiService);
  readonly rows = signal<any[]>([]);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getPolicyReviewDebt(10, this.tenantId));
      this.rows.set((res as unknown[]) || []);
    } catch {
    }
  }

}
