import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ExecutiveWidgetsApiService } from '../../../../../core/widgets/executive-widgets.api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-top-breached-kris-widget',
    imports: [CommonModule],
    template: `
    <div class="rounded-2xl border bg-white p-4">
      <div class="mb-3 text-base font-semibold">Top Breached KRIs</div>

      <table aria-label="Min W Full table" class="min-w-full text-sm">
        <thead>
          <tr class="border-b text-left">
            <th class="py-2 pr-4">KRI</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2 pr-4">Current</th>
            <th class="py-2 pr-4">Amber</th>
            <th class="py-2 pr-4">Red</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of rows()" class="border-b">
            <td class="py-2 pr-4">{{ row.name }}</td>
            <td class="py-2 pr-4">
              <span [class]="row.status === 'red' ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'">
                {{ row.status }}
              </span>
            </td>
            <td class="py-2 pr-4">{{ row.current_value }}</td>
            <td class="py-2 pr-4">{{ row.threshold_amber }}</td>
            <td class="py-2 pr-4">{{ row.threshold_red }}</td>
          </tr>
        </tbody>
      </table>

      <div *ngIf="!rows().length" class="text-sm text-gray-400 py-4 text-center">No breached KRIs</div>
    </div>
  `
})
export class TopBreachedKrisWidgetComponent implements OnInit {
  @Input() tenantId?: string;
  private api = inject(ExecutiveWidgetsApiService);
  readonly rows = signal<any[]>([]);

  async ngOnInit() {
    try {
      const res = await firstValueFrom(this.api.getTopBreachedKris(10, this.tenantId));
      this.rows.set((res as unknown[]) || []);
    } catch {
    }
  }

}
