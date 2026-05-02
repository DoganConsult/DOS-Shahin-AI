import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardWidgetRegistryItemDto } from '../../../../../core/dashboard/dashboard-editor.models';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-dashboard-widget-picker',
    imports: [CommonModule],
    template: `
    <div class="border rounded-2xl bg-white p-4 space-y-3">
      <div class="font-semibold">Widget Picker</div>

      <div class="grid grid-cols-1 gap-2">
        <button
          *ngFor="let widget of widgets"
          type="button"
          class="border rounded-xl px-3 py-2 text-left hover:bg-gray-50"
          (click)="add.emit(widget)"
        >
          <div class="font-medium">{{ widget.label_en }}</div>
          <div class="text-xs text-gray-500">
            {{ widget.widget_key }} · {{ widget.module_code || 'shared' }}
          </div>
        </button>
      </div>
    </div>
  `
})
export class DashboardWidgetPickerComponent {
  @Input() widgets: DashboardWidgetRegistryItemDto[] = [];
  @Output() add = new EventEmitter<DashboardWidgetRegistryItemDto>();

}
